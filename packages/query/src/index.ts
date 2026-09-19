import { z } from "zod";
import { BindingSchema } from "@orrery/protocol";

/**
 * The query grammar — plan §4.3.
 *
 * One shape for every kind of data request: public resolvers and the user's own
 * uploaded datasets both go through this. `source` is a REGISTRY KEY, never a URL
 * (§7.2), which is what keeps a model-supplied string out of an HTTP request.
 */

export const FilterSchema = z.union([
  z
    .object({
      field: z.string().min(1),
      op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]),
      value: z.union([z.string(), z.number()]),
    })
    .strict(),
  z
    .object({
      field: z.string().min(1),
      op: z.literal("in"),
      value: z.array(z.union([z.string(), z.number()])).min(1).max(200),
    })
    .strict(),
]);

/**
 * An entity id, or a binding that will resolve to one.
 *
 * The bound form is what makes "this tile follows that map's selection" expressible —
 * the plan's own demo follow-up. A query is validated in its UNRESOLVED form here and
 * resolved by the runtime before anything is fetched, so a binding never reaches a
 * request; only the value it resolved to does.
 */
export const EntityIdSchema = z.union([z.string().min(1), BindingSchema]);

export const EntitySelSchema = z.union([
  z.object({ ids: z.array(EntityIdSchema).min(1).max(250) }).strict(),
  z.object({ group: z.string().min(1) }).strict(),
  z.object({ all: z.literal(true) }).strict(),
]);

export const SourceRefSchema = z.union([
  z.object({ registry: z.string().min(1) }).strict(),
  z.object({ dataset: z.string().min(1) }).strict(),
]);

export const RangeSchema = z.union([
  z.object({ from: z.number().int(), to: z.number().int() }).strict(),
  z.object({ recent: z.number().int().positive() }).strict(),
  z.object({ at: z.union([z.number().int(), z.literal("mry")]) }).strict(),
]);

export const QuerySchema = z
  .object({
    source: SourceRefSchema,
    select: z.array(z.string().min(1)).min(1).max(8),
    entities: EntitySelSchema.optional(),
    range: RangeSchema.optional(),
    filter: z.array(FilterSchema).max(8).optional(),
    order: z
      .object({ by: z.string().min(1), dir: z.enum(["asc", "desc"]) })
      .strict()
      .optional(),
    limit: z.number().int().positive().max(1000).optional(),
  })
  .strict();

export type Query = z.infer<typeof QuerySchema>;
export type Filter = z.infer<typeof FilterSchema>;
export type EntitySel = z.infer<typeof EntitySelSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;

/** Graph-shaped requests — §4.3. Diagram blocks take this; nothing in A0 uses it. */
export const GraphQuerySchema = z
  .object({
    source: SourceRefSchema,
    nodes: z
      .object({
        select: z.array(z.string()).min(1),
        id: z.string().min(1),
        label: z.string().optional(),
        group: z.string().optional(),
      })
      .strict(),
    edges: z
      .object({
        select: z.array(z.string()).min(1),
        from: z.string().min(1),
        to: z.string().min(1),
        weight: z.string().optional(),
      })
      .strict(),
    filter: z.array(FilterSchema).max(8).optional(),
    limit: z
      .object({ nodes: z.number().int().positive().optional(), edges: z.number().int().positive().optional() })
      .strict()
      .optional(),
  })
  .strict();

export type GraphQuery = z.infer<typeof GraphQuerySchema>;

/**
 * A stable cache/identity key for a query.
 *
 * Object KEY order is normalised; ARRAY order is not, so two semantically identical
 * queries whose `filter` entries are listed in a different order produce different keys.
 * That is cache fragmentation, not a correctness bug, and it is left alone deliberately:
 * normalising array order means deciding that every array in the grammar is a set, which
 * is false for `select` (column order is presentation) and would have to be revisited per
 * field as the grammar grows.
 *
 * §7.3: the PLATFORM owns the discriminating prefix — a pack may only add to a key,
 * never suppress `spaceId`/`packId`/versions. That is enforced here rather than left
 * to a resolver author's care, so cross-tenant reuse is structurally impossible.
 */
export function queryKey(
  q: Query,
  ctx: { spaceId: string; packId: string; packVersion: number; resolverVersion: string },
  extraKeyFields: string[] = [],
): string {
  const canonical = JSON.stringify(sortDeep(q));
  // Every component is JSON-encoded before joining. A `.join(",")` over the extra fields
  // made ["a,b"] and ["a","b"] the same key, and a `|`-joined prefix does the same for
  // any id containing a `|` — which would defeat the isolation this function exists for.
  const extra = JSON.stringify([...extraKeyFields].sort());
  return JSON.stringify([
    ctx.spaceId,
    ctx.packId,
    ctx.packVersion,
    ctx.resolverVersion,
    canonical,
    extra,
  ]);
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortDeep((value as Record<string, unknown>)[k]);
    }
    return out;
  }
  return value;
}
