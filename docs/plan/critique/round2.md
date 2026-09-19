# Round 2 findings

## Critic F (red team, rating 7/10) - VERDICT: build something smaller
1. FATAL CONTRADICTION IN MY OWN §0. The trace has narration asserting "342M people,
   $29.2T GDP" at ~400ms, but §4 says digest is called BEFORE narrating and §5 says
   narration streams BEFORE the tool call. All three cannot hold.
   Either narration precedes digest (numbers are hallucinated - the headline
   anti-hallucination fix is not wired into the headline trace) OR digest precedes
   narration (400ms first-token and two-phase UX both die; ~1.5-3s of spinner).
   -> MUST RESOLVE. Recommendation: feel both on day 3, decide with eyes.
2. "Moat" framing set the scope and distorted it. The brief never asks for a moat.
   The brief DOES say "themed" - and v2 demoted theming to "secondary, not a moat".
   -> The integration/theming layer IS the product. The globe is the demo that sells it.
      Stop being embarrassed about being glue. Glue is the right thing to build.
3. Moat does NOT survive its own logic. Globe = ~8 zod props + an ISO3->camera table
   over globe.gl's polygonsData/polygonCapColor/onPolygonClick/pointOfView. An afternoon
   for someone who's used globe.gl, +1wk polish. digest() = ~30 lines of arithmetic.
   v2 itself concedes defensibility is "licensing + ops, not code" = an admission the
   moat is CHORES. Honest restatement: a few weeks' head start, not a moat.
4. NEW PRIOR ART: data-by-reference is already a published MCP pattern
   (arXiv 2510.05968 ResourceLink for large datasets; MCP discussion #930 tabular output).
   json-render ALREADY ships a react-three-fiber renderer -> 3D is not a frontier.
5. Contract freezes at moment of MINIMUM information (step 1, before anything is felt).
   migrations/ before the first user = protecting untested decisions.
6. Demo is step 5 of 9. Ink renderer + 40 conformance specs + 120-prompt eval precede
   any user. Governance for a codebase with zero contributors.
7. BEST IDEA IN THE DOC IS BURIED: the state-echo loop closing. Click Brazil -> no model
   call -> [ui] line lands -> NEXT question answered correctly about Brazil. It is
   (a) demoable in 30s, (b) not shipping elsewhere, (c) architecturally load-bearing -
   it is WHY blocks need IDs, WHY there's an action vocabulary, WHY a contract exists.
   -> LEAD WITH THIS.
8. MISSING HEDGE: closed vocabulary has a real ceiling ("electoral college cartogram with
   a scrub bar") and §9 degrades to Prose = SILENT mediocrity, worst failure mode.
   -> Add a CODE-GEN ESCAPE HATCH to the action vocabulary. One enum value. Closed
      catalog + escape hatch dominates both pure positions.
9. BEST ARGUMENT FOR CLOSED VOCAB THAT v2 NEVER MAKES: PERSISTENCE. A 250-token spec
   can be stored in a transcript and re-rendered in 2 years. Stored generated React is a
   rot + security liability. If blocks live in chat history, closed vocab isn't a
   constraint, it's the only serializable option. Also: determinism, theming by
   construction (100% vs "most of the time"), interaction at zero marginal cost.
   -> Not a bet against model capability. Orthogonal to how well models write JSX.
10. PLAN: demote v2 to a CONSTRAINTS DOCUMENT (its diligence is load-bearing and
    expensive to rediscover). Build a 5-day, ~800-1200 line single app against it.
    Day1 globe no model / Day2 model no infra / Day3 /api/resolve + resolve the
    narration-vs-digest contradiction by feeling it / Day4 CLOSE THE LOOP (the day that
    matters) / Day5 theme + second theme + record 30s.
    The bones = 4 files: blocks.ts, actions.ts, tokens.css, resolve.ts.
    Keep only "v":1. Defer conformance suite, Ink, migrations/, 120-prompt eval,
    A2UI export, pixel goldens until a 2nd renderer or 2nd person exists.
11. "Fix the ordering, resolve the contradiction, stop being embarrassed about being an
    integration layer, and this is a 9."

## Critic D (fix audit, rating 6/10)
Tally: 24 FIXED, 5 PAPERED, 3 ACKNOWLEDGED-ONLY, 1 IGNORED, 2 PARTIAL.
Papering concentrated in: the digest fix, the strict-mode fix, the disposability proof.

A1. CONFIRMS red team: §0 hero trace hallucinates the 2 numbers the project exists to
    protect. And it's STRUCTURAL - §5's two-phase rule puts narration before any resolver
    runs, so narration can ONLY come from parametric memory. digest cannot save turn 1.
    Fails loudly on Nigeria / 2019 Venezuela / any stale-recall indicator.
    -> FIX: phase-1 narration must be DATA-FREE, or the turn is THREE-phase
       (digest -> narrate -> render). Restate latency honestly.
A2. "click BRA -> b2 re-resolves" HAS NO MECHANISM. b2's refs are literal strings. Nothing
    binds b1.selection to b2[*].ref. No expression language (we declined json-render's
    $state). The obvious repair - templating "@$globe.selection" - VIOLATES OUR OWN §8
    ("never templated into a URL"), breaks strict-mode enum validation, and reintroduces
    an expression mini-language above the line that no step budgets for.
    -> FIX: closed, non-string reference type in contract:
       {source, region:{$from:"b1.selection"}, year} resolved by runtime, never concatenated.
A3. ONE TOKEN SYSTEM CANNOT UNIFY DOM + G2 CANVAS + WebGL AS CLAIMED.
    - Canvas has no CSS cascade; custom props never reach fillStyle. Need build-time
      flatten to a G2 theme object AND a runtime theme-push on matchMedia + re-render.
    - G2's internal color math (ramp interpolation, hover shades) re-derives in sRGB via
      d3-color -> our OKLCH perceptual evenness is VOID exactly at the choropleth legend.
    - three.js r152+ converts sRGB->Linear->out via outputColorSpace; globe.gl's globe is
      LIT (Phong + light), so the same token is a different on-screen pixel than the chart
      legend beside it, and the drift VARIES with the lighting term (not calibratable).
    - Chrome mismatch: GPT-Vis tooltips/legends are DOM w/ own CSS; canvas text uses G2's
      font stack + canvas AA, not our subset Inter.
    - BREAKS FIRST, VISIBLY: dark-mode toggle. CSS flips instantly; chart + globe lag,
      each via a different API, re-rendering at different times. Screenshot-able seam in
      the first 10 seconds of the demo.
    -> FIX: downgrade to "one token source generates our CSS vars + a matching G2 theme
       object + palette" (~1 week). Drop "look like one product" or fund the fork.
A4. GPT-Vis concession is RHETORICAL. §1/§2 concede the tier; step 6 still ships our own
    Chart and step 0 still offers "GPT-Vis vs Recharts". If Recharts wins, §2 becomes
    false. And they're NOT interchangeable behind an adapter: GPT-Vis takes a spec in its
    own DSL and owns render/theme/stream/tooltip; Recharts takes React children and owns
    nothing. The adapter is the intersection of a DSL and a component API = ~nothing.
    -> FIX: decide on paper NOW. Per §2's own logic the answer is GPT-Vis.
A5. State echo is a LOG where a SNAPSHOT is needed, and NOBODY OWNS IT.
    Cost is fine (~320 tok at 40 interactions, append preserves cache prefix). Problem is
    semantic: model sees a HISTORY of selections, not STATE. "selected BRA/CHN/BRA/sorted/
    IND" -> must infer last-selected-wins + that sort and selection are orthogonal.
    Truncation = silent failure, model narrates about a globe centred where it isn't.
    Ownership: strings are produced by the renderer (BELOW the line) but model behaviour
    depends on their exact format -> contract has silently leaked into the disposable half.
    -> FIX: (a) echo VOCABULARY into contract (it's a serialization of the action type),
       (b) one replaced STATE SNAPSHOT per turn regenerated from live renderer state,
       (c) add echo round-tripping to the conformance suite.
A6. digest makes it THREE-phase. "why is it so far behind?" = model call 1 (emit digest)
    -> HTTP -> model call 2 (narrate + render) -> HTTP -> paint. TWO model round trips,
    each replaying the full transcript. ~3-6s to first token. §0's 400ms/2.4s are wrong.
    - digest NARROWS fabrication, doesn't stop it. Supports "grew 4x since 1990". Does NOT
      support "the dip is the 2015 commodity crash", "Brazil overtook Italy in 2011",
      "the gap widened fastest after 2014" - the sentences users actually want. Model
      answers anyway, from memory, right often enough that you won't notice until it isn't.
      -> FIX: digest returns a COARSE RESAMPLED SERIES (<=12 pts) alongside the scalars.
    - CROSS-PROVIDER: Anthropic emits text block then tool_use natively. OpenAI
      tool_choice:"required" typically SUPPRESSES content; Gemini function calls routinely
      return no text. Betting the interaction model on one provider's block ordering is the
      exact coupling §3 claims to avoid.
      -> FIX: spike in step 0 + a `narration` field fallback in the tool payload.
    - CONTRADICTION RISK: nothing reconciles phase 1 prose with phase 2 spec. Model can
      narrate "trend since 1990" then emit year:2024 with no series. No validator catches
      it. -> require payload to echo asserted refs; validate each exists in the spec.
A7. Region is NEVER SPECIFIED. Named in §4 and step 3, zero props described. Half the moat.
    Code moat honestly ~3-4 dev-weeks. AND THE MOAT DOES NOT SURVIVE DISTRIBUTION: if the
    moat is ops, the defensible product is a HOSTED resolver w/ warm cross-user cache +
    SLA - but an MIT npm package cannot ship that. Every downstream user stands up their
    own /api/resolve and hits the same ~1000 req/hr WB ceiling from their own IP.
    What genuinely remains: the PROP-DESIGN TASTE (6 rules, Strict/Partial, settled,
    escalation tiers, echo vocab) + the compliance apparatus. That's a SPECIFICATION +
    REFERENCE IMPLEMENTATION, not a moat. Pitch it that way.
A8. Ink renderer proves the WRONG THING. Prose/Metric/Table tests string rendering, number
    formatting, tabular layout. Tests NONE of: spatial props, hit-testing, action bus,
    escalation, settled, tier-1 local state, data-ref resolution, echo, streaming patches.
    -> FIX: static SVG renderer covering Region + Metric + Chart + Prose (no React, no DOM,
       no interaction). Forces "what to draw" vs "how to draw it" on a MOAT block, and is
       genuinely useful (email/PDF/OG images). ~2wk vs ~1wk for a test that finds nothing.
A9. - strict mode requires ALL properties in `required` (optionality = ["T","null"] union);
      Anthropic rejects root-level anyOf/oneOf. So rule 4's "<=3 required" is STILL
      incompatible with BlockStrict. Model emits all 8 props w/ nulls -> inflates the
      output-token figure §6 depends on. Day-1 spike was aimed at the wrong hypothesis.
    - catalog.md / heuristics.md / examples.jsonl are depended on by §6 and §10 and OWNED
      BY NO STEP (v1 had step 3; v2 deleted the step with the retracted claim).
    - No token FLOOR assert. Catalog must now EXCEED 1024 tok to cache on Sonnet. Never
      asserted. A too-small catalog fails silently - the exact mode §6 was written to kill.
    - json-render v0.21.0 pre-1.0 is simultaneously distribution channel AND streaming
      engine. No pinning / vendoring / exit policy.
    - Patch vs local state: does turn N+1 patching b1 reset the globe's rotation/selection?
TIMEBOX: v2 as written = ~18.5 dev-weeks (~4.5 months). Honest prototype = steps 0,1(3
blocks),3(Globe only),4(WB only),5 = 6-7 weeks. ORDERING IS BACKWARDS: the riskiest
unknowns (two-phase, state echo, binding) are in step 5 = ~13 weeks in.

## Critic E (graphics/data engineering, rating 5/10) - ALL MEASURED AGAINST LIVE APIs
E1. world-atlas countries-110m properties == {'name'} ONLY. No ISO code of any kind.
    "highlight":["USA"] is UNRESOLVABLE. Needs vendored numeric<->alpha3<->WB table.
    2-3 days, budgeted nowhere, belongs in a @orrery/geo package.
E2. Natural Earth ISO_A3 == "-99" for FIVE features: N.Cyprus, FRANCE, Kosovo, NORWAY,
    Somaliland. Naive ISO_A3 join renders TWO HOLES IN EUROPE. Prefer ISO_A3_EH ->
    ADM0_A3 -> manual override. (three-globe's own example ships this geojson.)
E3. WB /country/all returns 265 rows where top 10 are ALL AGGREGATES (WLD 8140M, IBT,
    LMY, MIC, IBD, EAR, EAS...). India/China don't appear until rank 11+. Linear domain
    [0, 8.14e9] -> every real country in bottom 17% of ramp -> FLAT MONOCHROME GLOBE.
    The §0 choropleth spec as written produces a broken visual. Need entities filter
    (region.id==='NA' marks all 78 aggregates, requires a SECOND metadata call) + log scale
    (population spans 9 orders of magnitude).
E4. WB default per_page=50. §0's digest call needs 70 rows -> returns 50 -> all 35 BRA
    years + only 15 USA years (2024..2010). USA `first` = 2010 not 1990, delta over 14yr
    not 34, cagr over wrong n. WELL-FORMED OBJECT, WRONG NUMBERS, HTTP 200 throughout.
    Reproduces the exact failure digest exists to prevent, on the flagship example.
E5. WB `unit` is EMPTY STRING in both observation and indicator metadata. digest's `units`
    field CANNOT BE POPULATED. Must regex-scrape indicator names or hand-vendor.
E6. NOMINAL vs REAL - the big one. Brazil NY.GDP.MKTP.CD (current US$) CAGR = 5.24%;
    NY.GDP.MKTP.KD (constant 2015) = 2.36%. Less than half. And a 44% "collapse"
    2011->2020 that is almost entirely BRL depreciation. `outliers` makes it WORSE - 2011
    and 2020 are FX artifacts and flagging them invites the model to explain them as
    economic events. Digest has no nominal/real flag, no deflator base, no currency flag.
    -> "not a safety mechanism; a LAUNDERING mechanism - it converts the model's
       uncertainty into a structured, authoritative-looking object."
E7. "why is it so far behind?" - digest has ZERO causal content. And per-capita is the
    right comparison (BRA ~$10.3k vs USA ~$86k) which digest structurally cannot do
    (needs a 2nd digest + a division). The digest was NOT load-bearing for the payoff line.
E8. BUNDLE: globe.gl@2.46.2 = 1,885,160 B min / 525,451 B gz. +world-atlas 39KB gz.
    ~565KB gz on the wire, ~1.99MB to parse. three is only a THIRD of it. Cannot
    tree-shake: three-globe deps include h3-js (213KB min) for hexbin, three-slippy-map-
    globe, d3-scale-chromatic. three-render-objects has a STATIC top-level
    `import {WebGPURenderer} from 'three/webgpu'` = 2,284,823 B on disk, tree-shake is a
    coin flip. globe.gl pins three as a HARD dep >=0.179<1; three-globe as a PEER >=0.154;
    json-render ships an R3F renderer -> THREE COPIES OF THREE possible -> silent
    instanceof failures. Need resolve.dedupe:['three'] + CI assert.
E9. SSR DEFINITIVELY BROKEN, not "might": globe.gl.mjs reads `window.THREE` at MODULE
    SCOPE (same in three-globe.mjs). `import Globe from 'globe.gl'` THROWS in Node.
    Only fix is dynamic(..., {ssr:false}) -> the globe CANNOT be in the server-streamed
    first paint, arrives after hydration + its own chunk. Needs fixed-height skeleton or
    the narration the user is reading jumps (CLS).
E10. geoCentroid(France) = (-6.8, 43.1) = OPEN OCEAN off Portugal (French Guiana drags it).
     Same class: NLD, NOR, NZL, GBR. geoBounds(Russia) maxLon=-169.9 < minLon=19.7 and
     Fiji likewise -> antimeridian -> naive altitude=f(bboxWidth) gives negative/~350 deg.
     USA bounds span 105 deg because of the Aleutians -> bbox-derived altitude zooms out
     past "the US lit". Needs a vendored per-country {lat,lng,altitude} table - the SAME
     table §4 cut `Map` to avoid building. The cut saved nothing.
E11. MOBILE: browsers cap concurrent WebGL contexts ~8-16. Multiple globes in one
     transcript -> older canvases SILENTLY GO BLACK. Near-certainty for a chat surface.
     Need pauseAnimation() on IntersectionObserver exit, ONE live globe per transcript +
     static snapshot fallback, webglcontextlost handler, setPixelRatio(min(1.5,dpr)).
     Touch: OrbitControls touches.ONE = ROTATE -> one-finger vertical swipe rotates the
     globe instead of scrolling the transcript = user TRAPPED mid-conversation.
     Fix: cap globe <=55vh + tap-to-activate overlay.
E12. WHEEL/SCROLL TRAP: must set controls().enableZoom=false (no top-level globe.gl API -
     must reach through controls() into raw three.js). Recommendation: wheel NEVER zooms.
E13. REGION: world-atlas objects keys == ['countries','land'] ONLY. NO SUBDIVISIONS.
     "US-TX" cannot render (needs us-atlas states-10m, US-only). "Bay Area" needs the
     geocoder we cut. -> Region is a 2D d3-geo choropleth. d3-geo is 709 BYTES gz,
     topojson-client 2,510 B. BUILD REGION FIRST: proves resolver + join + scale + legend
     for ~45KB instead of ~565KB, AND is the WebGL-unavailable fallback we need anyway.
     Rename to Choropleth. Sub-national is out of slice 1.
E14. RESOLVER = ~20 DEVELOPER-DAYS (~4 calendar weeks), not one table row. Biggest items:
     WB adapter w/ pagination 2.0d, join table 2.5d, vendored centroid/bbox/altitude
     snapshot 1.5d, digest-as-needed 1.5d, cache 1.5d, abort/race 1.0d.
     ABORT RACE: aborting HTTP is the easy 20%; the hard part is a stale resolve
     overwriting a newer one -> needs a monotonic request token per block id.
     "the panel shows Brazil's data with Argentina's title."
E15. CORRECTIONS TO MY OWN v2:
     - WB sends `access-control-allow-origin: *`. CORS is NOT a problem. Server-side
       conclusion still right (per-end-user IP limits, no UA, no cross-user cache) but
       v2 led with the wrong reason.
     - Bad indicator/country returns HTTP 200 + {"message":[{"id":"120","key":"Invalid
       value"}]} - NOT an empty array. v2's stated premise was factually wrong. The real
       silent case is a VALID code with NO DATA -> value: null.
     - "~1000 req/hr" is folklore, not published, no rate-limit headers returned.
       Implement backoff on 429/503 instead of a client-side budget.
     - US pop 2024 real figure = 340,003,797 = 340.0M. §0 said 342M. The trace
       hallucinated AND got it wrong by 2M.
E16. 110m is correct (39KB gz, 177 features). 50m is 236KB gz AND makes the join WORSE:
     5 features with NO id (Somaliland, Kosovo, N.Cyprus, Indian Ocean Ter., Siachen) and
     a DUPLICATE id 036 shared by Australia + Ashmore & Cartier -> new Map() silently
     drops Australia. 110m has only 3 no-id features.
E17. §0 line-by-line: `focus` type undefined (country code is a free string, violates
     rule 3). `highlight` vs `choropleth` both set cap colour, precedence UNDEFINED ->
     not renderable. `spin` enum members unstated, says nothing about zoom policy.
     `ref` hardcodes 2024 -> wrong in Jan 2027, and specs are PERSISTED. Needs mrv/latest.
     "1 cached HTTP call" is really 2 (pop + GDP) unless batched.
     "numbers never enter the token stream" contradicted by L14 AND by §4's own
     "<50 points go inline as literals".
E18. Round 2 ratings: D=6 (fix audit), E=5 (technical realism), F=7 (red team). Mean 6.0.
