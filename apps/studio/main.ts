/**
 * A0 in the browser — the binding loop you can actually click (plan §8.3).
 *
 * The `<select>` stands in for the map, exactly as A0 specifies. There is no model, no
 * network and no d3 here: the point is that selecting a country updates a bound tile for
 * free, the stored spec never moves, and the whole space survives being closed and reopened.
 */
import { createSpace, type Principal, type Space } from "@orrery/protocol";
import { corePack } from "@orrery/packs-core";
import { SpaceRuntime } from "@orrery/runtime";

const DANZO: Principal = { kind: "user", id: "danzo" };
const AGENT: Principal = { kind: "agent", id: "claude", onBehalfOf: "danzo" };

/** Fixture data — A0 has no resolver, so the numbers are hardcoded on purpose. */
const POP: Record<string, { name: string; value: number }> = {
  USA: { name: "United States", value: 334_914_895 },
  BRA: { name: "Brazil", value: 216_422_446 },
  CHN: { name: "China", value: 1_410_710_000 },
  NGA: { name: "Nigeria", value: 223_804_632 },
  IND: { name: "India", value: 1_428_627_663 },
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const picker = $<HTMLSelectElement>("picker");
const tileValue = $("tileValue");
const boundTo = $("boundto");
const specEl = $("spec");
const snapEl = $("snapshot");
const logEl = $("log");
const statusEl = $("status");
const callsEl = $("calls");
const pinBtn = $<HTMLButtonElement>("pin");
const reopenBtn = $<HTMLButtonElement>("reopen");
const resetBtn = $<HTMLButtonElement>("reset");

let rt: SpaceRuntime;
let pickerId = "";
let tileId = "";
let lines: string[] = [];

function log(msg: string, cls = "") {
  lines.unshift(cls ? `<span class="${cls}">${msg}</span>` : msg);
  logEl.innerHTML = lines.slice(0, 14).join("\n");
}

function build() {
  const space = createSpace({ title: "A0", owner: "danzo" });
  space.grants.push({ principal: AGENT, role: "agent" });
  rt = new SpaceRuntime(space, { pack: corePack });
  rt.beginTurn();

  // The agent places two elements in one turn. The tile refers to the picker by the
  // agent's own placeholder name, because it cannot know the id the server will assign.
  pickerId = rt.place(
    {
      name: "$picker",
      block: "Choropleth",
      props: {
        fill: {
          query: {
            source: { registry: "worldbank" },
            select: ["SP.POP.TOTL"],
            entities: { group: "countries" },
          },
        },
        focus: { iso3: "USA" },
      },
      lifetime: { mode: "session" },
    },
    AGENT,
  );

  tileId = rt.place(
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
                entities: { ids: [{ $from: { el: "$picker", field: "selection" } }] },
              },
            },
          },
        ],
      },
      lifetime: { mode: "session" },
    },
    AGENT,
  );

  lines = [];
  log(`agent placed 2 elements; $picker → ${pickerId.slice(0, 12)}…`);
  reopenBtn.disabled = true;
  pinBtn.disabled = false;
  statusEl.textContent = "Pick a country. The tile follows the selection through a binding.";
}

function boundEntity(): string | undefined {
  const resolved = rt.resolvedProps(tileId) as any;
  return resolved.group[0].data.query.entities.ids[0];
}

function render() {
  const iso = boundEntity();
  const known = iso && POP[iso];
  tileValue.textContent = known ? known.value.toLocaleString() : "—";
  boundTo.textContent = iso ? `· ${iso}` : "· nothing selected";

  // The SPEC — what is actually stored. It still holds the binding, not a value.
  const spec = rt.get(tileId)!;
  specEl.textContent = JSON.stringify(
    { block: spec.block, version: spec.version, lifetime: spec.lifetime, props: spec.props },
    null,
    2,
  );

  snapEl.textContent = rt.snapshot() || "(empty)";
  callsEl.textContent = "0 model calls";
}

picker.addEventListener("change", () => {
  const iso = picker.value;
  rt.setLocal(pickerId, "selection", iso);      // renderer-local: 0 tokens, 0 network
  const before = rt.get(tileId)!.version;
  render();
  log(`select ${iso} → tile shows ${POP[iso]!.value.toLocaleString()} · spec version still ${before}`);
});

pinBtn.addEventListener("click", () => {
  const iso = boundEntity();
  if (!iso) {
    statusEl.textContent = "Pick a country first — an unpinned binding has nothing to freeze.";
    return;
  }
  rt.promote(tileId, DANZO, {
    title: `Population of ${POP[iso]!.name}`,
    rows: [{ entity: iso, year: 2023, value: POP[iso]!.value }],
    receipts: [
      {
        source: "worldbank",
        measure: "SP.POP.TOTL",
        units: "people",
        resolvedYear: 2023,
        licence: { spdx: "CC-BY-4.0", attribution: "World Bank" },
        fetchedAt: new Date().toISOString(),
        by: DANZO,
      },
    ],
  });
  pinBtn.disabled = true;
  reopenBtn.disabled = false;
  render();
  log(`pinned — values frozen INTO the element (${rt.get(tileId)!.frozen!.bytes} bytes)`, "good");
  statusEl.textContent = "Frozen. Now close and reopen — it should come back identical.";
});

reopenBtn.addEventListener("click", () => {
  const wire = JSON.stringify(rt.toJSON());
  const reopened = SpaceRuntime.fromJSON(JSON.parse(wire) as Space, { pack: corePack });
  const stubs = reopened.endSession();      // the unpinned picker expires
  rt = reopened;

  render();
  const frozen = rt.get(tileId)!.frozen!;
  log(`reopened from ${wire.length} bytes of JSON`, "good");
  log(`still here: ${rt.get(tileId)!.title} → ${JSON.stringify(frozen.rows)}`, "good");
  log(`expired to a stub, not vanished: ${(stubs[0]!.props as any).block}`, "warn");
  statusEl.textContent =
    "Reopened. The tile renders from data it owns; the unpinned element left a labelled stub.";
  picker.disabled = true;
  reopenBtn.disabled = true;
});

resetBtn.addEventListener("click", () => {
  picker.disabled = false;
  picker.value = "";
  build();
  render();
});

// ── boot ──────────────────────────────────────────────────────────────────────
picker.innerHTML =
  `<option value="" disabled selected>choose…</option>` +
  Object.entries(POP)
    .map(([iso, { name }]) => `<option value="${iso}">${name} (${iso})</option>`)
    .join("");

build();
render();
