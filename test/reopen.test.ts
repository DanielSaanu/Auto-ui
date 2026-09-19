import { describe, it, expect } from "vitest";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime, OrreryError, STUB_BLOCK } from "@orrery/runtime";
import { DANZO, AGENT, note, globe, runtime, seededWire } from "./helpers.js";

/**
 * Plan §4.2, §2.5 — reopening a stored space.
 *
 * The input is untrusted: it came off a disk or a wire, and the TypeScript types that
 * described it are gone by then.
 */

describe("well-formed reopen", () => {
  it("round-trips", () => {
    const r = SpaceRuntime.fromJSON(seededWire(), { pack: corePack });
    expect(r.space.elements).toHaveLength(1);
    expect(r.space.elements[0]!.frozen!.rows).toEqual([{ a: 1 }]);
  });
});

describe("corrupt input produces controlled errors", () => {
  it.each([
    ["missing lifetime", (d: any) => delete d.elements[0].lifetime, /lifetime/],
    ["version 0", (d: any) => (d.elements[0].version = 0), /version/],
    ["duplicate ids", (d: any) => d.elements.push({ ...d.elements[0] }), /duplicate element ids/],
    ["unknown top-level key", (d: any) => (d.surprise = 1), /./],
  ])("%s", (_name, corrupt, match) => {
    const data = seededWire();
    corrupt(data);
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(OrreryError);
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(match);
  });

  it("rejects props that do not match their block", () => {
    const data = seededWire();
    data.elements[0].props = { text: 42 };
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(/corrupt element/);
  });

  it("rejects a binding whose target is not in the space", () => {
    // Shape alone parses; the reference is what is broken, and it should be named here
    // rather than surfacing much later as a render error on one element.
    const r = runtime();
    r.beginTurn();
    const keep = r.place(globe("$a"), AGENT);
    const gone = r.place(globe("$b", { highlight: { $from: { el: "$a", field: "selections" } } }), AGENT);
    r.promote(gone, DANZO, { title: "bound", rows: [] });
    const wire = JSON.parse(JSON.stringify(r.toJSON()));
    wire.elements = wire.elements.filter((e: any) => e.id !== keep);

    expect(() => SpaceRuntime.fromJSON(wire, { pack: corePack })).toThrow(/dangling-binding|binds to unknown/);
  });

  it("recomputes frozen.bytes rather than trusting the file", () => {
    const data = seededWire();
    data.elements[0].frozen.bytes = 999999999;
    const r = SpaceRuntime.fromJSON(data, { pack: corePack });
    expect(r.space.elements[0]!.frozen!.bytes).toBeLessThan(100);
  });
});

describe("a missing pack degrades to a stub", () => {
  it("names the block it could not draw, and keeps the data", () => {
    const data = seededWire();
    data.elements[0].block = "future/Timeline";
    const r = SpaceRuntime.fromJSON(data, { pack: corePack });
    const el = r.space.elements[0]!;
    expect(el.block).toBe(STUB_BLOCK);
    expect((el.props as any).of).toBe("future/Timeline");
    expect((el.props as any).frozen).toEqual([{ a: 1 }]);
  });

  it("SURVIVES REPEATED REOPENS without losing the block it names", () => {
    // Re-stubbing a stub overwrote `of` with "core/Stub", destroying the only record of
    // which pack the element needs — so it could never be restored once the pack existed.
    const data = seededWire();
    data.elements[0].block = "future/Timeline";

    let r = SpaceRuntime.fromJSON(data, { pack: corePack });
    for (let i = 0; i < 3; i++) {
      r = SpaceRuntime.fromJSON(JSON.parse(JSON.stringify(r.toJSON())), { pack: corePack });
    }
    expect((r.space.elements[0]!.props as any).of).toBe("future/Timeline");
    expect(r.space.elements[0]!.frozen!.rows).toEqual([{ a: 1 }]);
  });

  it("the stub block is registered, so its props are validated like any other", () => {
    expect(STUB_BLOCK in corePack.blocks).toBe(true);
    const schema = corePack.blocks[STUB_BLOCK]!.props;
    expect(schema.safeParse({ of: "x", title: null }).success).toBe(true);
    expect(schema.safeParse({ of: "", title: null }).success).toBe(false);
  });
});
