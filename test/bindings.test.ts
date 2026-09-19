import { describe, it, expect } from "vitest";
import { MAX_BINDING_HOPS } from "@orrery/runtime";
import { DANZO, AGENT, note, globe, runtime } from "./helpers.js";

/** Plan §4.6 — bindings, and the placeholder layer that feeds them. */

describe("binding resolution is bounded", () => {
  it("rejects a cycle", () => {
    const r = runtime();
    r.beginTurn();
    const a = r.place(note("$a", "a", { mode: "session" }), AGENT);
    const b = r.place(note("$b", "b", { mode: "session" }), AGENT);
    r.setLocal(a, "selection", { $from: { el: b, field: "selection" } });
    r.setLocal(b, "selection", { $from: { el: a, field: "selection" } });
    expect(() => r.resolveBindings({ $from: { el: a, field: "selection" } })).toThrow(
      /binding cycle/,
    );
  });

  it("rejects a long ACYCLIC chain instead of overflowing the stack", () => {
    // A chain is not a cycle, so cycle detection never fires on it. Before the hop cap
    // this produced an uncaught RangeError rather than a controlled error.
    const r = runtime();
    r.beginTurn();
    const ids: string[] = [];
    for (let i = 0; i <= MAX_BINDING_HOPS + 5; i++) {
      ids.push(r.place(note(`$n${i}`, "x", { mode: "session" }), AGENT));
    }
    for (let i = 0; i < ids.length - 1; i++) {
      r.setLocal(ids[i]!, "selection", { $from: { el: ids[i + 1]!, field: "selection" } });
    }
    let err: any;
    try {
      r.resolveBindings({ $from: { el: ids[0]!, field: "selection" } });
    } catch (e) {
      err = e;
    }
    expect(err?.code).toBe("binding-too-long");
    expect(err?.constructor.name).toBe("OrreryError");
  });

  it("allows a chain just under the limit", () => {
    const r = runtime();
    r.beginTurn();
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push(r.place(note(`$n${i}`, "x", { mode: "session" }), AGENT));
    for (let i = 0; i < ids.length - 1; i++) {
      r.setLocal(ids[i]!, "selection", { $from: { el: ids[i + 1]!, field: "selection" } });
    }
    r.setLocal(ids.at(-1)!, "selection", "END");
    expect(r.resolveBindings({ $from: { el: ids[0]!, field: "selection" } })).toBe("END");
  });

  it("rejects a too-deep local value", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n"), AGENT);
    let deep: any = 1;
    for (let i = 0; i < 200; i++) deep = { deep };
    expect(() => r.setLocal(id, "row", deep)).toThrow(/nested deeper/);
  });
});

describe("binding resolution does not corrupt objects", () => {
  it("ignores __proto__ arriving through JSON", () => {
    const r = runtime();
    const out = r.resolveBindings(JSON.parse('{"__proto__":{"pwned":"yes"},"v":1}')) as any;
    expect(out.pwned).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(out.v).toBe(1);
  });

  it("passes non-plain objects through untouched", () => {
    const r = runtime();
    const d = new Date(0);
    expect(r.resolveBindings({ when: d }).when).toBe(d);
  });
});

describe("placeholders", () => {
  it("rewrites a placeholder reference to the assigned id", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$picker"), AGENT);
    const tile = r.place(
      globe("$tile", { highlight: { $from: { el: "$picker", field: "selections" } } }),
      AGENT,
    );
    expect((r.get(tile)!.props as any).highlight.$from.el).toBe(picker);
    expect(r.placeholderMap()["$picker"]).toBe(picker);
  });

  it("A REAL ID ALWAYS WINS over a placeholder of the same name", () => {
    // Otherwise an agent can name a new element after an id it read from the snapshot
    // and silently capture every binding written against the original.
    const r = runtime();
    r.beginTurn();
    const real = r.place(globe("$real"), AGENT);
    r.setLocal(real, "selections", ["REAL"]);

    r.beginTurn();
    expect(() => r.place(globe(real), AGENT)).toThrow(/collides with an existing element id/);
  });

  it("rejects the same placeholder name twice in one turn", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$dup", "first"), AGENT);
    // Last-write-wins would silently misdirect bindings written against the first.
    expect(() => r.place(note("$dup", "second"), AGENT)).toThrow(/already used this turn/);
  });

  it("clears placeholders between turns", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$a"), AGENT);
    expect(r.placeholderMap()["$a"]).toBeDefined();
    r.beginTurn();
    expect(r.placeholderMap()["$a"]).toBeUndefined();
  });

  it("leaves an unknown reference alone for resolve time to reject", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(globe("$g", { highlight: { $from: { el: "$nope", field: "selections" } } }), AGENT);
    expect((r.get(id)!.props as any).highlight.$from.el).toBe("$nope");
    expect(() => r.resolvedProps(id)).toThrow(/unknown element/);
  });
});
