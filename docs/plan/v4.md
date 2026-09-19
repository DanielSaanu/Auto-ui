# Orrery — the plan
*Working name. "Auto-UI" and "A2UI" are indistinguishable spoken aloud; pick something else early, it's free now.*

---

## 1. The idea

A chat surface where the model answers in **interface**, not just prose. Ask for America and
you get a globe you can spin. Ask it to sort some data and you get a real table. Ask how two
things compare and you get a chart that shares the app's palette.

The model does not write UI code. It **selects and parameterises** from a fixed vocabulary of
blocks and emits ~250 tokens of JSON. The renderer turns that into the themed, interactive
thing. This repo is that vocabulary, the theme it's drawn in, and the data plumbing that
fills it — plus one reference renderer you're meant to throw away.

**Why a fixed vocabulary, when models write good React?** Four reasons that don't weaken as
models improve:

1. **Persistence.** A 250-token spec sits in a transcript and re-renders in two years. Stored
   generated React is a rot-and-security liability the day you persist it. If blocks live in
   chat history, a closed vocabulary isn't a limitation — it's the only serialisable option.
2. **Determinism.** The same question twice gives the same interface.
3. **Theming by construction.** Generated code uses your tokens *most* of the time. A catalog
   uses them 100% of the time.
4. **Free interaction.** Spinning the globe is 0 tokens and 0 network, because the behaviour
   is compiled in rather than generated.

**The ceiling is real and gets an explicit exit.** "Show me the electoral college as a
cartogram with a scrub bar" has no block. Degrading that silently to a paragraph is the worst
outcome — the user never learns the system couldn't. So the catalog has a `Custom` block that
hands off to code execution, announces itself, and is **never persisted** (§4.4). A closed
catalog with a visible escape hatch beats either pure position.

**What this repo honestly is:** an integration and specification layer. Glue, done well. That
is not a consolation prize — it is the only thing that delivers the actual ask (*easy, cheap,
consistent, themed*), and nobody has shipped a permissively-licensed block pack where a chart,
a table and a globe look like one designed product in light and dark with the licensing sorted.

---

## 2. What already exists — don't rebuild it

Verified September 2026.

| Project | License | Owns |
|---|---|---|
| **Vercel `json-render`** v0.21.0, 16.4k★ | Apache-2.0 | Element tree, registry, RFC-6902 patch streaming, 12+ renderers (React, Vue, Svelte, Solid, RN, Ink, PDF, R3F). **`catalog.prompt()` generates the system prompt from schemas.** |
| **Google A2UI** v0.9.1 | Apache-2.0 | Wire standard **+ a client-held catalog concept**. 15 chrome components, zero viz. |
| **AntV `GPT-Vis`** | MIT | 26 LLM-targeted chart types — the whole quantitative *and* relational tier. Streaming, fault-tolerant partial data, 3 themes. |
| **MCP Apps** (SEP-1865) | — | Host↔server UI, incl. standardised CSS custom properties for host theming. |

**So:** no element tree, no prompt generator, no charts or diagrams from scratch, and no
novelty claim on declarative UI specs — that pattern is published (Vega-Lite, NL4DV) and
data-by-reference is written up in the MCP literature (arXiv 2510.05968, MCP discussion #930).

What's left unoccupied is narrower and sufficient: **a spatial block an LLM can drive**, **a
data layer that hands the model a digest instead of rows**, and **the taste and compliance
work** — prop design, theming across substrates, licensing. Not a moat. Enough to build.

---

## 3. How it works

```
 user types ──▶ /api/chat ──▶ Claude (Sonnet 5)
                                │
                  phase 1: text streams back immediately  ──▶ chat bubble
                                │   (qualitative only, NO figures — see §3.1)
                  phase 2: tool_use `render_blocks`       ──▶ zod validate
                                                              │
                                                    mount blocks inline
                                                              │
 user drags / taps ──────────────────────────────────────────▶ renderer-local state
                                                              │   0 model calls
                                              data refs re-resolve via /api/resolve
                                                              │
                                     one replaced [ui state] line in the transcript
                                                              │
 next question ──▶ model sees current UI state ──▶ digest() ──▶ accurate narration
```

Three interaction tiers. **Local** (spin, sort, hover) is the default and costs nothing.
**Refetch** re-resolves a data reference. **Escalate** goes back to the model, and blocks must
declare it — a model round trip per click is fatal to both cost and latency.

### 3.1 The rule that makes it honest

**Phase-1 narration carries no figures.** Narration streams before any tool returns, so any
number in it comes from parametric memory. Early drafts of this plan opened with the model
saying *"342M people, $29.2T GDP"* before calling anything — the real 2024 figure is
340,003,797, so it was both hallucinated and wrong, sitting directly above tiles that resolve
the true values. A wrong sentence next to a correct chart is worse than a wrong sentence
alone, because the chart lends it credibility.

Numbers appear only in blocks and in `digest()` output. Narration says *"pulling population
and GDP now"*, not the figures.

### 3.2 The trace this all exists to serve

```jsonc
// USER: "show me america"
// phase 1 (~400ms, text): "Here's the United States — pulling population and GDP now.
//                          Drag to spin it, tap any country to compare."
// phase 2 (~250 tokens):
{ "v": 1, "blocks": [
  { "id": "b1", "type": "Choropleth",
    "projection": "orthographic",           // a real, draggable globe — see §5
    "focus":     { "iso3": "USA" },         // camera; also seeds selection at mount
    "highlight": ["USA"],                   // STROKE/halo channel
    "fill": { "source": "worldbank:SP.POP.TOTL",
              "year": "mry",                // most recent COMMON year, not per-country
              "entities": "countries",      // = World Bank region.id !== 'NA'
              "scale": "log",               // population spans 9 orders of magnitude
              "legend": true } },           // CAP channel — orthogonal to highlight
  { "id": "b2", "type": "Metric", "group": [
    { "label": "Population",
      "ref": { "source": "worldbank:SP.POP.TOTL",
               "entity": { "$from": { "block": "b1", "field": "selection" } },
               "year": "mry" } },
    { "label": "GDP",
      "ref": { "source": "worldbank:NY.GDP.MKTP.CD", "entity": { "$from": {...} }, "year": "mry" } } ] } ] }
```

- **drag** → rotates. 0 model calls, 0 network.
- **tap Brazil** → `b2` re-resolves through the binding. 0 model calls. The transcript's single
  `[ui state]` line is *replaced*: `b1: selection=BRA, camera=USA; b2: entity=BRA`.
- **"why is it so far behind?"** → `digest()` on constant-dollar and per-capita series →
  accurate narration. Two model round trips, ~3–5s. Stated plainly rather than hidden.

Four props here exist because the obvious version is broken, each verified against the live API:

| Prop | Why it must exist |
|---|---|
| `entities:"countries"` | Without it, World Bank `/country/all` returns **aggregates** — World (8.14B), IDA & IBRD total, Low & middle income — as the top ten. Every real country lands in the bottom 17% of the ramp. **Flat monochrome ball.** |
| `scale:"log"` | Population spans nine orders of magnitude; linear renders everything but China and India identically. |
| `year:"mry"` | World Bank's `mrv` is per-country: US 2024, Brazil 2023, Eritrea 2011. That silently mixes a decade across one unlabelled legend, and breaks both **determinism** and **persistence** — a persisted spec re-renders with different numbers. `mry` = most recent *common* year. The resolver always returns `{resolvedYear, yearSpan, mixed}` and the renderer must surface it. |
| `highlight` vs `fill` | **They are orthogonal channels**: `highlight` is stroke/halo, `fill` is the polygon cap. No precedence rule needed. Without this sentence the hero frame is unrenderable — either the US is the one country whose value you can't read, or "show me America" doesn't light America. |

---

## 4. The catalog

This is the artifact. Everything else is scaffolding around it.

### 4.1 Blocks (slice 1 = 6)

| Block | Required | Optional | Local interactions |
|---|---|---|---|
| **Choropleth** | `fill` | `projection` `orthographic\|natural\|mercator`, `focus`, `highlight[]`, `zoom` | drag-rotate, tap-select, hover |
| **Metric** | `group[]` (`label` + `value\|ref`) | `emphasis` `primary\|muted`, `delta`, `sparkline` | — |
| **Prose** | `text` | `tone` `body\|note\|warning` | — |
| **Table** | `rows` \| `ref` | `columns[]`, `sort`, `groupBy`, `caption` | **sort, filter, paginate** |
| **Chart** | `kind`, `data` \| `ref` | `x`, `y`, `series`, `scale`, `stack`, `legend` | hover, legend toggle |
| **Stack** | `children[]` | `direction` `v\|h`, `gap` `s\|m\|l` | — |

**Deferred, and say so out loud:** diagrams/relational (`Tree`, `Flow`, `Network` — wrap
GPT-Vis, don't build), inputs (`Form`, `Slider` — app chrome, the commodity), `Map` with real
tiles (needs a geocoder), sub-national geography (world-atlas contains only
`['countries','land']`, so `"US-TX"` cannot render and `"Bay Area"` needs that geocoder).

### 4.2 Prop rules — written as they'll actually be enforced

1. **Data-shaped, not pixel-shaped.** No `width`, `margin`, `className`. Colour only via
   semantic enums. *Admitted exception:* `align` on table columns — the model knows a column
   is numeric before the theme does.
2. **Flat, except per-column and per-series descriptors.** Tables are irreducibly configured;
   that's why TanStack Table is headless.
3. **Enums over free strings.** *Admitted exception:* `iso3` codes, validated against the geo
   table rather than an enum.
4. **≤8 props, ≤3 required.** `Table` is exempt and documented.
5. **Everything optional renders.** A half-streamed spec must draw something.
6. **`settled` signal.** Layout-computed blocks skeleton until props stop changing, then lay
   out once. Kills streaming jitter as a class.
7. **Mobile behaviour is declared per block**, now at 6 blocks, not later at 24.

### 4.3 `actions.ts` — the part everyone forgets

**Bindings.** `{"$from": {"block": "b1", "field": "selection"}}` — a closed object, not a
dot-path string (a parsed string is a mini-expression-language, and templating a model-supplied
value into a request URL is exactly the SSRF hole §7 forbids). `field` is an enum. The client
resolves it and **validates the substituted value against the geo table** before it reaches
`/api/resolve`. `focus` seeds `selection` at mount, so the first frame isn't two empty tiles
under narration promising figures.

**State echo is a snapshot, not a log.** One `[ui state]` line per turn, *replaced* each time,
regenerated from live renderer state. An append-only log makes the model infer that the last
`selected` wins, and goes silently stale when the window truncates. The vocabulary lives here,
in the contract — not in the renderer, or it leaks into the disposable half.

**Patch vs. local state.** Turn N+1 patches apply to **spec fields only**; `selection` and
camera are renderer-local and survive. Without this rule, a follow-up turn silently reverts
what the user just clicked — and that's the core demo.

**Resolution receipts.** Every resolved `ref` carries `{resolvedYear, units, source,
attribution}`. World Bank is CC-BY and that attribution must propagate to every rendered
chart; if there's no slot on day one it's a retrofit across every renderer later.

### 4.4 `Custom` — the escape hatch

A block type (what the *model emits*), not an action (what the *user does*). It is **visible**
(labelled as generated), **sandboxed**, **size-capped**, and **never persisted** — so reason 1
narrows honestly to "the catalog subset persists; escapes don't." The genuinely expensive part
isn't the enum variant, it's the renderer security boundary, so it gets its own step (§8, B4)
rather than being described as free.

### 4.5 Tokens

Source of truth is `tokens.json` (DTCG-shaped), **not a CSS file** — because CSS custom
properties never reach a canvas `fillStyle` or a WebGL uniform. Emitters produce `theme.css`,
`tokens.ts`, and a GPT-Vis/G2 theme object. Ramps authored in OKLCH so light and dark derive
from one definition; separate categorical data palette, contrast-validated in **both** themes.

**The theming claim, decided rather than left open:** *one token source generates our CSS
variables, a matching G2 theme object, and a validated palette* — about a week. **"A G2 canvas
chart and a WebGL globe look pixel-identical" is not deliverable** and the plan doesn't claim
it: canvas has no CSS cascade, G2 re-derives ramps through d3-color in sRGB (voiding OKLCH
evenness exactly at the choropleth legend), and three.js round-trips sRGB→linear under a lit
material so the drift varies with the lighting term. What breaks first and visibly is the
**dark-mode toggle** — CSS flips instantly while canvas and WebGL lag, each via a different
API. Budget a runtime theme-push on `matchMedia`. Staying on SVG/DOM for slice 1 (§5) makes
this mostly moot, which is a further argument for it.

---

## 5. The spatial block — and the decision that unlocks the schedule

**Build the globe with `d3.geoOrthographic`, not WebGL.** A drag handler updating
`.rotate([λ, φ])` gives a genuinely spinnable globe from the *same* `d3-geo` and the *same*
38 KB topojson already loaded — about 30 lines, canvas-backed, 60fps on a phone at 177
polygons.

Earlier drafts framed this as *flat 2D now, WebGL globe later*, which deferred the brief's one
concrete image to week five and made the proof-of-life recording a static rectangle. The real
choice was never 2D-vs-globe.gl; it was **flat-vs-orthographic, and orthographic is nearly
free.** `globe.gl` becomes an optional upgrade, or never.

That single decision deletes from the critical path: a ~559 KB gz / 2.0 MB parsed bundle;
`h3-js` (213 KB, for a hexbin layer we never use); a static `three/webgpu` import (2.28 MB)
whose tree-shaking is a coin flip; three copies of three.js (globe.gl pins it, three-globe
peers it, json-render ships an R3F renderer) failing as silent `instanceof` errors; and the
fact that **`globe.gl` reads `window.THREE` at module scope and therefore throws in Node**,
which would have forced `dynamic(ssr:false)` and kept the globe out of the server-streamed
paint entirely.

**Measured sizes** (esbuild + gzip -9, because bundlephobia reports a broken 709 B for
`d3-geo`): `d3-geo` alone **14.7 KB gz**; the realistic day-1 set (`d3-geo` +
`topojson-client` + `d3-scale` + `d3-scale-chromatic`) **17.8 KB gz**; plus `world-atlas`
110m at **38.4 KB gz**. So **~56 KB vs ~600 KB**.

### The country-code join — an hour, not a week

`world-atlas` features carry only `{name}` in `properties` — but **their `id` is the
ISO-3166-1 numeric code** as a zero-padded string (`"840"`, `"250"`). That's what makes this
cheap, and missing it is what made earlier drafts price it at 2.5 days.

Measured against the live data:

- `i18n-iso-countries` (MIT) `numericToAlpha3` resolves **174 / 177** — the three misses are
  exactly the three features with no `id`: N. Cyprus, Somaliland, Kosovo.
- Joined to the live World Bank list (`region.id !== 'NA'` → 217 countries): **169 / 174**.
- The five non-matches — W. Sahara, Falklands, Fr. S. Antarctic, Taiwan, Antarctica — have
  valid ISO codes and genuinely no World Bank row. They are `noData`, not join bugs.
- **Total hand-adjudication: one override (Kosovo → `XKX`).**

Generate the table at build time and vendor it: **175 entries, 902 bytes gzipped.** The CI test
("every one of the 177 polygons either joins or is on a named exclusion list") is ~15 lines.

*(A hazard earlier drafts carried and got wrong: Natural Earth's `ISO_A3 == "-99"` for France
and Norway is real, but belongs to raw Natural Earth distributions. `world-atlas` has no
`ISO_A3` property at all. Right warning, wrong file.)*

**Stay on 110m** (38.4 KB gz). 50m is 230 KB gz *and makes the join worse*: five no-id features,
plus a duplicate id `036` shared by Australia and Ashmore & Cartier, so `new Map(...)` silently
drops Australia.

**`focus` needs a vendored camera table**, not computed centroids: `geoCentroid(France)` is open
ocean off Portugal (French Guiana drags it); `geoBounds` on Russia and Fiji returns
`maxLon < minLon` across the antimeridian; the USA's bounds span 105° because of the Aleutians.
~40 entries, generated once, hand-corrected.

**Disputed boundaries are data, not contract.** Natural Earth encodes editorial choices on
Kashmir, Crimea, Taiwan and Western Sahara. Keep `entities:"countries"` defined by World Bank's
own `region.id !== 'NA'` and put territory policy in **versioned geo data with an override
map** — never a `"sovereign"` enum in `blocks.ts`, which would force every conforming renderer
to agree on a list of sovereigns in order to be conformant.

**Mobile rules, in the block spec:** wheel never zooms; globe ≤55vh so there's always scroll
gutter; below 600px a one-finger drag must not steal the page scroll that lets the user read
the rest of the answer.

---

## 6. Data — `digest()`, and why the naive version launders errors

The model never sees the rows. It calls `digest()` and narrates from that. The naive nine-field
version `{min,max,first,last,delta,cagr,units,n,outliers}` is actively dangerous — measured
against the live API:

- **It truncates silently.** World Bank's default `per_page` is **50**. The trace's own call
  (BRA+USA, 1990–2024) needs 70 rows, returns 50, and the USA's `first` becomes **2010 instead
  of 1990** — so `delta` spans 14 years instead of 34. Well-formed object, wrong numbers,
  HTTP 200 throughout.
- **`units` can't be populated.** World Bank's `unit` field is an **empty string** on both the
  observation and the indicator metadata. It has to be scraped from the indicator name.
- **Nominal vs real is unrepresentable.** Brazil's GDP CAGR is **5.24%** in current US$ and
  **2.36%** in constant 2015 US$. The series also shows a 44% "collapse" from 2011 to 2020
  that is almost entirely currency depreciation. `outliers` makes this *worse* — 2011 and 2020
  are FX artifacts, and flagging them invites the model to narrate them as economic events.
- **`n` hides gaps.** Syria 1990–2024 has 2 nulls. Two series with `n:33` can be consecutive or
  war-shaped, and the model draws a trend line through the hole.

A digest that can't say "this number isn't comparable across time" isn't a safety mechanism,
it's a laundering mechanism: it converts the model's uncertainty into a structured,
authoritative-looking object.

**The shape that works:**

```ts
{ first: {year, value}, last: {year, value}, min, max,
  n, nMissing, gaps: [[y,y]],
  cagr, priceBasis: "current"|"constant-2015"|"ppp", currency,
  comparableAcrossTime: boolean,
  units, unitsSource,
  series12: [...],        // ≤12-point resample — closes the entire
                          // "when did X happen / who overtook whom" class
  caveats: string[] }     // current-US$ series emit a MANDATORY caveat
                          // the system prompt requires the model to honour
```

`NY.GDP.MKTP.KD` (constant) and `NY.GDP.PCAP.CD` (per capita) ship first-class — per capita is
usually the honest answer to "why is it behind" ($10.3k vs $86k), and the naive digest pushes
the model toward the wrong comparison.

**The resolver is server-side** (~3–4 weeks for the full version; a useful stub is 2 days).
Not for CORS — World Bank sends `access-control-allow-origin: *` — but because rate limits
would be charged against each end user's IP, browsers can't set the `User-Agent` Wikimedia's
policy requires, and there's no cross-user cache. Its real work: pagination, aggregate
filtering (needs a second metadata call), cache keying with the resolver version in the key,
single-flight dedup, and **a monotonic request token per block** so tapping Brazil-then-China
quickly can't leave Brazil's data under China's label. Error taxonomy is built from measured
behaviour: a bad indicator returns **HTTP 200 with an error envelope**, and the genuinely
silent case is a *valid* code with no data → `value: null`.

**Licensing, all verified.** World Bank CC-BY, attribution propagates to every chart.
**Open-Meteo is non-commercial only — cut from defaults**, or every downstream commercial user
inherits a ToS breach. **Wikipedia is client-impossible** and CC BY-SA share-alike. REST
Countries is an unmaintained single point of failure — vendor a snapshot. Every resolver
descriptor carries `{license, attribution, commercialUse}`; CI fails one without an attribution
string and generates `THIRD_PARTY_DATA.md`. Fonts (Inter, JetBrains Mono, both OFL, neither
with a reserved name) need a `licenses/` build step, since self-hosting is distribution.

---

## 7. Safety

`Prose` renders markdown → named sanitizer, no raw HTML. Image URLs → allowlist or proxy.
**`source:` strings are parsed against a registry of known resolvers, never templated into a
URL** — and that rule is why bindings are closed objects (§4.3). No prop accepts an arbitrary
URL scheme. `Custom` output is sandboxed, capped, and unpersisted.

---

## 8. Implementation

**The bones — what survives a rewrite:** `blocks.ts` (prop schemas) · `actions.ts` (bindings,
state-snapshot format, escalation tiers) · `tokens.json` + emitters · **the vendored geo
table** (the one artifact that genuinely can't be regenerated from first principles).
`resolve.ts` is *innards*, not bones — it's HTTP, caching and adapters, the part you'd happily
rewrite.

**Separation is a requirement, so it gets proven, not deferred.** Disposability means *a second
renderer passes a conformance suite* — not a lint rule. The honest second renderer is a
**static SVG** one covering `Choropleth` + `Metric` + `Prose`: no React, no DOM, no interaction.
It forces "what to draw" apart from "how to draw it" on a block that matters, and it's
independently useful for email, PDF and OG images. Scheduled in B, not "optional".

**Stack:** Next.js (App Router) + React + TypeScript + zod + Anthropic SDK + d3-geo/topojson.
Pin `@json-render/core` — it's pre-1.0 and sits on the critical path.

### Phase A — prove the thesis (~2 weeks, one app, no monorepo)

| # | Step | Kill criterion |
|---|---|---|
| **A0** | **Binding loop on fixtures — 2 hours, first thing.** Two hardcoded JSON specs, a `<select>` standing in for the map, one metric tile. Prove `$from` + state snapshot + a correct follow-up turn. | If this fails, stop — it's the thesis. Needs no d3, no join, no API. |
| A1 | Spikes: strict-mode schema sanitizer; provider portability of text-then-tool-call | zod emits `minLength`/`minimum`/`maxItems`, which strict mode **400s** |
| A2 | `Choropleth` + orthographic drag + geo join + `/gallery` + fixture replay mode | Every one of 177 polygons joins or is named-excluded |
| A3 | 6 schemas → `strict:true` tool → chat shell with SSE two-phase streaming | **Threshold written before running:** 20 prompts × 3 samples, ≥80% block-type match, **zero invalid indicator codes** |
| A4 | `/api/resolve` stub + digest; decide narration-vs-digest ordering by feel | Is digest-grounded narration worth the extra round trip? |
| A5 | Make A0 real against the live map; persistence + determinism tests | **Save a spec, restart, re-render identically.** One hour, and it tests reason #1. |
| A6 | `tokens.json` + emitters, light/dark, a *second* theme, record 30s | Does the same spec read as a different product? |

**Honest pricing.** Earlier drafts said "5 days" while quoting "~20 developer-days" for the
resolver in the same document. Real: **9–11 working days**, concentrated in A3 (schema
sanitizer + the prompt-fix loop, which is why fixture replay is built in A2, not later) and A4.
Grammar compilation adds first-call latency and is invalidated by *any* schema change — which
you'll make on every iteration of A3.

### Phase B — extract and harden (~5 weeks)
**B1** extract the four bones into packages · **B2** `Prose`/`Table`(sort)/`Chart` as a GPT-Vis
adapter + G2 theme emitter · **B3** `catalog-json-render` + playground as a json-render app ·
**B4** `Custom` block: sandbox, CSP, size caps, non-persistence · **B5** conformance suite +
static-SVG renderer · **B6** full resolver: pagination, aggregates, cache, abort tokens,
attribution, recorded fixtures + nightly live-drift job.

### Phase C — optional
Eval harness with thresholds and held-out prompts scored on *acceptable sets* (a single gold
label punishes correct behaviour — "show me America" has several defensible answers) ·
`migrations/` · pixel goldens, excluding anything WebGL · GPT-Vis relational tier ·
`globe.gl` upgrade if orthographic proves limiting.

### Done looks like
A stranger types "show me america", gets narration immediately and **a globe they can drag**
with the US lit, taps Brazil, watches the tiles update with no model call, asks "why is it so
far behind?" and gets a specific answer citing constant-dollar and per-capita figures it was
*handed* rather than recalled. Then you flip one token file and the identical spec re-renders
as a visibly different product.

If that 30-second recording exists, the project is proven.
