import { z } from "zod";

/**
 * The space protocol — plan §4.1, §4.2, §4.6, §4.10.
 *
 * A space is a durable surface that accumulates. Elements are server-identified,
 * space-scoped, and carry their own lifetime. Nothing here touches HTTP, a model,
 * or a renderer: this is the contract the rest of the system agrees on.
 */

// ── ids ───────────────────────────────────────────────────────────────────────

const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

/**
 * Monotonic-ish ULID. Not cryptographically strong; ids are identifiers, not secrets
 * (authorisation is §4.10's job, never id-guessing).
 */
export function ulid(now: number = Date.now(), rand: () => number = Math.random): string {
  let ts = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    ts = ULID_ALPHABET[t % 32]! + ts;
    t = Math.floor(t / 32);
  }
  let r = "";
  for (let i = 0; i < 16; i++) r += ULID_ALPHABET[Math.floor(rand() * 32)]!;
  return ts + r;
}

export const elementId = (gen = ulid) => `el_${gen()}`;
export const spaceId = (gen = ulid) => `sp_${gen()}`;

// ── principals and access (§4.10) ─────────────────────────────────────────────

export const PrincipalSchema = z.union([
  z.object({ kind: z.literal("user"), id: z.string().min(1) }).strict(),
  z
    .object({ kind: z.literal("agent"), id: z.string().min(1), onBehalfOf: z.string().min(1) })
    .strict(),
  z.object({ kind: z.literal("link"), token: z.string().min(1) }).strict(),
]);
export type Principal = z.infer<typeof PrincipalSchema>;

export type Role = "owner" | "editor" | "agent" | "viewer";

export const GrantSchema = z
  .object({
    principal: PrincipalSchema,
    role: z.enum(["owner", "editor", "agent", "viewer"]),
    packs: z.array(z.string()).optional(),
    expiresAt: z.string().optional(),
  })
  .strict();
export type Grant = z.infer<typeof GrantSchema>;

// ── lifetime (§4.1) ───────────────────────────────────────────────────────────

export const LifetimeSchema = z.union([
  z.object({ mode: z.literal("ephemeral") }).strict(),
  z.object({ mode: z.literal("session") }).strict(),
  z.object({ mode: z.literal("persistent"), pinned: z.boolean().optional() }).strict(),
]);
export type Lifetime = z.infer<typeof LifetimeSchema>;

// ── bindings (§4.6) ───────────────────────────────────────────────────────────

export const BOUND_FIELDS = [
  "selection",
  "selections",
  "year",
  "range",
  "row",
  "rows",
  "sort",
] as const;
export type BoundField = (typeof BOUND_FIELDS)[number];

/**
 * A binding is a CLOSED OBJECT, never a parsed dot-path string (§4.6). A parsed path
 * is a small expression language, and an expression language whose input comes from a
 * model is the injection surface §7.2 exists to remove.
 */
export const BindingSchema = z
  .object({
    $from: z
      .object({ el: z.string().min(1), field: z.enum(BOUND_FIELDS) })
      .strict(),
  })
  .strict();
export type Binding = z.infer<typeof BindingSchema>;

export function isBinding(v: unknown): v is Binding {
  return BindingSchema.safeParse(v).success;
}

// ── receipts and frozen data (§4.2) ───────────────────────────────────────────

export type Receipt = {
  source: string;
  measure: string;
  units: string;
  resolvedYear?: number;
  licence: { spdx: string; attribution: string };
  fetchedAt: string;
  by: Principal;
};

export type FrozenData = {
  at: string;
  envelope: "envelope" | "slice";
  resolvedYear?: number;
  rows: unknown;
  receipts: Receipt[];
  digestVersion: string;
  bytes: number;
};

// ── elements and spaces (§4.1) ────────────────────────────────────────────────

export type Element = {
  id: string;
  block: string;
  props: unknown;
  lifetime: Lifetime;
  title?: string;
  tags?: string[];
  layout?: { span?: 1 | 2 | 3 | 4; minH?: "s" | "m" | "l"; group?: string };
  origin: { turn: number; at: string; by: Principal };
  version: number;
  invokeChainDepth: number;
  frozen?: FrozenData;
};

export type SpaceBudget = {
  invokeCallsPerDay: number;
  maxChainDepth: number;
};

export type Space = {
  id: string;
  v: 1;
  title: string;
  elements: Element[];
  createdAt: string;
  requires: string[];
  owner: string;
  grants: Grant[];
  budget: SpaceBudget;
};

/** Renderer-local state (§4.2): selection, camera, scrub position. NOT part of the spec. */
export type LocalState = Partial<Record<BoundField, unknown>>;

export const DEFAULT_BUDGET: SpaceBudget = { invokeCallsPerDay: 50, maxChainDepth: 2 };

export function createSpace(opts: {
  title: string;
  owner: string;
  requires?: string[];
  id?: string;
  now?: () => Date;
}): Space {
  const now = opts.now ?? (() => new Date());
  return {
    id: opts.id ?? spaceId(),
    v: 1,
    title: opts.title,
    elements: [],
    createdAt: now().toISOString(),
    requires: opts.requires ?? ["core@1"],
    owner: opts.owner,
    grants: [{ principal: { kind: "user", id: opts.owner }, role: "owner" }],
    budget: { ...DEFAULT_BUDGET },
  };
}
