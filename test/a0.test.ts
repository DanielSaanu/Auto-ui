import { describe, it, expect } from "vitest";
import { createSpace, type Principal } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime, OrreryError, can } from "@orrery/runtime";

/**
 * A0 — the thesis gate (plan §8.3).
 *
 *   "Two hardcoded specs, a <select> standing in for the map, one metric tile, one
 *    element persisted and reopened. No model, no d3, no API.
 *    KILL CRITERION: if $from + snapshot + reopen fails, stop — it is the thesis."
 *
 * Everything below is that gate, stated as tests.
 */

const DANZO: Principal = { kind: "user", id: "danzo" };
const AGENT: Principal = { kind: "agent", id: "claude", onBehalfOf: "danzo" };

let n = 0;
const fixed = () => `el_TEST${String(++n).padStart(4, "0")}`;

function newRuntime() {
  n = 0;
  const space = createSpace({ title: "A0", owner: "danzo", id: "sp_TEST" });
  space.grants.push({ principal: AGENT, role: "agent" });
  return new SpaceRuntime(space, { pack: corePack, genId: fixed });
}

/** The two hardcoded specs: a country picker, and a metric bound to its selection. */
function placeFixtures(rt: SpaceRuntime) {
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

  const metric = rt.place(
    {
      name: "$metric",
      block: "Metric",
      props: {
        group: [
          {
            label: "Population",
            data: {
              query: {
                source: { registry: "worldbank" },
                select: ["SP.POP.TOTL"],
                entities: { ids: ["USA"] },
              },
            },
          },
        ],
      },
      lifetime: { mode: "session" },
    },
    AGENT,
  );
  return { picker, metric };
}

describe("A0.1 — the binding loop", () => {
  it("a binding resolves against another element's local state", () => {
    const rt = newRuntime();
    const { picker } = placeFixtures(rt);

    // A Metric whose entity is BOUND to the picker's selection, rather than literal.
    const bound = rt.place(
      {
        name: "$bound",
        block: "Choropleth",
        props: {
          fill: { query: { source: { registry: "worldbank" }, select: ["SP.POP.TOTL"] } },
          highlight: { $from: { el: picker, field: "selections" } },
        },
        lifetime: { mode: "session" },
      },
      AGENT,
    );

    // Nothing selected yet — the binding resolves to undefined, not a crash.
    expect((rt.resolvedProps(bound) as any).highlight).toBeUndefined();

    // The user taps Brazil. 0 model calls, 0 network: local state only.
    rt.setLocal(picker, "selections", ["BRA"]);
    expect((rt.resolvedProps(bound) as any).highlight).toEqual(["BRA"]);

    // And again — the binding tracks, it does not latch.
    rt.setLocal(picker, "selections", ["BRA", "CHN"]);
    expect((rt.resolvedProps(bound) as any).highlight).toEqual(["BRA", "CHN"]);
  });

  it("the SPEC is untouched by a local interaction", () => {
    const rt = newRuntime();
    const { picker } = placeFixtures(rt);
    const before = structuredClone(rt.get(picker)!.props);
    const version = rt.get(picker)!.version;

    rt.setLocal(picker, "selections", ["BRA"]);

    // §4.2: local state is renderer-local. If a tap mutated the spec, a follow-up turn
    // would silently revert what the user just clicked — the core demo.
    expect(rt.get(picker)!.props).toEqual(before);
    expect(rt.get(picker)!.version).toBe(version);
  });

  it("a binding to an unknown element is an error, not a silent undefined", () => {
    const rt = newRuntime();
    expect(() =>
      rt.place(
        {
          name: "$x",
          block: "Choropleth",
          props: {
            fill: { query: { source: { registry: "worldbank" }, select: ["X"] } },
            highlight: { $from: { el: "el_NOPE", field: "selections" } },
          },
        },
        AGENT,
      ),
    ).not.toThrow();
    // NOTE: the assertion above cannot fail — place() inspects no binding targets — so it
    // is kept only as documentation of the deliberate choice. The REAL check is below.
    const id = rt.space.elements.at(-1)!.id;
    expect(() => rt.resolvedProps(id)).toThrow(OrreryError);
    try {
      rt.resolvedProps(id);
    } catch (e: any) {
      expect(e.code).toBe("no-element");
    }
  });

  it("a binding cycle terminates instead of hanging", () => {
    const rt = newRuntime();
    const { picker, metric } = placeFixtures(rt);
    rt.setLocal(picker, "selection", { $from: { el: metric, field: "selection" } });
    rt.setLocal(metric, "selection", { $from: { el: picker, field: "selection" } });
    expect(() => rt.resolveBindings({ $from: { el: picker, field: "selection" } })).toThrow(
      /binding cycle/,
    );
  });
});

describe("A0.2 — the snapshot", () => {
  it("is regenerated from live state, never appended", () => {
    const rt = newRuntime();
    const { picker } = placeFixtures(rt);

    rt.setLocal(picker, "selections", ["BRA"]);
    const first = rt.snapshot();
    rt.setLocal(picker, "selections", ["CHN"]);
    const second = rt.snapshot();

    expect(first).toContain("selections=[BRA]");
    expect(second).toContain("selections=[CHN]");
    // The old value is GONE, not listed above the new one. An append-only log makes the
    // model infer that the last entry wins, and goes stale when the window truncates.
    expect(second).not.toContain("BRA");
    expect(second.split("\n").length).toBe(first.split("\n").length);
  });

  it("shows a binding's source element", () => {
    const rt = newRuntime();
    const { picker } = placeFixtures(rt);
    rt.place(
      {
        name: "$b",
        block: "Choropleth",
        props: {
          fill: { query: { source: { registry: "worldbank" }, select: ["X"] } },
          highlight: { $from: { el: picker, field: "selections" } },
        },
        lifetime: { mode: "session" },
      },
      AGENT,
    );
    expect(rt.snapshot()).toContain(`highlight←${picker}`);
  });

  it("caps, and says how many it hid", () => {
    const rt = newRuntime();
    rt.beginTurn();
    for (let i = 0; i < 20; i++) {
      rt.place(
        { name: `$n${i}`, block: "Note", props: { text: `note ${"x".repeat(i)}` }, lifetime: { mode: "session" } },
        AGENT,
      );
    }
    const snap = rt.snapshot({ maxLines: 5, recentSession: 5 });
    expect(snap.split("\n")).toHaveLength(6); // 5 + the "… more" line
    expect(snap).toMatch(/… \d+ more \(use find_elements\)/);
  });

  it("orders session elements by interaction, not by placement", () => {
    const rt = newRuntime();
    rt.beginTurn();
    const a = rt.place({ name: "$a", block: "Note", props: { text: "a" }, lifetime: { mode: "session" } }, AGENT);
    const b = rt.place({ name: "$b", block: "Note", props: { text: "b" }, lifetime: { mode: "session" } }, AGENT);
    const c = rt.place({ name: "$c", block: "Note", props: { text: "c" }, lifetime: { mode: "session" } }, AGENT);

    rt.setLocal(a, "row", 1); // touch the OLDEST element

    const lines = rt.snapshot().split("\n");
    // A space is not a transcript: what you touched outranks what was placed last.
    expect(lines[0]).toContain(a);
    // Full expected order, so this fails if any of the three moves: a (just touched),
    // then c (placed most recently), then b.
    expect(lines[1]).toContain(c);
    expect(lines[2]).toContain(b);
  });
});

describe("A0.3 — persist and reopen", () => {
  it("a promoted element survives a full serialise/reopen with the same render", () => {
    const rt = newRuntime();
    const { picker, metric } = placeFixtures(rt);
    rt.setLocal(picker, "selections", ["BRA"]);

    rt.promote(metric, DANZO, {
      title: "US population",
      rows: [{ entity: "USA", year: 2023, value: 334914895 }],
      receipts: [
        {
          source: "worldbank",
          measure: "SP.POP.TOTL",
          units: "people",
          resolvedYear: 2023,
          licence: { spdx: "CC-BY-4.0", attribution: "World Bank" },
          fetchedAt: "2026-09-19T00:00:00.000Z",
          by: DANZO,
        },
      ],
    });

    const before = rt.resolvedProps(metric);
    const wire = JSON.stringify(rt.toJSON());

    // Restart: a brand new runtime from the serialised bytes.
    const reopened = SpaceRuntime.fromJSON(JSON.parse(wire), { pack: corePack, genId: fixed });

    expect(reopened.resolvedProps(metric)).toEqual(before);
    const frozen = reopened.get(metric)!.frozen!;
    expect(frozen.rows).toEqual([{ entity: "USA", year: 2023, value: 334914895 }]);
    expect(frozen.receipts[0]!.resolvedYear).toBe(2023); // a CONCRETE year, never "mry"
    expect(frozen.bytes).toBeGreaterThan(0);
  });

  it("promotion demands a title, because search over empty fields searches nothing", () => {
    const rt = newRuntime();
    const { metric } = placeFixtures(rt);
    expect(() => rt.promote(metric, DANZO, { title: "", rows: [] })).toThrow(/requires a title/);
    expect(() =>
      rt.place({ name: "$p", block: "Note", props: { text: "hi" }, lifetime: { mode: "persistent" } }, AGENT),
    ).toThrow(/requires a title/);
  });

  it("ending a session keeps persistent elements and stubs the rest", () => {
    const rt = newRuntime();
    const { picker, metric } = placeFixtures(rt);
    rt.promote(metric, DANZO, { title: "US population", rows: [] });

    const stubs = rt.endSession();

    expect(rt.space.elements.map((e) => e.id)).toEqual([metric]);
    // Expiry is never silent: the picker leaves a stub naming what it was.
    expect(stubs).toHaveLength(1);
    expect(stubs[0]!.id).toBe(picker);
    expect(stubs[0]!.block).toBe("core/Stub");
    expect((stubs[0]!.props as any).of).toBe("Choropleth");
  });
});

describe("A0.4 — validation and access", () => {
  it("rejects props that do not match the block schema", () => {
    const rt = newRuntime();
    rt.beginTurn();
    expect(() => rt.place({ name: "$x", block: "Metric", props: { group: [] } }, AGENT)).toThrow(
      /invalid props/,
    );
    // A Metric tile must have exactly one of value | data.
    expect(() =>
      rt.place({ name: "$x", block: "Metric", props: { group: [{ label: "P", value: 1, data: { query: { source: { registry: "w" }, select: ["a"] } } }] } }, AGENT),
    ).toThrow(/exactly one of value \| data/);
  });

  it("rejects an unknown block by name", () => {
    const rt = newRuntime();
    rt.beginTurn();
    expect(() => rt.place({ name: "$x", block: "Globe", props: {} }, AGENT)).toThrow(/unknown block/);
  });

  it("refuses prose carrying a figure the model did not resolve", () => {
    const rt = newRuntime();
    rt.beginTurn();
    expect(() =>
      rt.place({ name: "$p", block: "Prose", props: { text: "The USA has 342 million people." } }, AGENT),
    ).toThrow(/may not contain figures/);
    // The same sentence is fine once the number is a resolved reference.
    expect(() =>
      rt.place(
        {
          name: "$p2",
          block: "Prose",
          props: {
            text: "The USA has {{f0}} people.",
            figures: [{ ref: { $from: { el: "el_TEST0001", field: "row" } } }],
          },
        },
        AGENT,
      ),
    ).not.toThrow();
  });

  it("an agent acts on behalf of a user and cannot escalate", () => {
    const rt = newRuntime();
    const { metric } = placeFixtures(rt);
    // §4.10 rule 3: only a user action fires an invoke.
    expect(can(rt.space, AGENT, "invoke")).toBe(false);
    expect(can(rt.space, DANZO, "invoke")).toBe(true);
    // Provenance is permanent.
    expect(rt.get(metric)!.origin.by).toEqual(AGENT);
  });

  it("an agent may remove only what it placed", () => {
    const rt = newRuntime();
    rt.beginTurn();
    const mine = rt.place({ name: "$a", block: "Note", props: { text: "agent" } }, AGENT);
    const theirs = rt.place({ name: "$b", block: "Note", props: { text: "user" } }, DANZO);
    expect(() => rt.remove(theirs, AGENT)).toThrow(/may not remove/);
    expect(() => rt.remove(mine, AGENT)).not.toThrow();
  });
});

describe("A0.5 — a binding inside a query (the gap the demo exposed)", () => {
  it("accepts a binding where an entity id goes, and resolves it before use", () => {
    const rt = newRuntime();
    const { picker } = placeFixtures(rt);
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

    rt.setLocal(picker, "selection", "BRA");
    const resolved = rt.resolvedProps(tile) as any;
    // A binding never reaches a request; only the value it resolved to does.
    expect(resolved.group[0].data.query.entities.ids).toEqual(["BRA"]);

    rt.setLocal(picker, "selection", "CHN");
    expect((rt.resolvedProps(tile) as any).group[0].data.query.entities.ids).toEqual(["CHN"]);
  });

  it("still rejects a non-string, non-binding entity id", () => {
    const rt = newRuntime();
    rt.beginTurn();
    expect(() =>
      rt.place(
        {
          name: "$x",
          block: "Metric",
          props: {
            group: [
              {
                label: "P",
                data: {
                  query: { source: { registry: "w" }, select: ["a"], entities: { ids: [{ nope: 1 }] } },
                },
              },
            ],
          },
        },
        AGENT,
      ),
    ).toThrow(/invalid props/);
  });
});
