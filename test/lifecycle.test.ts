import { describe, it, expect } from "vitest";
import { createSpace, ulid } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime } from "@orrery/runtime";
import { queryKey } from "@orrery/query";
import { DANZO, AGENT, note, runtime } from "./helpers.js";

/** Plan §4.1, §4.2 — lifetimes, versions, freezing; plus id and key hygiene. */

describe("update", () => {
  it("validates, applies and bumps the version", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), AGENT);
    const el = r.update(id, { props: { text: "b" } }, DANZO);
    expect((el.props as any).text).toBe("b");
    expect(el.version).toBe(2);
  });

  it("rejects invalid props without mutating the element", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), AGENT);
    expect(() => r.update(id, { props: { text: 42 } }, DANZO)).toThrow(/invalid props/);
    expect((r.get(id)!.props as any).text).toBe("a");
    expect(r.get(id)!.version).toBe(1);
  });

  it("changing only the title leaves props alone", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), AGENT);
    r.update(id, { title: "titled" }, DANZO);
    expect((r.get(id)!.props as any).text).toBe("a");
  });

  it("carries lifetime, which is how an element becomes pinned", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), AGENT);
    r.update(id, { lifetime: { mode: "persistent", pinned: true }, title: "pinned" }, DANZO);
    expect(r.get(id)!.lifetime).toEqual({ mode: "persistent", pinned: true });
  });

  it("refuses to make an element persistent without a title", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "a"), AGENT);
    expect(() => r.update(id, { lifetime: { mode: "persistent" } }, DANZO)).toThrow(
      /requires a title/,
    );
  });
});

describe("frozen elements do not drift", () => {
  it("refuses a props change once frozen", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n", "original"), AGENT);
    r.promote(id, DANZO, { title: "pinned", rows: [{ v: "original" }] });
    expect(() => r.update(id, { props: { text: "CHANGED" } }, DANZO)).toThrow(/frozen/);
    expect((r.get(id)!.props as any).text).toBe("original");
  });

  it("still allows title and tags", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n"), AGENT);
    r.promote(id, DANZO, { title: "old", rows: [] });
    const el = r.update(id, { title: "new", tags: ["a"] }, DANZO);
    expect(el.title).toBe("new");
    expect(el.tags).toEqual(["a"]);
  });

  it("promote can pin through the public API", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$n"), AGENT);
    r.promote(id, DANZO, { title: "t", rows: [], pinned: true });
    expect(r.get(id)!.lifetime).toEqual({ mode: "persistent", pinned: true });
  });
});

describe("sweeps happen at different times", () => {
  it("endTurn removes only ephemeral elements", () => {
    const r = runtime();
    r.beginTurn();
    const eph = r.place(note("$e"), AGENT);
    const ses = r.place(note("$s", "s", { mode: "session" }), AGENT);
    const stubs = r.endTurn();
    expect(stubs.map((s) => s.id)).toEqual([eph]);
    expect(r.space.elements.map((e) => e.id)).toEqual([ses]);
  });

  it("endSession removes everything not persistent", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$s", "s", { mode: "session" }), AGENT);
    const keep = r.place(note("$p"), AGENT);
    r.promote(keep, DANZO, { title: "kept", rows: [] });
    r.endSession();
    expect(r.space.elements.map((e) => e.id)).toEqual([keep]);
  });

  it("an expiring element leaves a stub naming what it was", () => {
    const r = runtime();
    r.beginTurn();
    r.place(note("$e"), AGENT);
    const [stub] = r.endTurn();
    expect((stub!.props as any).block).toBe("Note");
  });
});

describe("remove", () => {
  it("deletes exactly one element even with duplicate ids", () => {
    const space = createSpace({ title: "t", owner: "danzo" });
    const r = new SpaceRuntime(space, { pack: corePack, genId: () => "el_SAME" });
    r.beginTurn();
    r.place(note("$a", "a"), DANZO);
    r.place(note("$b", "b"), DANZO);
    r.remove("el_SAME", DANZO);
    expect(r.space.elements).toHaveLength(1);
  });
});

describe("ulid is bounded for any rand source", () => {
  it.each([
    ["1", () => 1],
    ["0", () => 0],
    ["negative", () => -1],
    ["NaN", () => NaN],
  ])("produces a valid id when rand() returns %s", (_n, rand) => {
    const id = ulid(Date.now(), rand as () => number);
    expect(id).toHaveLength(26);
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("survives a nonsense timestamp", () => {
    for (const t of [NaN, -1, Infinity]) expect(ulid(t, () => 0.5)).toHaveLength(26);
  });
});

describe("queryKey isolation", () => {
  const q = { source: { registry: "w" }, select: ["a"] } as any;
  const ctx = { spaceId: "sp_1", packId: "core", packVersion: 1, resolverVersion: "1" };

  it("does not collide across extraKeyFields groupings", () => {
    expect(queryKey(q, ctx, ["a,b"])).not.toBe(queryKey(q, ctx, ["a", "b"]));
  });

  it("does not collide when an id contains a delimiter", () => {
    expect(queryKey(q, { ...ctx, spaceId: "sp|core" })).not.toBe(
      queryKey(q, { ...ctx, spaceId: "sp", packId: "|core" }),
    );
  });

  it("is stable across object key order", () => {
    const a = { source: { registry: "w" }, select: ["a"], limit: 5 } as any;
    const b = { limit: 5, select: ["a"], source: { registry: "w" } } as any;
    expect(queryKey(a, ctx)).toBe(queryKey(b, ctx));
  });

  it("separates spaces", () => {
    expect(queryKey(q, ctx)).not.toBe(queryKey(q, { ...ctx, spaceId: "sp_2" }));
  });
});
