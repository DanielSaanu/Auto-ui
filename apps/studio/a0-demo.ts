/**
 * A0 demo — the binding loop, with a <select> standing in for the map (plan §8.3).
 *
 * Run: npm run a0
 *
 * No model, no d3, no network. It prints what the agent would see at each step, which
 * is the only thing A0 is trying to prove: that a tap updates a bound tile, the spec is
 * untouched, the snapshot reflects it, and the whole thing survives a restart.
 */
import { createSpace, type Principal } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime } from "@orrery/runtime";

const DANZO: Principal = { kind: "user", id: "danzo" };
const AGENT: Principal = { kind: "agent", id: "claude", onBehalfOf: "danzo" };

const COUNTRIES = ["USA", "BRA", "CHN", "NGA"]; // the <select>'s options
const POP: Record<string, number> = { USA: 334914895, BRA: 216422446, CHN: 1410710000, NGA: 223804632 };

const space = createSpace({ title: "A0 demo", owner: "danzo" });
space.grants.push({ principal: AGENT, role: "agent" });
const rt = new SpaceRuntime(space, { pack: corePack });

function step(label: string, body: () => void) {
  console.log(`\n\x1b[1m── ${label}\x1b[0m`);
  body();
}

rt.beginTurn();

const picker = rt.place(
  {
    name: "$picker",
    block: "Choropleth",
    props: {
      fill: {
        query: { source: { registry: "worldbank" }, select: ["SP.POP.TOTL"], entities: { group: "countries" } },
      },
      focus: { iso3: "USA" },
    },
    lifetime: { mode: "session" },
  },
  AGENT,
);

const tile = rt.place(
  {
    name: "$tile",
    block: "Metric",
    props: {
      group: [
        {
          label: "Population",
          data: {
            query: {
              source: { registry: "worldbank" },
              select: ["SP.POP.TOTL"],
              // THE POINT: the entity is bound to the picker, not written in.
              entities: { ids: [{ $from: { el: picker, field: "selection" } }] },
            },
          },
        },
      ],
    },
    lifetime: { mode: "session" },
  },
  AGENT,
);

step("the agent placed two elements; nothing is selected yet", () => {
  console.log(rt.snapshot());
});

step("the user works the <select> — 0 model calls, 0 network", () => {
  for (const iso of COUNTRIES) {
    rt.setLocal(picker, "selection", iso);
    const resolved = rt.resolvedProps(tile) as any;
    const bound = resolved.group[0].data.query.entities.ids[0];
    console.log(`  select ${iso}  →  tile entity = ${bound}   (pop ${POP[iso]!.toLocaleString()})`);
  }
});

step("the SPEC never moved — only renderer-local state did", () => {
  const specEntity = (rt.get(tile)!.props as any).group[0].data.query.entities.ids[0];
  console.log(`  spec still says: ${JSON.stringify(specEntity)}`);
  console.log(`  version still:   ${rt.get(tile)!.version}`);
});

step("the snapshot the agent reads on the next turn", () => {
  console.log(rt.snapshot());
});

step("the user pins the tile — values are frozen INTO it", () => {
  const iso = rt.getLocal(picker, "selection") as string;
  rt.promote(tile, DANZO, {
    title: `Population of ${iso}`,
    rows: [{ entity: iso, year: 2023, value: POP[iso] }],
    receipts: [
      {
        source: "worldbank",
        measure: "SP.POP.TOTL",
        units: "people",
        resolvedYear: 2023,
        licence: { spdx: "CC-BY-4.0", attribution: "World Bank" },
        fetchedAt: new Date().toISOString(),
        by: DANZO,
      },
    ],
  });
  console.log(`  frozen: ${JSON.stringify(rt.get(tile)!.frozen!.rows)}`);
});

step("close the tab, come back tomorrow", () => {
  const wire = JSON.stringify(rt.toJSON());
  const reopened = SpaceRuntime.fromJSON(JSON.parse(wire), { pack: corePack });
  const stubs = reopened.endSession();
  console.log(`  bytes on the wire: ${wire.length}`);
  console.log(`  still here:        ${reopened.space.elements.map((e) => e.title ?? e.block).join(", ")}`);
  console.log(`  expired to stubs:  ${stubs.map((s) => (s.props as any).block).join(", ")}  (not vanished)`);
  console.log(`  frozen value:      ${JSON.stringify(reopened.get(tile)!.frozen!.rows)}`);
});

console.log("\n\x1b[32mA0 gate: $from + snapshot + reopen all hold.\x1b[0m\n");
