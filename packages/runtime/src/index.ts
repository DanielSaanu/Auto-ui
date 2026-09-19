import { z } from "zod";
import {
  type Space,
  type Element,
  type Lifetime,
  type Principal,
  type LocalState,
  type BoundField,
  type FrozenData,
  type Receipt,
  BindingSchema,
  isBinding,
  elementId,
} from "@orrery/protocol";
import { type PackDef, blockSchema } from "@orrery/packs-core";

/**
 * The runtime — plan §4.1, §4.2, §4.6, §4.10.
 *
 * Holds a space in memory, resolves bindings against renderer-local state, produces
 * the agent-facing snapshot, and freezes elements on promotion. No HTTP, no model.
 */

export class OrreryError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
    this.name = "OrreryError";
  }
}

// ── access (§4.10) ────────────────────────────────────────────────────────────

export type Action = "read" | "write" | "remove" | "promote" | "invoke" | "admin";

export function roleOf(space: Space, who: Principal): string | undefined {
  for (const g of space.grants) {
    const p = g.principal;
    if (p.kind !== who.kind) continue;
    if (p.kind === "user" && who.kind === "user" && p.id === who.id) return g.role;
    if (p.kind === "agent" && who.kind === "agent" && p.id === who.id) return g.role;
    if (p.kind === "link" && who.kind === "link" && p.token === who.token) return g.role;
  }
  return undefined;
}

export function can(space: Space, who: Principal, action: Action, el?: Element): boolean {
  const role = roleOf(space, who);
  if (!role) return false;
  switch (action) {
    case "read":
      return true;
    case "write":
    case "promote":
      return role === "owner" || role === "editor" || role === "agent";
    case "remove":
      if (role === "owner" || role === "editor") return true;
      // An agent may remove only what it placed (§4.10 rule table).
      if (role === "agent" && el) return samePrincipal(el.origin.by, who);
      return false;
    case "invoke":
      // §4.10 rule 3: only a user action fires an invoke. An agent cannot start a chain
      // itself, which is what bounds invoke chains at their root rather than by depth alone.
      return role === "owner" || role === "editor";
    case "admin":
      return role === "owner";
  }
}

function samePrincipal(a: Principal, b: Principal): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "user" && b.kind === "user") return a.id === b.id;
  if (a.kind === "agent" && b.kind === "agent") return a.id === b.id;
  if (a.kind === "link" && b.kind === "link") return a.token === b.token;
  return false;
}

function assertCan(space: Space, who: Principal, action: Action, el?: Element): void {
  if (!can(space, who, action, el)) {
    throw new OrreryError(`principal may not ${action} in this space`, "forbidden");
  }
}

// ── placing and updating (§4.1, §4.8) ────────────────────────────────────────

export type PlaceInput = {
  name: string; // local placeholder, e.g. "$globe" — the SERVER assigns the real id
  block: string;
  props: unknown;
  lifetime?: Lifetime;
  title?: string;
  tags?: string[];
  layout?: Element["layout"];
};

export type RuntimeOpts = {
  pack: PackDef;
  now?: () => Date;
  genId?: () => string;
};

export class SpaceRuntime {
  readonly space: Space;
  private readonly pack: PackDef;
  private readonly now: () => Date;
  private readonly genId: () => string;
  /** Renderer-local state per element — selection, year, sort. Never part of the spec. */
  private local = new Map<string, LocalState>();
  private lastTouched = new Map<string, number>();
  private turn = 0;
  private seq = 0;

  constructor(space: Space, opts: RuntimeOpts) {
    this.space = space;
    this.pack = opts.pack;
    this.now = opts.now ?? (() => new Date());
    this.genId = opts.genId ?? elementId;
  }

  beginTurn(): number {
    return ++this.turn;
  }

  get(id: string): Element | undefined {
    return this.space.elements.find((e) => e.id === id);
  }

  /**
   * Validate and place. Returns the server-assigned id.
   *
   * The agent supplies a placeholder name and never an id (§4.1): ids are space-scoped
   * and server-assigned so two turns cannot collide and an agent cannot address an
   * element it was never shown.
   */
  place(input: PlaceInput, who: Principal, opts: { chainDepth?: number } = {}): string {
    assertCan(this.space, who, "write");
    const schema = blockSchema(this.pack, input.block);
    if (!schema) throw new OrreryError(`unknown block ${input.block}`, "no-block");

    const parsed = schema.safeParse(input.props);
    if (!parsed.success) {
      throw new OrreryError(
        `invalid props for ${input.block}: ${formatIssues(parsed.error)}`,
        "invalid-props",
      );
    }

    const lifetime: Lifetime = input.lifetime ?? { mode: "ephemeral" };
    if (lifetime.mode === "persistent" && !input.title) {
      // §4.11: optional metadata nothing compels an agent to write is metadata that
      // will not exist — and a search over empty fields searches nothing.
      throw new OrreryError("a persistent element requires a title", "title-required");
    }

    const el: Element = {
      id: this.genId(),
      block: input.block,
      props: parsed.data,
      lifetime,
      title: input.title,
      tags: input.tags,
      layout: input.layout,
      origin: { turn: this.turn, at: this.now().toISOString(), by: who },
      version: 1,
      invokeChainDepth: opts.chainDepth ?? 0,
    };
    this.space.elements.push(el);
    this.local.set(el.id, {});
    this.touch(el.id);
    return el.id;
  }

  update(id: string, patch: { props?: unknown; title?: string; tags?: string[] }, who: Principal): Element {
    const el = this.require(id);
    assertCan(this.space, who, "write", el);
    if (patch.props !== undefined) {
      const schema = blockSchema(this.pack, el.block)!;
      const parsed = schema.safeParse(patch.props);
      if (!parsed.success) {
        throw new OrreryError(
          `invalid props for ${el.block}: ${formatIssues(parsed.error)}`,
          "invalid-props",
        );
      }
      el.props = parsed.data;
    }
    if (patch.title !== undefined) el.title = patch.title;
    if (patch.tags !== undefined) el.tags = patch.tags;
    el.version += 1;
    this.touch(id);
    return el;
  }

  remove(id: string, who: Principal): void {
    const el = this.require(id);
    assertCan(this.space, who, "remove", el);
    this.space.elements = this.space.elements.filter((e) => e.id !== id);
    this.local.delete(id);
    this.lastTouched.delete(id);
  }

  // ── local state and bindings (§4.6) ────────────────────────────────────────

  /** A local interaction: 0 tokens, 0 network. Spec fields are untouched (§4.2). */
  setLocal(id: string, field: BoundField, value: unknown): void {
    this.require(id);
    const s = this.local.get(id) ?? {};
    s[field] = value;
    this.local.set(id, s);
    this.touch(id);
  }

  getLocal(id: string, field: BoundField): unknown {
    return this.local.get(id)?.[field];
  }

  /**
   * Resolve every binding inside a value against current local state.
   *
   * Bindings are closed objects, so this walks a tree looking for one exact shape —
   * there is no expression to evaluate, which is the point (§7.2).
   */
  resolveBindings<T>(value: T, seen: Set<string> = new Set()): T {
    if (isBinding(value)) {
      const { el, field } = (value as { $from: { el: string; field: BoundField } }).$from;
      const key = `${el}:${field}`;
      if (seen.has(key)) throw new OrreryError(`binding cycle at ${key}`, "binding-cycle");
      if (!this.get(el)) throw new OrreryError(`binding to unknown element ${el}`, "no-element");
      const next = new Set(seen).add(key);
      return this.resolveBindings(this.getLocal(el, field), next) as T;
    }
    if (Array.isArray(value)) return value.map((v) => this.resolveBindings(v, seen)) as unknown as T;
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = this.resolveBindings(v, seen);
      }
      return out as T;
    }
    return value;
  }

  /** The props a renderer actually draws: spec props with bindings substituted. */
  resolvedProps(id: string): unknown {
    const el = this.require(id);
    return this.resolveBindings(el.props);
  }

  // ── the snapshot (§4.6) ────────────────────────────────────────────────────

  /**
   * One line per element, REGENERATED from live state — never appended.
   *
   * Scope: all persistent and pinned elements, plus the N most recently interacted-with
   * session elements, capped. Recency is by element interaction, not turn ordinal: a
   * space is not a transcript, and something you touched is more relevant than something
   * placed and ignored.
   */
  snapshot(opts: { maxLines?: number; recentSession?: number } = {}): string {
    const maxLines = opts.maxLines ?? 40;
    const recentSession = opts.recentSession ?? 12;

    const persistent = this.space.elements.filter((e) => e.lifetime.mode === "persistent");
    const sessions = this.space.elements
      .filter((e) => e.lifetime.mode === "session")
      .sort((a, b) => (this.lastTouched.get(b.id) ?? 0) - (this.lastTouched.get(a.id) ?? 0))
      .slice(0, recentSession);

    const chosen = [...persistent, ...sessions];
    const shown = chosen.slice(0, maxLines);
    const lines = shown.map((e) => this.snapshotLine(e));
    const hidden = this.space.elements.length - shown.length;
    if (hidden > 0) lines.push(`… ${hidden} more (use find_elements)`);
    return lines.join("\n");
  }

  private snapshotLine(el: Element): string {
    const parts: string[] = [el.id, el.block.padEnd(11)];
    const local = this.local.get(el.id) ?? {};
    for (const [field, value] of Object.entries(local)) {
      if (value === undefined) continue;
      parts.push(`${field}=${fmt(value)}`);
    }
    for (const [k, v] of Object.entries((el.props ?? {}) as Record<string, unknown>)) {
      if (isBinding(v)) {
        parts.push(`${k}←${(v as { $from: { el: string } }).$from.el}`);
      }
    }
    if (el.title) parts.push(`title=${JSON.stringify(el.title)}`);
    parts.push(`life=${el.lifetime.mode}`);
    return parts.join(" ");
  }

  // ── persistence (§4.2) ─────────────────────────────────────────────────────

  /**
   * Promote to persistent, freezing resolved values INTO the element.
   *
   * A persisted element must render from data it owns. Pointing at a live third-party
   * API is a bookmark, not persistence, and it is how a saved artifact silently changes
   * what it says.
   */
  promote(
    id: string,
    who: Principal,
    opts: { title: string; rows?: unknown; receipts?: Receipt[]; envelope?: "envelope" | "slice" },
  ): Element {
    const el = this.require(id);
    assertCan(this.space, who, "promote", el);
    if (!opts.title) throw new OrreryError("a persistent element requires a title", "title-required");

    const rows = opts.rows ?? null;
    const frozen: FrozenData = {
      at: this.now().toISOString(),
      envelope: opts.envelope ?? "envelope",
      rows,
      receipts: opts.receipts ?? [],
      digestVersion: "0",
      bytes: byteLength(rows),
    };
    el.lifetime = { mode: "persistent" };
    el.title = opts.title;
    el.frozen = frozen;
    el.version += 1;
    this.touch(id);
    return el;
  }

  /** Sweep by lifetime. Expiry is never silent: an expiring element leaves a stub. */
  endSession(): Element[] {
    const stubs: Element[] = [];
    this.space.elements = this.space.elements.filter((e) => {
      if (e.lifetime.mode === "persistent") return true;
      stubs.push(stubOf(e));
      this.local.delete(e.id);
      this.lastTouched.delete(e.id);
      return false;
    });
    return stubs;
  }

  toJSON(): Space {
    return structuredClone(this.space);
  }

  static fromJSON(data: Space, opts: RuntimeOpts): SpaceRuntime {
    const rt = new SpaceRuntime(structuredClone(data), opts);
    for (const el of rt.space.elements) rt.local.set(el.id, {});
    return rt;
  }

  private require(id: string): Element {
    const el = this.get(id);
    if (!el) throw new OrreryError(`no element ${id}`, "no-element");
    return el;
  }

  private touch(id: string): void {
    this.lastTouched.set(id, ++this.seq);
  }
}

export function stubOf(el: Element): Element {
  return {
    ...el,
    block: "core/Stub",
    props: { of: el.block, title: el.title ?? null, frozen: el.frozen?.rows ?? null },
  };
}

function fmt(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(",")}]`;
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function byteLength(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Buffer.byteLength(JSON.stringify(v), "utf8");
}

function formatIssues(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
