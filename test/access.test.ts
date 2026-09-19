import { describe, it, expect } from "vitest";
import { createSpace } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime, can } from "@orrery/runtime";
import { DANZO, AGENT, note, runtime } from "./helpers.js";

/** Plan §4.10 — who may write to a space. */

describe("agent restrictions are properties of the principal, not the grant", () => {
  // Gating these on role alone meant a grant of `editor` to an agent handed it both.
  it.each(["agent", "editor", "owner"] as const)(
    "an agent granted %s still cannot invoke",
    (role) => {
      expect(can(runtime(role).space, AGENT, "invoke")).toBe(false);
    },
  );

  it.each(["agent", "editor", "owner"] as const)(
    "an agent granted %s still cannot administer",
    (role) => {
      expect(can(runtime(role).space, AGENT, "admin")).toBe(false);
    },
  );

  it("an agent granted editor still cannot remove someone else's element", () => {
    const r = runtime("editor");
    r.beginTurn();
    const theirs = r.place(note("$u", "user's"), DANZO);
    expect(() => r.remove(theirs, AGENT)).toThrow(/may not remove/);
  });

  it("an agent may remove what it placed", () => {
    const r = runtime();
    r.beginTurn();
    const mine = r.place(note("$a", "agent's"), AGENT);
    expect(() => r.remove(mine, AGENT)).not.toThrow();
  });
});

describe("users retain their own rights", () => {
  it("the owner may invoke and administer", () => {
    const r = runtime();
    expect(can(r.space, DANZO, "invoke")).toBe(true);
    expect(can(r.space, DANZO, "admin")).toBe(true);
  });

  it("an ungranted principal can do nothing", () => {
    const r = runtime();
    const stranger = { kind: "user", id: "nobody" } as const;
    for (const action of ["read", "write", "remove", "promote", "invoke", "admin"] as const) {
      expect(can(r.space, stranger, action), action).toBe(false);
    }
  });
});

describe("provenance", () => {
  it("records who placed an element, and an agent records who it acted for", () => {
    const r = runtime();
    r.beginTurn();
    const id = r.place(note("$a"), AGENT);
    expect(r.get(id)!.origin.by).toEqual(AGENT);
    expect((r.get(id)!.origin.by as any).onBehalfOf).toBe("danzo");
  });
});

describe("grants must be unambiguous", () => {
  it("rejects two grants for the same principal on reopen", () => {
    // First-match-wins would make the effective role depend on array order.
    const space = createSpace({ title: "t", owner: "danzo" });
    space.grants.push({ principal: AGENT, role: "agent" });
    space.grants.push({ principal: AGENT, role: "owner" });
    const wire = JSON.parse(JSON.stringify(space));
    expect(() => SpaceRuntime.fromJSON(wire, { pack: corePack })).toThrow(
      /duplicate grants for the same principal/,
    );
  });
});
