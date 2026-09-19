# Orrery — planning archive

Generative UI with a closed, themed block vocabulary: the model emits ~250 tokens of JSON
selecting and parameterising blocks, instead of writing UI code. Working name only —
"Auto-UI" collides with Google's "A2UI" when spoken aloud.

## Status: PLANNING PAUSED after round 4 of 4. No code written yet.

`v4-current.md` is the latest plan. It is **not** final — round 4 landed two structural
findings that v4 does not yet answer (see "Open, unresolved" below).

## Files

| File | What |
|---|---|
| `00-brief.md` | The original ask, verbatim, plus stated constraints |
| `v1.md` … `v4-current.md` | Successive drafts |
| `critique/round1..4.md` | Consolidated adversarial critique, all findings, with ratings |

## How this was produced

Four rounds, three independent adversarial reviewers per round (12 total), each with a
distinct lens — technical feasibility, product/goal fidelity, economics/licensing/prior
art, fix auditing, fresh-eyes readability, hero-block implementability, executability, and
a final red team. Reviewers were instructed to be harsh and to rate 1–10. Several verified
claims against live APIs and packed npm tarballs rather than from memory.

**Rating trajectory: 5.7 → 6.0 → 6.0 → 7.0**

## What survived all four rounds (high confidence)

- **Don't build an element tree, a prompt generator, or charts.** `json-render` (Apache-2.0,
  v0.21.0) owns the tree, patch streaming and `catalog.prompt()`; AntV `GPT-Vis` (MIT) owns
  26 chart types incl. the whole relational tier, already streaming and partial-tolerant.
- **Build the globe with `d3.geoOrthographic` + a drag handler, not WebGL.** ~56 KB vs
  ~600 KB. Deletes three copies of three.js, `h3-js`, a 2.28 MB static `three/webgpu`
  import, and `globe.gl`'s `window.THREE` module-scope read (which throws in Node and would
  have kept the globe out of the server-streamed paint).
- **The country-code join is ~1 hour, not days.** world-atlas feature `id`s *are*
  ISO-3166-1 numeric; `i18n-iso-countries`' `numericToAlpha3` resolves 174/177, 169 reach
  World Bank, and there is exactly one override (Kosovo → `XKX`). Vendored table: 902 bytes
  gzipped.
- **Phase-1 narration must carry no figures.** Narration streams before any tool returns, so
  any number in it is parametric recall — sitting above tiles that resolve the true values.
- **The naive digest launders errors.** World Bank `per_page` defaults to 50 (silently
  truncating a 70-row call); `unit` is an empty string; Brazil's GDP CAGR is 5.24% current
  vs **2.36%** constant, and the 2011→2020 "collapse" is currency depreciation.
- **Disposability is proven by a second renderer passing a conformance suite**, not a lint
  rule. Static SVG over Choropleth/Metric/Prose is the honest test.
- **Licensing:** Open-Meteo's free tier is non-commercial only (cut it); Wikipedia is
  client-impossible (browsers can't set the `User-Agent` its policy requires); World Bank
  CC-BY attribution propagates to every rendered chart.

## Open, unresolved — answer these before writing code

1. **Framework or application?** The brief says "build UI around whatever application it is
   operating for," but three of v4's four "bones" are demo-specific and there is no
   extension point — no `defineBlock()`, no resolver registration. "Closed vocabulary" and
   "works for any app" are in tension: if host apps add blocks, determinism holds only
   within one app version and persistence degrades to "stored React, but JSON". **Pick one.**
2. **The `ref` grammar is too thin.** Every ref is a single scalar lookup; every real
   request is a query (entities × range × filter × order × limit). "Compare the G7 over
   time" has no expressible shape. This is typed into `blocks.ts` and lands in every
   persisted spec — hardest thing here to change later.
3. **No path for the user's own data.** "Sort my sales data" — half the brief — has no
   upload, paste, file or host-dataset path. v4 added `sort` to `Table` but not the data.
4. **`mry` falsifies the persistence claim** it was invented to protect: it resolves at
   render time, so a spec reopened in 2028 shows different numbers. Fix is to freeze
   `resolvedYear` into the spec on persist.
5. **Phase-2 `Prose` blocks are unconstrained** by the no-figures rule, and unlike narration
   they are persisted.
6. **Block ids aren't scoped across the transcript** — turn 3 and turn 7 both emit `b1`, so
   a binding can attach to the wrong block.
7. **The `[ui state]` snapshot's scope is undefined** — all turns, or the current one?
8. **No zod schemas exist yet.** The catalog is described in prose; §4 calls itself "the
   artifact" and contains no types.
9. **No accessibility story**, no cost model, no system-prompt token budget (it grows with
   every block added — the real scaling cost of the approach).
10. **Serious alternative on the table:** one live panel instead of transcript-embedded
    blocks, with the model emitting a *query* + a one-word mark hint, and encoding
    auto-derived from data shape (Vega-Lite / APT / Draco lineage). Smaller model surface,
    strictly more general, and it answers all three hard requests v4's catalog fails.

## Two things the critics flagged as likely to kill it

- **Month 2 is Phase B: five weeks of infrastructure with no user and no visible output**,
  right after the demo ships. Glue with no second thing to glue is a portfolio piece.
- **The prompt is the product and nothing guards it.** `catalog.prompt()` regenerates on
  every schema change, invalidating every eval result — and the eval harness is currently
  scheduled in the phase labelled optional.
