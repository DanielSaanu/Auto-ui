import { describe, it, expect } from "vitest";
import { MAX_VALUE_DEPTH, OrreryError } from "@orrery/runtime";
import { SpaceRuntime } from "@orrery/runtime";
import { corePack } from "@orrery/packs-core";
import { DANZO, AGENT, note, globe, runtime } from "./helpers.js";

/**
 * The write boundary — everything `place()` and `update()` accept from outside.
 *
 * `props` was validated against the block schema from the start. Every OTHER field on an
 * element was not, so a hallucinated value arrived intact — which is the shape a model's
 * tool call produces, and the surface A1 connects directly to model output.
 */

const deep = (n: number) => {
  let o: any = { x: 1 };
  for (let i = 0; i < n; i++) o = { nest: o };
  return o;
};

describe("lifetime is validated, not trusted", () => {
  it("rejects an unknown mode instead of storing it", () => {
    const r = runtime();
    r.beginTurn();
    // Accepted, this produced an element invisible to every snapshot tier and untouched
    // by endTurn — silently created, impossible for the agent to see or clean up.
    expect(() =>
      r.place({ name: "$g", block: "Note", props: { text: "x" }, lifetime: { mode: "eternal" } as any }, DANZO),
    ).toThrow(/invalid lifetime/);
  });

  it("rejects unknown keys on a valid mode", () => {
    const r = runtime();
    r.beginTurn();
    expect(() =>
      r.place(
        { name: "$g", block: "Note", props: { text: "x" }, lifetime: { mode: "session", bogus: 1 } as any },
        DANZO,
      ),
    ).toThrow(/invalid lifetime/);
  });

  it("rejects an invalid lifetime through update too", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n"), DANZO);
    expect(() => r.update(id, { lifetime: { mode: "forever" } as any }, DANZO)).toThrow(
      /invalid lifetime/,
    );
  });

  it("accepts every legitimate lifetime", () => {
    const r = runtime();
    r.beginTurn();
    expect(() => r.place(note("$a", "a", { mode: "ephemeral" }), DANZO)).not.toThrow();
    expect(() => r.place(note("$b", "b", { mode: "session" }), DANZO)).not.toThrow();
    const id = r.place(note("$c", "c"), DANZO);
    expect(() =>
      r.update(id, { lifetime: { mode: "persistent", pinned: true }, title: "t" }, DANZO),
    ).not.toThrow();
  });
});

describe("element metadata is validated", () => {
  it("rejects non-string tags", () => {
    const r = runtime();
    r.beginTurn();
    expect(() =>
      r.place({ name: "$n", block: "Note", props: { text: "x" }, tags: [123, null] as any }, DANZO),
    ).toThrow(/invalid element metadata/);
  });

  it("rejects an out-of-range layout span", () => {
    const r = runtime();
    r.beginTurn();
    expect(() =>
      r.place({ name: "$n", block: "Note", props: { text: "x" }, layout: { span: 99 } as any }, DANZO),
    ).toThrow(/invalid element metadata/);
  });

  it("accepts legitimate metadata", () => {
    const r = runtime();
    r.beginTurn();
    expect(() =>
      r.place(
        { name: "$n", block: "Note", props: { text: "x" }, tags: ["a", "b"], layout: { span: 2, minH: "m" } },
        DANZO,
      ),
    ).not.toThrow();
  });
});

describe("placeholders cannot impersonate ids", () => {
  it.each(["el_anything", "sp_anything"])("refuses the reserved prefix %s", (name) => {
    const r = runtime();
    r.beginTurn();
    expect(() => r.place({ name, block: "Note", props: { text: "x" } }, DANZO)).toThrow(
      /reserved id prefix/,
    );
  });
});

describe("deep values are bounded on every path, not just setLocal", () => {
  it("place() rejects deep props with a controlled error", () => {
    // Table.rows is z.unknown(), so arbitrary nesting is SCHEMA-LEGAL — and place() walks
    // props for placeholder rewriting BEFORE validation runs, so the schema could not have
    // stopped it anyway. This produced an uncaught RangeError.
    const r = runtime();
    r.beginTurn();
    let err: any;
    try {
      r.place({ name: "$t", block: "Table", props: { rows: [{ blob: deep(5000) }] } }, DANZO);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(OrreryError);
    expect(err.code).toBe("too-deep");
  });

  it("accepts nesting within the limit", () => {
    const r = runtime();
    r.beginTurn();
    expect(() =>
      r.place({ name: "$t", block: "Table", props: { rows: [{ blob: deep(10) }] } }, DANZO),
    ).not.toThrow();
  });

  it("the limit is shared, not per-call-site", () => {
    expect(MAX_VALUE_DEPTH).toBeGreaterThan(0);
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n"), DANZO);
    // setLocal and place must agree; they used to have independent (and missing) bounds.
    expect(() => r.setLocal(id, "row", deep(MAX_VALUE_DEPTH + 10))).toThrow(/nested deeper/);
  });
});

describe("get() hands out a copy, not the live element", () => {
  it("mutating the result changes nothing", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "original"), DANZO);

    const copy = r.get(id)!;
    (copy.props as any).text = "MUTATED";
    copy.version = 999;
    copy.lifetime = { mode: "persistent" };

    // Handing out the live object let callers write straight past validation, versioning
    // and access checks — and is how a test once came to assert on its own fixture.
    expect((r.get(id)!.props as any).text).toBe("original");
    expect(r.get(id)!.version).toBe(1);
    expect(r.get(id)!.lifetime).toEqual({ mode: "ephemeral" });
  });

  it("update() and promote() also return copies", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), DANZO);
    const fromUpdate = r.update(id, { props: { text: "b" } }, DANZO);
    (fromUpdate.props as any).text = "MUTATED";
    expect((r.get(id)!.props as any).text).toBe("b");

    const fromPromote = r.promote(id, DANZO, { title: "t", rows: [] });
    (fromPromote as any).title = "MUTATED";
    expect(r.get(id)!.title).toBe("t");
  });
});

describe("a turn must be open before placing", () => {
  it("refuses to place without beginTurn()", () => {
    const r = runtime();
    expect(() => r.place(note("$n"), DANZO)).toThrow(/beginTurn/);
  });

  it("records the turn it was placed in", () => {
    const r = runtime();
    r.beginTurn();
    r.beginTurn();
    const id = r.place(note("$n"), DANZO);
    expect(r.get(id)!.origin.turn).toBe(2);
  });
});

describe("resolvedProps can guarantee what a renderer receives", () => {
  it("does not validate by default, because half-resolved is a normal state", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$p"), DANZO);
    const tile = r.place(
      globe("$t", { highlight: { $from: { el: "$p", field: "selections" } } }),
      DANZO,
    );
    // Nothing selected yet: the binding resolves to undefined.
    expect((r.resolvedProps(tile) as any).highlight).toBeUndefined();
  });

  it("validates on request and names the element that failed", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$p"), DANZO);
    const tile = r.place(
      globe("$t", { highlight: { $from: { el: "$p", field: "selections" } } }),
      DANZO,
    );
    r.setLocal(picker, "selections", "NOT-AN-ARRAY" as any);

    let err: any;
    try {
      r.resolvedProps(tile, { validate: true });
    } catch (e) {
      err = e;
    }
    expect(err?.code).toBe("unresolved-props");
    expect(err?.message).toContain(tile);
  });

  it("passes validation when the resolved value fits", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$p"), DANZO);
    const tile = r.place(
      globe("$t", { highlight: { $from: { el: "$p", field: "selections" } } }),
      DANZO,
    );
    r.setLocal(picker, "selections", ["BRA"]);
    expect((r.resolvedProps(tile, { validate: true }) as any).highlight).toEqual(["BRA"]);
  });
});

describe("requires is checked against the loaded pack", () => {
  it("names packs the space needs that are not loaded", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$n"), DANZO);
    const wire = JSON.parse(JSON.stringify(r.toJSON()));
    wire.requires = ["core@1", "geo@1", "acme@2"];

    const back = SpaceRuntime.fromJSON(wire, { pack: corePack });
    // Previously parsed and never read, so elements rendered as stubs for no stated reason.
    expect(back.missingPacks()).toEqual(["geo@1", "acme@2"]);
  });

  it("reports nothing when everything needed is present", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$n"), DANZO);
    const back = SpaceRuntime.fromJSON(JSON.parse(JSON.stringify(r.toJSON())), { pack: corePack });
    expect(back.missingPacks()).toEqual([]);
  });
});
