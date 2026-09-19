import { describe, it, expect } from "vitest";
import { MAX_VALUE_DEPTH, OrreryError } from "@orrery/runtime";
import { DANZO, AGENT, note, runtime } from "./helpers.js";

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
