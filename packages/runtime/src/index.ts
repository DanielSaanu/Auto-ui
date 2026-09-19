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
  SpaceSchema,
  LifetimeSchema,
  ElementMetaSchema,
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

/** Bindings may chain across elements, but not without bound. */
export const MAX_BINDING_HOPS = 32;

/**
 * How deep any single value may nest.
 *
 * This bounds EVERY recursive walk in this file, not one call site. Capping only the
 * entry point a reviewer happened to probe leaves the same crash reachable through its
 * siblings — `place()` in particular walks props BEFORE schema validation runs, and
 * `Table.rows` is `z.unknown()`, so arbitrary nesting is schema-legal.
 */
export const MAX_VALUE_DEPTH = 64;

/**
 * The block a missing pack degrades to (§2.5).
 *
 * A bare name, like every other block key in a pack — the qualified form was the only
 * exception and made `blockSchema()` lookups inconsistent.
 */
export const STUB_BLOCK = "Stub";

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

  // §4.10 states two of its rules as properties of BEING AN AGENT, not of holding a
  // role: an agent never triggers an invoke, and removes only what it placed. Gating
  // those on role alone meant a grant of `editor` to an agent principal silently handed
  // it both — so the principal kind is checked first, and no grant can override it.
  const isAgent = who.kind === "agent";

  switch (action) {
    case "read":
      return true;
    case "write":
    case "promote":
      return role === "owner" || role === "editor" || role === "agent";
    case "remove":
      if (isAgent) return el ? samePrincipal(el.origin.by, who) : false;
      return role === "owner" || role === "editor";
    case "invoke":
      // Only a user action fires an invoke. An agent cannot start a chain itself, which
      // bounds invoke chains at their root rather than relying on depth alone.
      if (isAgent) return false;
      return role === "owner" || role === "editor";
    case "admin":
      return !isAgent && role === "owner";
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
  private placeholders = new Map<string, string>();
  /** Packs this space declares that the loaded registry does not provide (§2.5). */
  private missing: string[] = [];
  private turn = 0;
  private seq = 0;

  constructor(space: Space, opts: RuntimeOpts) {
    this.space = space;
    this.pack = opts.pack;
    this.now = opts.now ?? (() => new Date());
    this.genId = opts.genId ?? elementId;
  }

  beginTurn(): number {
    // Placeholders are turn-scoped: "$globe" in turn 7 must not resolve to turn 3's globe.
    this.placeholders.clear();
    return ++this.turn;
  }

  /**
   * A COPY of the element, or undefined.
   *
   * Handing out the live object let callers mutate an element straight past validation,
   * versioning, access checks and `touch()` — and a test did exactly that once, which is
   * how it came to assert on its own fixture instead of on behaviour. Mutating what comes
   * back from here now changes nothing.
   */
  get(id: string): Element | undefined {
    const el = this.live(id);
    return el ? (structuredClone(el) as Element) : undefined;
  }

  /** The live object. Private on purpose — see `get`. */
  private live(id: string): Element | undefined {
    return this.space.elements.find((e) => e.id === id);
  }

  /**
   * Validate and place. Returns the server-assigned id.
   *
   * The agent supplies a placeholder name and never an id (§4.1): ids are space-scoped
   * and server-assigned so two turns cannot collide and an agent cannot address an
   * element it was never shown.
   */
  place(input: PlaceInput, who: Principal): string {
    if (this.turn === 0) {
      // Forgetting this silently recorded every element as turn 0 and never cleared
      // placeholders between turns — provenance and placeholder isolation degrading with
      // no signal. An HTTP layer that forgot one call per request would not notice.
      throw new OrreryError("beginTurn() must be called before placing", "no-turn");
    }
    assertCan(this.space, who, "write");
    if (input.name) {
      // A placeholder must be STRUCTURALLY incapable of naming an element. Checking only
      // against live elements left the hijack open: remove the real element and its id is
      // free to be reused as a placeholder, after which bindings written against it are
      // rewritten to the impostor. Ids are `el_`/`sp_` prefixed, so that prefix is refused.
      if (/^(el_|sp_)/.test(input.name)) {
        throw new OrreryError(
          `placeholder ${input.name} may not use a reserved id prefix`,
          "placeholder-reserved",
        );
      }
      if (this.placeholders.has(input.name)) {
        // Last-write-wins would silently misdirect every earlier binding using this name.
        throw new OrreryError(`placeholder ${input.name} already used this turn`, "placeholder-reused");
      }
    }
    const schema = blockSchema(this.pack, input.block);
    if (!schema) throw new OrreryError(`unknown block ${input.block}`, "no-block");

    // Rewrite placeholder references before validation. The agent writes
    // {$from:{el:"$globe"}} because it cannot know the id the server will assign; this is
    // what makes a multi-element turn with cross-references expressible at all, and it is
    // why `name` exists rather than being decoration.
    const props = this.rewritePlaceholders(input.props);

    const parsed = schema.safeParse(props);
    if (!parsed.success) {
      throw new OrreryError(
        `invalid props for ${input.block}: ${formatIssues(parsed.error)}`,
        "invalid-props",
      );
    }

    const lifetime = parseLifetime(input.lifetime ?? { mode: "ephemeral" });
    requireTitleIfPersistent(lifetime, input.title);

    const meta = ElementMetaSchema.safeParse({
      title: input.title,
      tags: input.tags,
      layout: input.layout,
    });
    if (!meta.success) {
      // props were always validated; everything else on the element was not, so a
      // hallucinated field arrived intact and produced an element no tier could see.
      throw new OrreryError(`invalid element metadata: ${formatIssues(meta.error)}`, "invalid-meta");
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
      // §4.6 requires this to be server-written. There is no invoke path yet, so it is
      // always 0 — and deliberately NOT caller-supplied, so no code can come to depend on
      // setting it before the real derivation (placer's depth + 1) exists.
      invokeChainDepth: 0,
    };
    this.space.elements.push(el);
    this.local.set(el.id, {});
    this.touch(el.id);
    if (input.name) this.placeholders.set(input.name, el.id);
    return el.id;
  }

  /** The placeholder→id mapping for the current turn (§4.1). */
  /** Packs the space needs that are not loaded. Elements from them render as stubs. */
  missingPacks(): string[] {
    return [...this.missing];
  }

  placeholderMap(): Record<string, string> {
    return Object.fromEntries(this.placeholders);
  }

  private rewritePlaceholders<T>(value: T, depth = 0): T {
    if (depth > MAX_VALUE_DEPTH) {
      throw new OrreryError(`value nested deeper than ${MAX_VALUE_DEPTH}`, "too-deep");
    }
    if (isBinding(value)) {
      const b = value as { $from: { el: string; field: BoundField } };
      // A REAL id always wins. Without this, naming a placeholder after an id read from
      // the snapshot silently redirects every binding written against that id to the new
      // element — the reference looks correct and points somewhere else.
      if (this.live(b.$from.el)) return value;
      const mapped = this.placeholders.get(b.$from.el);
      return mapped ? ({ $from: { el: mapped, field: b.$from.field } } as T) : value;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.rewritePlaceholders(v, depth + 1)) as unknown as T;
    }
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
        out[k] = this.rewritePlaceholders(v, depth + 1);
      }
      return out as T;
    }
    return value;
  }

  update(
    id: string,
    patch: { props?: unknown; lifetime?: Lifetime; title?: string; tags?: string[] },
    who: Principal,
  ): Element {
    const el = this.require(id);
    assertCan(this.space, who, "write", el);
    if (patch.props !== undefined && el.frozen) {
      // A persisted element renders from data it owns (§4.2). Editing its props while
      // `frozen` still holds the old values makes the two disagree, and nothing in the
      // type says which one a renderer should believe. Re-resolving is `refresh`, which
      // creates version n+1 and is Phase C; until it exists, this is refused rather than
      // allowed to drift silently.
      throw new OrreryError(
        "cannot change props of a frozen element; release it or refresh it",
        "frozen",
      );
    }
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
    if (patch.lifetime !== undefined) {
      const next = parseLifetime(patch.lifetime);
      requireTitleIfPersistent(next, patch.title ?? el.title);
      el.lifetime = next;
    }
    const meta = ElementMetaSchema.safeParse({
      title: patch.title ?? el.title,
      tags: patch.tags ?? el.tags,
      layout: el.layout,
    });
    if (!meta.success) {
      throw new OrreryError(`invalid element metadata: ${formatIssues(meta.error)}`, "invalid-meta");
    }
    if (patch.title !== undefined) el.title = patch.title;
    if (patch.tags !== undefined) el.tags = patch.tags;
    el.version += 1;
    this.touch(id);
    return structuredClone(el) as Element;
  }

  remove(id: string, who: Principal): void {
    const el = this.require(id);
    assertCan(this.space, who, "remove", el);
    const at = this.space.elements.findIndex((e) => e.id === id);
    this.space.elements.splice(at, 1); // exactly one: a filter would drop every duplicate
    this.local.delete(id);
    this.lastTouched.delete(id);
  }

  // ── local state and bindings (§4.6) ────────────────────────────────────────

  /** A local interaction: 0 tokens, 0 network. Spec fields are untouched (§4.2). */
  setLocal(id: string, field: BoundField, value: unknown): void {
    this.require(id);
    // Unvalidated by design (a selection is whatever the renderer selected), but bounded:
    // this is the most likely path to become externally reachable, and resolveBindings
    // recurses over it. Without a depth cap a deep object is an uncaught RangeError.
    assertDepth(value, MAX_VALUE_DEPTH);
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
  resolveBindings<T>(value: T, seen: Set<string> = new Set(), depth = 0): T {
    if (depth > MAX_VALUE_DEPTH) {
      throw new OrreryError(`value nested deeper than ${MAX_VALUE_DEPTH}`, "too-deep");
    }
    if (isBinding(value)) {
      const { el, field } = (value as { $from: { el: string; field: BoundField } }).$from;
      const key = `${el}:${field}`;
      if (seen.has(key)) throw new OrreryError(`binding cycle at ${key}`, "binding-cycle");
      // A long ACYCLIC chain is not a cycle, so `seen` never fires on it — 5,000 elements
      // each bound to the next overflowed the stack with an uncaught RangeError. The two
      // limits bound different things and both are needed: `seen` catches a loop, this
      // catches a chain.
      if (seen.size >= MAX_BINDING_HOPS) {
        throw new OrreryError(`binding chain longer than ${MAX_BINDING_HOPS} hops`, "binding-too-long");
      }
      if (!this.live(el)) throw new OrreryError(`binding to unknown element ${el}`, "no-element");
      const next = new Set(seen).add(key);
      return this.resolveBindings(this.getLocal(el, field), next) as T;
    }
    if (Array.isArray(value)) {
      return value.map((v) => this.resolveBindings(v, seen, depth + 1)) as unknown as T;
    }
    if (value && typeof value === "object") {
      // Only plain objects are rebuilt. A Date/Map/Set/RegExp passes through untouched
      // rather than being silently flattened into {}.
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) return value;

      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        // `JSON.parse('{"__proto__":{...}}')` creates __proto__ as an OWN property, and
        // assigning it back through `out[k]` re-points the new object's prototype. Not
        // global pollution, but it corrupts the returned object's chain — and the path
        // that reaches here is setLocal(), which is unvalidated and is exactly what an
        // HTTP tap endpoint will wrap.
        if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
        out[k] = this.resolveBindings(v, seen, depth + 1);
      }
      return out as T;
    }
    return value;
  }

  /**
   * The props a renderer actually draws: spec props with bindings substituted.
   *
   * `validate` re-checks the RESULT against the block schema. Props are guaranteed valid
   * at rest, but substitution can produce something that is not — an unselected binding
   * resolves to `undefined`, which is fine for an optional prop and not fine for a
   * required one. Off by default because a half-resolved element is a normal state in a
   * live space; a renderer that needs the guarantee asks for it, and gets a named error
   * instead of a surprise.
   */
  resolvedProps(id: string, opts: { validate?: boolean } = {}): unknown {
    const el = this.require(id);
    const resolved = this.resolveBindings(el.props);
    if (!opts.validate) return resolved;

    const schema = blockSchema(this.pack, el.block);
    if (!schema) throw new OrreryError(`unknown block ${el.block}`, "no-block");
    const parsed = schema.safeParse(resolved);
    if (!parsed.success) {
      throw new OrreryError(
        `props did not survive substitution for ${el.id} (${el.block}): ${formatIssues(parsed.error)}`,
        "unresolved-props",
      );
    }
    return parsed.data;
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

    const byRecency = (a: Element, b: Element) =>
      (this.lastTouched.get(b.id) ?? 0) - (this.lastTouched.get(a.id) ?? 0);

    const pinned = this.space.elements.filter(
      (e) => e.lifetime.mode === "persistent" && e.lifetime.pinned,
    );
    const rest = this.space.elements.filter(
      (e) => e.lifetime.mode === "persistent" && !e.lifetime.pinned,
    );
    const sessions = this.space.elements
      .filter((e) => e.lifetime.mode === "session")
      .sort(byRecency)
      .slice(0, recentSession);

    // Order matters when the cap bites. Listing every persistent element first meant a
    // tight cap dropped the element the user had just interacted with while showing
    // stale pinned ones — the opposite of what recency-by-interaction is for. Pinning is
    // an explicit user act so it still outranks; after that, recency decides.
    const chosen = [...pinned, ...[...rest, ...sessions].sort(byRecency)];
    const shown = chosen.slice(0, maxLines);
    const lines = shown.map((e) => this.snapshotLine(e));

    // What "… N more" must mean: elements that exist and that find_elements WOULD return,
    // but which did not fit. That is every persistent and session element minus what was
    // shown — ephemeral ones are turn-scoped and were never candidates, and counting them
    // made the snapshot claim rows nothing could retrieve.
    const findable = this.space.elements.filter((e) => e.lifetime.mode !== "ephemeral").length;
    const hidden = findable - shown.length;
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
    opts: {
      title: string;
      rows?: unknown;
      receipts?: Receipt[];
      envelope?: "envelope" | "slice";
      pinned?: boolean;
    },
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
    el.lifetime = opts.pinned ? { mode: "persistent", pinned: true } : { mode: "persistent" };
    el.title = opts.title;
    el.frozen = frozen;
    el.version += 1;
    this.touch(id);
    return structuredClone(el) as Element;
  }

  /** Sweep by lifetime. Expiry is never silent: an expiring element leaves a stub. */
  endSession(): Element[] {
    return this.sweep((e) => e.lifetime.mode !== "persistent");
  }

  /**
   * Sweep ephemeral elements — the end of a TURN.
   *
   * This is the only behaviour that distinguishes `ephemeral` from `session`; without it
   * the third lifetime state has nothing to justify it (§4.1).
   */
  endTurn(): Element[] {
    return this.sweep((e) => e.lifetime.mode === "ephemeral");
  }

  /** Expiry is never silent: an expiring element leaves a stub naming what it was. */
  private sweep(doomed: (e: Element) => boolean): Element[] {
    const stubs: Element[] = [];
    this.space.elements = this.space.elements.filter((e) => {
      if (!doomed(e)) return true;
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

  static fromJSON(data: unknown, opts: RuntimeOpts): SpaceRuntime {
    // The input is UNTRUSTED: it came off a disk, a database or a wire, and TypeScript's
    // types are gone by then. Without a parse here, an element missing `lifetime` reached
    // snapshot() and threw a raw TypeError from deep inside the runtime.
    const parsed = SpaceSchema.safeParse(data);
    if (!parsed.success) {
      throw new OrreryError(`corrupt space: ${formatIssues(parsed.error)}`, "corrupt-space");
    }
    const space = structuredClone(parsed.data) as unknown as Space;

    for (const el of space.elements) {
      const schema = blockSchema(opts.pack, el.block);
      if (!schema) {
        // A missing pack renders a labelled stub (§2.5) rather than failing the reopen.
        // Re-stubbing one would overwrite `of` with "core/Stub" and destroy the only
        // record of which pack the element actually needs.
        const cut = el.block.lastIndexOf("/");
        el.props = {
          pack: cut > 0 ? el.block.slice(0, cut) : null,
          block: cut > 0 ? el.block.slice(cut + 1) : el.block,
          title: el.title ?? null,
          frozen: el.frozen?.rows ?? null,
        };
        el.block = STUB_BLOCK;
        continue;
      }
      // Stubs included: skipping validation here meant a crafted stub was accepted with
      // any shape at all, forever, and its `bytes` never recomputed — the one block for
      // which the "never trust the file" rule quietly did not apply.
      const p = schema.safeParse(el.props);
      if (!p.success) {
        throw new OrreryError(
          `corrupt element ${el.id} (${el.block}): ${formatIssues(p.error)}`,
          "corrupt-element",
        );
      }
      el.props = p.data;
      if (el.frozen) el.frozen.bytes = byteLength(el.frozen.rows); // recompute; never trust
    }

    // A binding whose target is gone parses fine (BindingSchema only checks shape) and
    // would surface much later as a render-time error on one element. Catching it here
    // names the element that is broken and the reference that broke it.
    const known = new Set(space.elements.map((e) => e.id));
    for (const el of space.elements) {
      for (const ref of collectBindingTargets(el.props)) {
        if (!known.has(ref)) {
          throw new OrreryError(
            `element ${el.id} binds to unknown element ${ref}`,
            "dangling-binding",
          );
        }
      }
    }

    const rt = new SpaceRuntime(space, opts);
    for (const el of rt.space.elements) rt.local.set(el.id, {});
    // `requires` was parsed and never read. Checking it here turns "some elements render
    // as stubs for no stated reason" into a nameable fact the caller can surface.
    rt.missing = space.requires.filter((r) => r.split("@")[0] !== opts.pack.id);
    return rt;
  }

  private require(id: string): Element {
    const el = this.live(id);
    if (!el) throw new OrreryError(`no element ${id}`, "no-element");
    return el;
  }

  private touch(id: string): void {
    this.lastTouched.set(id, ++this.seq);
  }
}

export function stubOf(el: Element): Element {
  const cut = el.block.lastIndexOf("/");
  return {
    ...el,
    block: STUB_BLOCK,
    props: {
      pack: cut > 0 ? el.block.slice(0, cut) : null,
      block: cut > 0 ? el.block.slice(cut + 1) : el.block,
      title: el.title ?? null,
      frozen: el.frozen?.rows ?? null,
    },
  };
}

function fmt(v: unknown): string {
  if (Array.isArray(v)) return `[${v.join(",")}]`;
  if (v === null) return "null";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function parseLifetime(value: unknown): Lifetime {
  const r = LifetimeSchema.safeParse(value);
  if (!r.success) {
    throw new OrreryError(`invalid lifetime: ${formatIssues(r.error)}`, "invalid-lifetime");
  }
  return r.data as Lifetime;
}

/** §4.11 — one rule, one place. It was previously written out at three call sites. */
function requireTitleIfPersistent(lifetime: Lifetime, title: string | undefined): void {
  if (lifetime.mode === "persistent" && !title) {
    throw new OrreryError("a persistent element requires a title", "title-required");
  }
}

function collectBindingTargets(
  value: unknown,
  out: Set<string> = new Set(),
  depth = 0,
): Set<string> {
  if (depth > MAX_VALUE_DEPTH) {
    throw new OrreryError(`value nested deeper than ${MAX_VALUE_DEPTH}`, "too-deep");
  }
  if (isBinding(value)) {
    out.add((value as { $from: { el: string } }).$from.el);
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectBindingTargets(v, out, depth + 1);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectBindingTargets(v, out, depth + 1);
    }
  }
  return out;
}

function assertDepth(v: unknown, max: number, depth = 0): void {
  if (depth > max) throw new OrreryError(`value nested deeper than ${max}`, "too-deep");
  if (Array.isArray(v)) {
    for (const x of v) assertDepth(x, max, depth + 1);
  } else if (v && typeof v === "object") {
    for (const x of Object.values(v as Record<string, unknown>)) assertDepth(x, max, depth + 1);
  }
}

function byteLength(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Buffer.byteLength(JSON.stringify(v), "utf8");
}

function formatIssues(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}
