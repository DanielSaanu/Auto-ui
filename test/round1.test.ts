import { describe, it, expect } from "vitest";
import { createSpace, ulid, type Principal } from "@orrery/protocol";
import { corePack, hasBareFigure } from "@orrery/packs-core";
import { queryKey } from "@orrery/query";
import { SpaceRuntime, OrreryError, can } from "@orrery/runtime";

/**
 * Regressions from QA round 1. Every test here failed before its fix; each names the
 * finding so a future change that reintroduces it says which review caught it.
 */

const DANZO: Principal = { kind: "user", id: "danzo" };
const AGENT: Principal = { kind: "agent", id: "claude", onBehalfOf: "danzo" };

function rt(grantAgent: "agent" | "editor" | "owner" = "agent") {
  const space = createSpace({ title: "t", owner: "danzo" });
  space.grants.push({ principal: AGENT, role: grantAgent });
  return new SpaceRuntime(space, { pack: corePack });
}

describe("R1 — figure validator: unicode numeric categories", () => {
  // \p{Nd} alone missed Nl/No; and testing ONLY the NFKC form missed Roman numerals,
  // because NFKC maps U+2169 to the letter "X" and destroys the numeric property.
  it.each([
    ["roman numeral", "chapter Ⅹ revenue grew"],
    ["roman sequence", "ⅠⅡ places"],
    ["suzhou", "count was 〡〢〣"],
    ["vulgar fraction", "grew ½ a point"],
    ["circled", "② place"],
    ["fullwidth", "４５０ million"],
  ])("rejects %s", (_n, s) => {
    expect(hasBareFigure(s)).toBe(true);
  });

  it("still accepts the lexicon after widening the class", () => {
    for (const s of ["the G7", "PM2.5 levels", "CO2", "EU27", "COVID-19", "{{f0}} people"]) {
      expect(hasBareFigure(s), s).toBe(false);
    }
  });
});

describe("R1 — access: agent rules are properties of the PRINCIPAL, not the role", () => {
  it("an agent granted 'editor' still cannot invoke", () => {
    const r = rt("editor");
    expect(can(r.space, AGENT, "invoke")).toBe(false);
    expect(can(r.space, DANZO, "invoke")).toBe(true);
  });

  it("an agent granted 'editor' still cannot remove someone else's element", () => {
    const r = rt("editor");
    r.beginTurn();
    const theirs = r.place({ name: "$u", block: "Note", props: { text: "user's" } }, DANZO);
    expect(() => r.remove(theirs, AGENT)).toThrow(/may not remove/);
  });

  it("an agent granted 'owner' still cannot administer", () => {
    const r = rt("owner");
    expect(can(r.space, AGENT, "admin")).toBe(false);
  });
});

describe("R1 — snapshot honesty", () => {
  it("does not claim hidden rows when nothing eligible was cut", () => {
    const r = rt();
    r.beginTurn();
    for (let i = 0; i < 3; i++)
      r.place({ name: `$e${i}`, block: "Note", props: { text: `e${i}` }, lifetime: { mode: "ephemeral" } }, AGENT);
    for (let i = 0; i < 3; i++)
      r.place({ name: `$s${i}`, block: "Note", props: { text: `s${i}` }, lifetime: { mode: "session" } }, AGENT);
    // Ephemeral elements were never snapshot candidates; counting them advertised rows
    // that find_elements could never return.
    expect(r.snapshot()).not.toMatch(/more \(use find_elements\)/);
  });

  it("keeps the element the user just touched when the cap bites", () => {
    const r = rt();
    r.beginTurn();
    for (let i = 0; i < 5; i++) {
      const id = r.place({ name: `$p${i}`, block: "Note", props: { text: `p${i}` } }, AGENT);
      r.promote(id, DANZO, { title: `pinned ${i}`, rows: [] });
    }
    const hot = r.place({ name: "$hot", block: "Note", props: { text: "hot" }, lifetime: { mode: "session" } }, AGENT);
    r.setLocal(hot, "row", 1);

    const snap = r.snapshot({ maxLines: 3 });
    // Listing all persistent elements first dropped exactly the thing being worked on.
    expect(snap).toContain(hot);
    expect(snap.split("\n")[0]).toContain(hot);
  });

  it("an explicitly pinned element outranks recency", () => {
    const r = rt();
    r.beginTurn();
    const pin = r.place({ name: "$pin", block: "Note", props: { text: "pin" } }, AGENT);
    r.promote(pin, DANZO, { title: "pinned", rows: [] });
    r.get(pin)!.lifetime = { mode: "persistent", pinned: true };

    const hot = r.place({ name: "$hot", block: "Note", props: { text: "hot" }, lifetime: { mode: "session" } }, AGENT);
    r.setLocal(hot, "row", 1);

    expect(r.snapshot().split("\n")[0]).toContain(pin);
  });
});

describe("R1 — resolveBindings hardening", () => {
  it("does not adopt a prototype from JSON-parsed data", () => {
    const r = rt();
    const out = r.resolveBindings(JSON.parse('{"__proto__":{"pwned":"yes"},"v":1}')) as any;
    expect(out.pwned).toBeUndefined();
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype);
    expect(({} as any).pwned).toBeUndefined(); // global was never at risk, but assert it
    expect(out.v).toBe(1);
  });

  it("passes non-plain objects through instead of flattening them", () => {
    const r = rt();
    const d = new Date(0);
    expect(r.resolveBindings({ when: d }).when).toBe(d);
  });

  it("rejects a too-deep local value instead of overflowing the stack", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "n" } }, AGENT);
    let deep: any = 1;
    for (let i = 0; i < 200; i++) deep = { deep };
    expect(() => r.setLocal(id, "row", deep)).toThrow(/nested deeper/);
  });
});

describe("R1 — frozen elements do not drift", () => {
  it("refuses a props change on a frozen element", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "original" } }, AGENT);
    r.promote(id, DANZO, { title: "pinned", rows: [{ v: "original" }] });

    expect(() => r.update(id, { props: { text: "CHANGED" } }, DANZO)).toThrow(/frozen/);
    expect((r.get(id)!.props as any).text).toBe("original");
  });

  it("still allows title and tags on a frozen element", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "x" } }, AGENT);
    r.promote(id, DANZO, { title: "old", rows: [] });
    const el = r.update(id, { title: "new", tags: ["a"] }, DANZO);
    expect(el.title).toBe("new");
    expect(el.tags).toEqual(["a"]);
  });
});

describe("R1 — reopening untrusted data", () => {
  const wellFormed = () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "hi" } }, AGENT);
    r.promote(id, DANZO, { title: "t", rows: [{ a: 1 }] });
    return JSON.parse(JSON.stringify(r.toJSON()));
  };

  it("round-trips a well-formed space", () => {
    const reopened = SpaceRuntime.fromJSON(wellFormed(), { pack: corePack });
    expect(reopened.space.elements).toHaveLength(1);
  });

  it("raises a controlled error for a missing lifetime, not a TypeError", () => {
    const data = wellFormed();
    delete data.elements[0].lifetime;
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(OrreryError);
    try {
      SpaceRuntime.fromJSON(data, { pack: corePack });
    } catch (e: any) {
      expect(e.code).toBe("corrupt-space");
      expect(e.message).toMatch(/lifetime/);
    }
  });

  it("rejects duplicate element ids", () => {
    const data = wellFormed();
    data.elements.push({ ...data.elements[0] });
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(/duplicate element ids/);
  });

  it("rejects props that do not match their block", () => {
    const data = wellFormed();
    data.elements[0].props = { text: 42 };
    expect(() => SpaceRuntime.fromJSON(data, { pack: corePack })).toThrow(/corrupt element/);
  });

  it("recomputes frozen.bytes rather than trusting the file", () => {
    const data = wellFormed();
    data.elements[0].frozen.bytes = 999999999;
    const reopened = SpaceRuntime.fromJSON(data, { pack: corePack });
    expect(reopened.space.elements[0]!.frozen!.bytes).toBeLessThan(100);
  });

  it("renders an unknown block as a stub instead of failing the whole reopen", () => {
    const data = wellFormed();
    data.elements[0].block = "future/Timeline";
    const reopened = SpaceRuntime.fromJSON(data, { pack: corePack });
    const el = reopened.space.elements[0]!;
    expect(el.block).toBe("core/Stub");
    expect((el.props as any).of).toBe("future/Timeline");
    expect((el.props as any).frozen).toEqual([{ a: 1 }]); // the data still shows
  });
});

describe("R1 — remove deletes exactly one element", () => {
  it("does not delete every element sharing an id", () => {
    const space = createSpace({ title: "t", owner: "danzo" });
    const r = new SpaceRuntime(space, { pack: corePack, genId: () => "el_SAME" });
    r.beginTurn();
    r.place({ name: "$a", block: "Note", props: { text: "a" } }, DANZO);
    r.place({ name: "$b", block: "Note", props: { text: "b" } }, DANZO);
    r.remove("el_SAME", DANZO);
    expect(r.space.elements).toHaveLength(1);
  });
});

describe("R1 — queryKey isolation", () => {
  const q = { source: { registry: "w" }, select: ["a"] } as any;
  const ctx = { spaceId: "sp_1", packId: "core", packVersion: 1, resolverVersion: "1" };

  it("does not collide across extraKeyFields groupings", () => {
    expect(queryKey(q, ctx, ["a,b"])).not.toBe(queryKey(q, ctx, ["a", "b"]));
  });

  it("does not collide when an id contains the delimiter", () => {
    const a = queryKey(q, { ...ctx, spaceId: "sp|core" }, []);
    const b = queryKey(q, { ...ctx, spaceId: "sp", packId: "|core" }, []);
    expect(a).not.toBe(b);
  });

  it("is stable across object key order", () => {
    const q1 = { source: { registry: "w" }, select: ["a"], limit: 5 } as any;
    const q2 = { limit: 5, select: ["a"], source: { registry: "w" } } as any;
    expect(queryKey(q1, ctx)).toBe(queryKey(q2, ctx));
  });

  it("separates spaces", () => {
    expect(queryKey(q, ctx)).not.toBe(queryKey(q, { ...ctx, spaceId: "sp_2" }));
  });
});

describe("R1 — ulid is bounded for any rand source", () => {
  it.each([
    ["rand() === 1", () => 1],
    ["rand() === 0", () => 0],
    ["rand() negative", () => -1],
    ["rand() NaN", () => NaN],
  ])("produces a valid 26-char id when %s", (_n, rand) => {
    const id = ulid(Date.now(), rand as () => number);
    expect(id).toHaveLength(26);
    expect(id).not.toContain("undefined");
    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("survives a nonsense timestamp", () => {
    for (const t of [NaN, -1, Infinity]) {
      expect(ulid(t, () => 0.5)).toHaveLength(26);
    }
  });
});

describe("R1 — placeholders are resolved and turn-scoped", () => {
  it("rewrites a placeholder reference to the assigned id", () => {
    const r = rt();
    r.beginTurn();
    const picker = r.place(
      {
        name: "$picker",
        block: "Choropleth",
        props: { fill: { query: { source: { registry: "w" }, select: ["a"] } } },
        lifetime: { mode: "session" },
      },
      AGENT,
    );
    const tile = r.place(
      {
        name: "$tile",
        block: "Choropleth",
        props: {
          fill: { query: { source: { registry: "w" }, select: ["a"] } },
          // The agent cannot know the server's id, so it refers to its own placeholder.
          highlight: { $from: { el: "$picker", field: "selections" } },
        },
        lifetime: { mode: "session" },
      },
      AGENT,
    );
    expect((r.get(tile)!.props as any).highlight.$from.el).toBe(picker);
    expect(r.placeholderMap()["$picker"]).toBe(picker);

    r.setLocal(picker, "selections", ["BRA"]);
    expect((r.resolvedProps(tile) as any).highlight).toEqual(["BRA"]);
  });

  it("clears placeholders between turns", () => {
    const r = rt();
    r.beginTurn();
    r.place({ name: "$a", block: "Note", props: { text: "a" } }, AGENT);
    expect(r.placeholderMap()["$a"]).toBeDefined();
    r.beginTurn();
    expect(r.placeholderMap()["$a"]).toBeUndefined();
  });
});

describe("R1 — update() coverage", () => {
  it("validates, applies and bumps the version", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "a" } }, AGENT);
    const el = r.update(id, { props: { text: "b" } }, DANZO);
    expect((el.props as any).text).toBe("b");
    expect(el.version).toBe(2);
  });

  it("rejects invalid props without mutating the element", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "a" } }, AGENT);
    expect(() => r.update(id, { props: { text: 42 } }, DANZO)).toThrow(/invalid props/);
    expect((r.get(id)!.props as any).text).toBe("a");
    expect(r.get(id)!.version).toBe(1);
  });

  it("changing only the title leaves props alone", () => {
    const r = rt();
    r.beginTurn();
    const id = r.place({ name: "$n", block: "Note", props: { text: "a" } }, AGENT);
    r.update(id, { title: "titled" }, DANZO);
    expect((r.get(id)!.props as any).text).toBe("a");
  });
});

describe("R1 — ephemeral and session sweep at different times", () => {
  it("endTurn removes only ephemeral elements", () => {
    const r = rt();
    r.beginTurn();
    const eph = r.place({ name: "$e", block: "Note", props: { text: "e" } }, AGENT);
    const ses = r.place({ name: "$s", block: "Note", props: { text: "s" }, lifetime: { mode: "session" } }, AGENT);

    const stubs = r.endTurn();

    expect(stubs.map((s) => s.id)).toEqual([eph]);
    expect(r.space.elements.map((e) => e.id)).toEqual([ses]);
  });

  it("endSession removes everything not persistent", () => {
    const r = rt();
    r.beginTurn();
    r.place({ name: "$s", block: "Note", props: { text: "s" }, lifetime: { mode: "session" } }, AGENT);
    const keep = r.place({ name: "$p", block: "Note", props: { text: "p" } }, AGENT);
    r.promote(keep, DANZO, { title: "kept", rows: [] });

    r.endSession();
    expect(r.space.elements.map((e) => e.id)).toEqual([keep]);
  });
});
