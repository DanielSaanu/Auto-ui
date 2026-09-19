import { createSpace, type Principal } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime } from "@orrery/runtime";

export const DANZO: Principal = { kind: "user", id: "danzo" };
export const AGENT: Principal = { kind: "agent", id: "claude", onBehalfOf: "danzo" };

/** A runtime with the agent granted `role`. Defaults to the ordinary agent grant. */
export function runtime(role: "agent" | "editor" | "owner" | "viewer" = "agent") {
  const space = createSpace({ title: "t", owner: "danzo" });
  space.grants.push({ principal: AGENT, role });
  return new SpaceRuntime(space, { pack: corePack });
}

export const note = (name: string, text = "x", lifetime?: any) => ({
  name,
  block: "Note",
  props: { text },
  ...(lifetime ? { lifetime } : {}),
});

export const globe = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  block: "Choropleth",
  props: { fill: { query: { source: { registry: "w" }, select: ["a"] } }, ...extra },
  lifetime: { mode: "session" as const },
});

/** A serialised space with one promoted Note, for reopen tests. */
export function seededWire() {
  const r = runtime();
  r.beginTurn();
  const id = r.place(note("$n", "hi"), DANZO);
  r.promote(id, DANZO, { title: "kept", rows: [{ a: 1 }] });
  return JSON.parse(JSON.stringify(r.toJSON()));
}
