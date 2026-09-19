import { describe, it, expect } from "vitest";
import { DANZO, AGENT, note, globe, runtime } from "./helpers.js";

/** Plan §4.6 — what the agent reads at the start of each turn. */

describe("the snapshot is regenerated, never appended", () => {
  it("replaces a value rather than listing both", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$p"), AGENT);

    r.setLocal(picker, "selections", ["BRA"]);
    const first = r.snapshot();
    r.setLocal(picker, "selections", ["CHN"]);
    const second = r.snapshot();

    expect(first).toContain("selections=[BRA]");
    expect(second).toContain("selections=[CHN]");
    // An append-only log makes the model infer that the last entry wins, and goes stale
    // when the context window truncates it.
    expect(second).not.toContain("BRA");
    expect(second.split("\n")).toHaveLength(first.split("\n").length);
  });

  it("shows a binding's source element", () => {
    const r = runtime();
    r.beginTurn();
    const picker = r.place(globe("$p"), AGENT);
    r.place(globe("$b", { highlight: { $from: { el: "$p", field: "selections" } } }), AGENT);
    expect(r.snapshot()).toContain(`highlight←${picker}`);
  });
});

describe("ordering", () => {
  it("puts what the user touched ahead of what was merely placed", () => {
    const r = runtime();
    r.beginTurn();
    const a = r.place(note("$a", "a", { mode: "session" }), AGENT);
    const b = r.place(note("$b", "b", { mode: "session" }), AGENT);
    const c = r.place(note("$c", "c", { mode: "session" }), AGENT);
    r.setLocal(a, "row", 1); // touch the OLDEST

    const lines = r.snapshot().split("\n");
    expect(lines[0]).toContain(a);
    expect(lines[1]).toContain(c);
    expect(lines[2]).toContain(b);
  });

  it("keeps the touched element when the cap bites", () => {
    const r = runtime();
    r.beginTurn();
    for (let i = 0; i < 5; i++) {
      const id = r.place(note(`$p${i}`, `p${i}`), AGENT);
      r.promote(id, DANZO, { title: `pinned ${i}`, rows: [] });
    }
    const hot = r.place(note("$hot", "hot", { mode: "session" }), AGENT);
    r.setLocal(hot, "row", 1);

    const snap = r.snapshot({ maxLines: 3 });
    expect(snap.split("\n")[0]).toContain(hot);
  });

  it("an explicitly pinned element outranks recency", () => {
    const r = runtime();
    r.beginTurn();
    const pin = r.place(note("$pin", "pin"), AGENT);
    // Set through the public API — reaching into the element to set `pinned` would be
    // asserting on a fixture rather than on behaviour.
    r.promote(pin, DANZO, { title: "pinned", rows: [], pinned: true });

    const hot = r.place(note("$hot", "hot", { mode: "session" }), AGENT);
    r.setLocal(hot, "row", 1);

    expect(r.snapshot().split("\n")[0]).toContain(pin);
  });
});

describe("the hidden count is honest", () => {
  it("claims nothing when nothing eligible was cut", () => {
    const r = runtime();
    r.beginTurn();
    for (let i = 0; i < 3; i++) r.place(note(`$e${i}`, `e${i}`), AGENT); // ephemeral
    for (let i = 0; i < 3; i++) r.place(note(`$s${i}`, `s${i}`, { mode: "session" }), AGENT);
    // Ephemeral elements were never candidates; counting them advertised rows that
    // find_elements could never return.
    expect(r.snapshot()).not.toMatch(/more \(use find_elements\)/);
  });

  it("reports what it cut", () => {
    const r = runtime();
    r.beginTurn();
    for (let i = 0; i < 20; i++) r.place(note(`$n${i}`, `n${i}`, { mode: "session" }), AGENT);
    const snap = r.snapshot({ maxLines: 5, recentSession: 5 });
    expect(snap.split("\n")).toHaveLength(6);
    expect(snap).toMatch(/… 15 more \(use find_elements\)/);
  });
});
