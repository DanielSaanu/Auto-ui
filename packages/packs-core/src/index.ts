import { z } from "zod";
import { QuerySchema } from "@orrery/query";
import { BindingSchema, BOUND_FIELDS, type BoundField } from "@orrery/protocol";
import { hasBareFigure, FIGURE_REPAIR_MESSAGE } from "./figures.js";

export * from "./figures.js";

/** Plan §4.7 — the core pack. The schemas ARE the docs, the prompt and the validator. */

const Scale = z.enum(["linear", "log", "quantile", "quantize"]);
const Tone = z.enum(["body", "note", "warning"]);
const Emphasis = z.enum(["primary", "muted"]);
const Align = z.enum(["start", "end"]);
const Iso3 = z.string().regex(/^[A-Z]{3}$/, "iso3 must be three uppercase letters");

const Bound = <T extends z.ZodTypeAny>(t: T) => z.union([t, BindingSchema]);

/** THE ONE DATA SHAPE (§4.7). Anything that fetches takes this — there is no second ref. */
export const DataSource = z
  .object({
    query: QuerySchema,
    freeze: z.enum(["envelope", "slice"]).default("envelope"),
  })
  .strict();

// ── 1. Prose — where §3.1 is enforced ────────────────────────────────────────
export const Prose = z
  .object({
    text: z.string().max(4000).refine((s) => !hasBareFigure(s), { message: FIGURE_REPAIR_MESSAGE }),
    figures: z
      .array(z.object({ ref: BindingSchema, format: z.string().optional() }).strict())
      .max(12)
      .default([]),
    tone: Tone.default("body"),
  })
  .strict();

// ── 2. Metric ────────────────────────────────────────────────────────────────
export const Metric = z
  .object({
    group: z
      .array(
        z
          .object({
            label: z.string().min(1).max(60),
            value: z.union([z.number(), z.string()]).optional(),
            data: DataSource.optional(),
            delta: z
              .object({ vs: z.number(), dir: z.enum(["up", "down"]).optional() })
              .strict()
              .optional(),
            sparkline: z.boolean().default(false),
          })
          .strict()
          .refine((g) => (g.value !== undefined) !== (g.data !== undefined), {
            message: "exactly one of value | data",
          }),
      )
      .min(1)
      .max(6),
    emphasis: Emphasis.default("primary"),
  })
  .strict();

// ── 3. Table — .strict() BEFORE .refine(); ZodEffects has no .strict() ────────
export const Table = z
  .object({
    data: DataSource.optional(),
    rows: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
    columns: z
      .array(
        z
          .object({
            field: z.string().min(1),
            label: z.string().optional(),
            align: Align.optional(),
            format: z.enum(["number", "currency", "percent", "date", "text"]).optional(),
          })
          .strict(),
      )
      .max(24)
      .optional(),
    sort: z.object({ by: z.string().min(1), dir: z.enum(["asc", "desc"]) }).strict().optional(),
    groupBy: z.string().optional(),
    caption: z.string().max(200).optional(),
  })
  .strict()
  .refine((t) => (t.data !== undefined) !== (t.rows !== undefined), {
    message: "exactly one of data | rows",
  });

// ── 4. Chart ─────────────────────────────────────────────────────────────────
export const Chart = z
  .object({
    data: DataSource,
    mark: z.enum(["line", "bar", "area", "point"]).optional(),
    x: z.string().optional(),
    y: z.string().optional(),
    series: z.string().optional(),
    scale: Scale.optional(),
    stack: z.boolean().default(false),
    legend: z.boolean().default(true),
  })
  .strict();

// ── 5. Choropleth ────────────────────────────────────────────────────────────
export const Choropleth = z
  .object({
    fill: DataSource.extend({
      scale: Scale.default("log"),
      legend: z.boolean().default(true),
      palette: z.enum(["sequential", "diverging"]).default("sequential"),
    }).strict(),
    projection: z.enum(["orthographic", "natural", "mercator"]).default("orthographic"),
    focus: z.object({ iso3: Iso3 }).strict().optional(),
    highlight: Bound(z.array(Iso3).max(20)).optional(),
    year: Bound(z.number().int()).optional(),
  })
  .strict();

// ── 6. Stack ─────────────────────────────────────────────────────────────────
export const Stack = z
  .object({
    children: z.array(z.string().min(1)).min(1).max(12),
    direction: z.enum(["v", "h"]).default("v"),
    gap: z.enum(["s", "m", "l"]).default("m"),
  })
  .strict();

// ── 7. Refusal ───────────────────────────────────────────────────────────────
export const Refusal = z
  .object({
    want: z.string().min(1).max(200),
    why: z.enum(["no-source", "no-block", "out-of-scope", "blocked"]),
    detail: z.string().max(600),
    suggest: z
      .array(z.object({ label: z.string().max(80), query: QuerySchema.optional() }).strict())
      .max(3)
      .default([]),
  })
  .strict();

// ── 8. Note — human-authored, so no figure ban ───────────────────────────────
export const Note = z
  .object({
    text: z.string().max(8000),
    author: z.enum(["user", "agent"]).default("agent"),
  })
  .strict();

// ── registry (§2.2) ──────────────────────────────────────────────────────────

export type Tier = "local" | "refetch" | "invoke" | "turn";
export type Gesture = "drag" | "pinch" | "tap" | "swipe" | "wheel";

export type BlockDef<P extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: string;
  props: P;
  tiers: Tier[];
  fields: BoundField[];
  mobile: { minH: "s" | "m" | "l"; gestures: Gesture[] };
  /** Required, not optional (§7.6): a block with no keyboard path does not register. */
  a11y: { role: string; keyboard: string };
};

export function defineBlock<P extends z.ZodTypeAny>(def: BlockDef<P>): BlockDef<P> {
  if (!def.a11y?.role || !def.a11y?.keyboard) {
    throw new Error(`block ${def.name}: a11y.role and a11y.keyboard are required`);
  }
  for (const f of def.fields) {
    if (!BOUND_FIELDS.includes(f)) throw new Error(`block ${def.name}: unknown bound field ${f}`);
  }
  return def;
}

export type PackDef = {
  id: string;
  version: number;
  blocks: Record<string, BlockDef>;
};

export function definePack<T extends PackDef>(def: T): T {
  for (const [key, block] of Object.entries(def.blocks)) {
    if (key !== block.name) throw new Error(`pack ${def.id}: key ${key} != block name ${block.name}`);
  }
  return def;
}

export const corePack = definePack({
  id: "core",
  version: 1,
  blocks: {
    Prose: defineBlock({
      name: "Prose",
      props: Prose,
      tiers: ["local"],
      fields: [],
      mobile: { minH: "s", gestures: [] },
      a11y: { role: "article", keyboard: "text flow; no interactive elements" },
    }),
    Metric: defineBlock({
      name: "Metric",
      props: Metric,
      tiers: ["local", "refetch"],
      fields: [],
      mobile: { minH: "s", gestures: [] },
      a11y: { role: "group", keyboard: "Tab moves between tiles" },
    }),
    Table: defineBlock({
      name: "Table",
      props: Table,
      tiers: ["local", "refetch"],
      fields: ["row", "rows", "sort"],
      mobile: { minH: "m", gestures: ["swipe"] },
      a11y: { role: "table", keyboard: "Tab to headers; Enter sorts; arrows move by cell" },
    }),
    Chart: defineBlock({
      name: "Chart",
      props: Chart,
      tiers: ["local", "refetch"],
      fields: ["range"],
      mobile: { minH: "m", gestures: ["tap"] },
      a11y: { role: "img", keyboard: "Tab to series; arrows step points; a table view is exposed" },
    }),
    Choropleth: defineBlock({
      name: "Choropleth",
      props: Choropleth,
      tiers: ["local", "refetch"],
      fields: ["selection", "selections", "year"],
      mobile: { minH: "l", gestures: ["drag", "pinch", "tap"] },
      a11y: {
        role: "img",
        keyboard: "arrows rotate; Tab cycles countries in fill order; Enter selects",
      },
    }),
    Stack: defineBlock({
      name: "Stack",
      props: Stack,
      tiers: ["local"],
      fields: [],
      mobile: { minH: "s", gestures: [] },
      a11y: { role: "group", keyboard: "children are focusable in order" },
    }),
    Refusal: defineBlock({
      name: "Refusal",
      props: Refusal,
      tiers: ["local"],
      fields: [],
      mobile: { minH: "s", gestures: [] },
      a11y: { role: "note", keyboard: "text flow; suggestions are focusable" },
    }),
    Note: defineBlock({
      name: "Note",
      props: Note,
      tiers: ["local"],
      fields: [],
      mobile: { minH: "s", gestures: [] },
      a11y: { role: "textbox", keyboard: "Enter edits; Escape commits" },
    }),
  },
});

export function blockSchema(pack: PackDef, block: string): z.ZodTypeAny | undefined {
  return pack.blocks[block]?.props;
}
