# Round 3 findings

## Critic H (FRESH EYES, never saw v1/v2) - rating 6/10
H1. **THE CATALOG IS NEVER WRITTEN DOWN.** The closed vocabulary is the entire thesis and
    there is no block list, no prop table, no types, no defaults. blocks.ts and actions.ts
    are declared "the bones" and neither is specified anywhere. Blocks can only be scraped
    out of prose. "Like a language spec with no grammar."
H2. tokens.css declared the product; NOT ONE TOKEN IS NAMED.
H3. ESTIMATE SELF-CONTRADICTIONS (the plan indicts v2 for this then does it worse):
    - §5 "resolver ... ~20 developer-days" vs §7 step 3 "= 1d". 20x. Also §3 "~150 lines".
    - §4 geo package "~2.5 days" vs §7 step 1 (Choropleth + geo join + gallery) "= 1.5d".
    - Phase A = 5 days (§3) or 6 days (§7 steps 0-5 sum). Step 0 missing from day plan.
    - Phase B = "~4 weeks" (§3) or 5 weeks (§7 sums). "A+B ~= 6 weeks" silently uses 5.
H4. THEMING CONTRADICTION: §0 "the theming and integration layer is the product" vs §6
    "the theming claim is downgraded ... Drop 'one product' or fund the stylesheet fork."
    The thing declared to BE the product is declared undeliverable 300 lines later, and
    left as an ultimatum addressed to nobody. DECIDE IT IN THE DOCUMENT.
H5. THE GLOBE SILENTLY DROPS OUT of the success criterion ("an interactive map with the US
    lit"). The brief's one concrete image is not in the proof-of-life demo, and the plan
    never says out loud "you will not see the globe for five weeks."
H6. RENDERER SEPARATION IS A BRIEF REQUIREMENT and its only proof (conformance suite +
    static SVG renderer) is step 10, PHASE C, labelled "optional". And §6 documents that
    this exact leak ALREADY HAPPENED once (state-echo strings). Diagnoses the leak, defers
    the only detector to the phase that might never happen.
H7. THE PACK IS LOST AGAIN. §6 catches v2 losing catalog.md/heuristics.md/examples.jsonl
    and says "give them an owning step" - then §7 does NOT. They are three words inside
    step 11, Phase C, optional.
H8. DAY-1 JOIN INSTRUCTIONS CONTRADICT THEMSELVES IN THE SAME SECTION. §4 opens
    "world-atlas carries no country codes, properties is exactly {name}" then four lines
    later "Prefer ISO_A3_EH -> ADM0_A3 -> manual override" - those fields exist on RAW
    NATURAL EARTH, not world-atlas (which joins by numeric id). Which file am I loading?
    An hour lost on the most important task of the most important day.
H9. USER'S OTHER TWO EXAMPLES HAVE NO HOME. "interactive spreadsheet when asked to sort
    through data" -> Table named once as filler in step 9, sorting never mentioned.
    "interactive diagrams" -> no diagram block ever planned or scheduled.
H10. NO ARCHITECTURE SECTION: no request lifecycle, no block registration, no statement of
    where the model call lives, no spec->render data flow. Stack never named (reviewer
    reverse-engineered Next.js from /api/resolve + dynamic ssr:false). No repo layout,
    no pinned versions except json-render.
H11. NO ADOPTION STORY. Brief says build UI "around whatever application it is operating
    for". No host-app API, no "here is what you import", no second app.
H12. `code` ESCAPE HATCH sold as "costs one enum value" - actually costs an execution
     environment, sandbox policy, a rendering path for arbitrary output, and a trust
     boundary. Appears in NO step in §7. Security-critical hand-wave.
H13. BRIEF'S "or better yet make them ourselves" NEVER ENGAGED. No self-authored assets.
     Globe/map textures not mentioned once.
H14. NO COST NUMBER. "cheap" is in the brief; there are token counts but no $/interaction.
H15. THE v2-REBUTTAL STRUCTURE IS THE MAIN STRUCTURAL DEFECT. ~25 references to an unseen
     document. Two of seven sections TITLED as rebuttals ("why v1's version was a
     laundering mechanism", "Contract details that v2 got wrong"). In §5 the DELIVERABLE
     (digest v2 shape) is ONE PARAGRAPH preceded by five bullets of autopsy. Inverted.
     Dead references for a fresh reader: "the same vendored table v2 cut Map to avoid"
     (no Map block in v3), "the geocoder we cut" (never introduced), "v2 deleted the
     budget rule", "v2's Ink renderer", "v2's flagship digest call needed 70 rows",
     "Three independent reviewers confirmed it" (review-process trivia).
H16. DETAIL BALANCE IS INVERTED. ~95 lines of pure hazard in §4+§5 vs ~15 lines in the
     WHOLE DOCUMENT describing what the system IS. resolve.dedupe/setPixelRatio/h3-js
     size/WebGL context cap/9-member error taxonomy/CORS correction all belong in
     per-step notes (the brief says each step gets its own critique loop later).
     "the vocabulary, the theme tokens, the action grammar and the adoption story - the
     four things a reader needs to build - are all absent, while setPixelRatio made the cut."
H17. WHAT LANDS (keep): "(drag) rotates. 0 model calls, 0 network"; the PERSISTENCE
     argument ("a 250-token spec can re-render in two years; stored generated React is a
     rot-and-security liability the day you persist it") - "the sharpest idea in the
     document and genuinely made me want to build this"; the closing success criterion;
     the four-files answer to "what are the bones" ("the best single answer I could ask
     for"); the licensing pass; Brazil 5.24% vs 2.36%; duplicate id 036 dropping Australia;
     the mobile swipe trap ("product thinking, not a gotcha").
H18. "The user came in excited about a globe you can spin; they'd get 360 lines that
     mention the globe mostly to explain why it can't be server-rendered, costs 525 KB,
     and isn't in week one." FIX IS CHEAP AND MOSTLY REORDERING.

## Critic G (v3 fix audit) - rating 7/10
Tally: 27 FIXED, 5 PARTIAL, 4 PAPERED, 2 ACKNOWLEDGED-ONLY, 2 IGNORED (A9e, E17b).

G-BEST: **d3.geoOrthographic + d3.drag = a SPINNABLE SPHERE inside the 709-byte d3-geo
budget.** v3 conflated projection:"sphere" with WebGL and shipped the hero to Phase B for
NO MEASURED REASON. -> Globe can be DAY 1 at ~45KB instead of ~565KB. Fixes brief fidelity
AND schedule in one move. WebGL globe.gl becomes an OPTIONAL upgrade, not the hero path.

G1. HERO TRACE STILL DOESN'T EXECUTE, new failures:
    (a) projection:"sphere" not built until Phase B, but §7 success criterion says "drags
        it". A 2D d3 choropleth is not draggable. Trace out of sync with schedule AGAIN.
    (b) b1.selection is UNDEFINED AT FIRST PAINT -> b2 has no entity -> two empty tiles
        under narration promising figures. v2 had no binding so the tap did nothing; v3
        has a binding so the INITIAL RENDER has nothing.
        -> need {"$from":"b1.selection","default":{"iso3":"USA"}} or "focus seeds selection".
    (c) $from is sold as "closed, non-string" but "b1.selection" IS A STRING PARSED ON A
        DOT - the mini-language A2 warned about, one sigil lighter.
        -> {"$from":{"block":"b1","field":"selection"}}, field an ENUM.
        Also unspecified: which fields bindable, cycles, dangling refs when turn N+1
        patches b1 away, WHO RESOLVES IT (client substitution = templating into a request
        = the SSRF thing A2 forbade, re-entering by the back door; server resolution needs
        live client state, contradicting the stateless resolver), and strict-mode nested
        union on ref.entity (step 0 spikes Chart.kind, NOT ref.entity).
    (d) E17b SURVIVED VERBATIM: highlight vs fill precedence still undefined. USA has a
        log-ramp fill AND is in highlight. What colour? If highlight wins, the US is the
        one country whose population you can't read. If fill wins, "show me america" didn't
        light America. FIX IS ONE SENTENCE: "highlight is a STROKE/HALO channel, fill is
        the CAP channel, orthogonal, no precedence needed."
    (e) A9e IGNORED: tap mutates b1.focus AND b1.highlight -> every tap flies the camera
        uninvited under a bullet advertising "0 model calls". And live state has diverged
        from the emitted spec, so a turn-N+1 RFC-6902 patch computed against the EMITTED
        spec silently reverts the user's selection and camera. THAT IS DAY 4's CORE DEMO.
        -> rule: patches apply to spec fields; selection/camera are renderer-local and
           survive. Put it in actions.ts.
    (f) NO RESOLUTION RECEIPT. digest got caveats; ref got nothing. Metric tile has no
        year, no units, no attribution - while §5 mandates WB attribution propagate to
        every rendered chart. Mandated in §5, no slot in the schema.
    (g) Is a world population choropleth even the answer to "show me america"? Optimizes
        for what's demo-able (a data join) over what was asked.
G2. entities:"sovereign" IS A POLITICAL CONFIG IN A TECHNICAL COSTUME.
    - Doesn't match the measured problem. WB's own discriminator is region.id === 'NA'.
      Correct enum is "countries"/"non-aggregate".
    - Honoured literally it DELETES REAL MAP AREA: HK, Macao, Puerto Rico, Greenland,
      New Caledonia, Faroes, Bermuda, Guam, Curacao, Channel Islands, West Bank & Gaza,
      Kosovo all have polygons -> become no-data holes.
    - Taiwan: NO WB ROW AT ALL but has a polygon. Kosovo: has XKX, ~half of UN recognises.
      Palestine: PSE "West Bank and Gaza". W. Sahara/Somaliland: polygon, no data.
    - WORST: entities lives in blocks.ts = THE BONES, so every conforming renderer must
      agree on a list of sovereigns to be conformant. A POLITICAL JUDGEMENT PROMOTED INTO
      THE PORTABLE CONTRACT. -> rename "countries" (region.id!=='NA'); disputed-territory
      policy into VERSIONED geo DATA with an override map, out of the contract.
G3. year:"mrv" BREAKS TWO OF §0's OWN FOUR PILLARS.
    - WB mrv is per-series PER COUNTRY. US 2024, Brazil 2023, Eritrea ~2011. Choropleth
      silently mixes a decade; legend says "Population", no year.
    - Contradicts DETERMINISM ("same question twice yields the same interface") and
      PERSISTENCE ("re-render in two years" -> re-renders with DIFFERENT NUMBERS).
      mrv was introduced to serve persistence and destroys persistence-of-meaning.
    - RE-CREATES E4 INSIDE THE DIGEST: 1990..mrv for [BRA,USA] -> two CAGRs over different
      n, compared in one sentence. Verbatim the failure §5 exists to prevent.
    - Worse than hardcoded: hardcoded gives visible holes (noDataColor tells the truth);
      mrv gives a fuller map that is SILENTLY INCOMPARABLE.
    -> resolver returns {requestedYear, resolvedYear, yearSpan, mixed}; renderer MUST
       surface it; add "mry" (most recent COMMON year), default for anything comparative.
G4. PHASE A IS 12-16 DAYS BY v3's OWN ARITHMETIC, not 5.
    join alone 2.5d (budgeted inside 1.5d) | resolver "~20 dev-days" (budgeted 1d) |
    day 4 needs the abort/race monotonic token (1.0d, unbudgeted - tapping BRA-then-CHN
    fast IS the stale-overwrite case AND IS THE DEMO).
    Table SUMS TO 6.0d under a heading saying 5. Phase A secretly depends on Phase B/C
    work in 3 places: prompt artifacts (step 11, Phase C), the join-coverage CI test that
    IS day 1's kill criterion (Phase B), the Node-import CI test (Phase B).
G5. "THE BONES ARE FOUR FILES" NAMES THE WRONG FILES.
    - resolve.ts is NOT a bone, it's the innards (HTTP, cache keys, adapters, backoff) -
      exactly the "fix later" half.
    - THE VENDORED geo JOIN + CAMERA TABLE IS MISSING FROM THE LIST - the thing §4 calls
      "the single biggest unbudgeted item", ~15 hand-adjudicated exceptions, genuinely
      expensive to rediscover and CANNOT BE REGENERATED. That is the real 3rd bone.
    - tokens.css is refuted by §6 one section later (CSS custom props never reach canvas
      or WebGL; the real claim is "one token SOURCE generates CSS vars + a G2 theme object
      + a palette"). -> the bone is tokens.json + EMITTERS, not tokens.css.
    - USER'S HARD CONSTRAINT ("the two must be CLEARLY SEPARATE") is deferred to step 6
      and its PROOF to step 10, Phase C, "optional". Moved technical risk to the front and
      the USER'S OWN REQUIREMENT to the back, then marked it optional.
G6. ESCAPE HATCH INCOHERENT AS FILED. Violates ALL FOUR of §0's reasons for a closed vocab
    (rot/security, non-deterministic, won't use tokens, costs tokens+network per
    interaction). Salvageable ONLY if framed as VISIBLE + DEGRADED + NON-PERSISTED +
    sandboxed + size-capped. FILED IN THE WRONG FILE: actions are what the USER does (tap,
    sort); code-gen is what the MODEL EMITS -> it's a BLOCK TYPE (type:"Custom"), not an
    action. Cost claim BACKWARDS: adding a variant to a versioned union is trivial; what's
    hard to retrofit is the RENDERER SECURITY BOUNDARY (sandbox, CSP, capability surface,
    size limits) - counted as free. No step owns it, so it WILL be retrofitted.
G7. "HAND-RUN 20 PROMPTS AND EYEBALL" CANNOT ANSWER DAY 2's KILL CRITERION.
    No threshold ("it is not a criterion, it is a mood"). n=20 single-sample = +-20pp CI,
    can't distinguish 70% from 90%, and at temp>0 you measured one draw not a rate.
    Eyeballing is strongest where it's cheapest (schema violations the SDK catches free)
    and weakest where it matters: scale:"linear" for population, missing entities, Metric
    where Chart was right, and above all A PLAUSIBLE-BUT-FAKE INDICATOR CODE
    (SP.POP.TOTAL) which fails at RUNTIME as a blank map, not at eyeball time.
    Day 2 structurally CANNOT answer its own question because the resolver is day 3.
    -> 20 prompts x 3 samples, vendored indicator allowlist, hand-labelled expected block
       type, print a pass rate, WRITE THE KILL THRESHOLD DOWN BEFORE RUNNING.
       "That is a script, not an eval harness, and it is the whole difference between a
       kill criterion and a feeling."
G8. VERDICT: "Fix items 1,2,4,5,8 and it is a 9."

## Critic I (Phase A executability) - rating 5/10. RE-RAN EVERYTHING INDEPENDENTLY.
I1. **WRONG FACT #1: d3-geo is NOT 709 bytes gz.** That's bundlephobia's broken number
    (gzip:709 vs size:37059 = 52:1, obviously broken). MEASURED w/ esbuild + gzip -9:
    whole d3-geo = 14,677 gz; geoPath+geoNaturalEarth1 only = 8,445 gz; realistic day-1
    set (d3-geo + topojson-client + d3-scale + d3-scale-chromatic) = 17,832 gz.
    ~21x larger than stated. CONCLUSION SURVIVES but the line must read
    ~56 KB (17.8 JS + 38.4 topojson) vs ~600 KB. Also globe.gl measured 559 KB gz /
    2.00 MB min - v3 slightly UNDERSTATED it.
I2. **WRONG FACT #2 (LOAD-BEARING): Anthropic strict mode does NOT require every property
    in `required`.** That is OPENAI's structured-outputs rule, imported into an Anthropic
    plan. Official Anthropic example has "unit" optional and omitted from required. Docs:
    "Properties not in required are implicitly optional... should simply be omitted."
    => §6's entire "≤3 required is semantic not schema" paragraph repairs a NON-PROBLEM;
       the output-token inflation estimate is wrong; step 0's first spike tests a
       constraint THAT DOESN'T EXIST.
    WHAT IS TRUE and worth spiking: additionalProperties:false is MANDATORY; zod emits
    minLength/minimum/maxItems/format which strict mode REJECTS with a 400 -> you need a
    SCHEMA SANITIZER (half a day). No recursion, no external $ref, no complex types in
    enums. anyOf supported with limits (allOf+$ref is not).
I3. **THE JOIN IS ONE HOUR, NOT 2.5 DAYS.** i18n-iso-countries (MIT v7.14.0)
    numericToAlpha3 resolves **174/177** world-atlas features; the 3 misses are exactly
    the 3 no-id features (N.Cyprus, Somaliland, Kosovo). Joined to live WB
    (region.id!=='NA' -> 217): **169/174 matched**. The 5 non-matches (ESH, FLK, ATF, TWN,
    ATA) have valid ISO codes and genuinely NO WB row = noData, not join bugs.
    48 WB countries have no 110m polygon. TOTAL HAND-ADJUDICATION: **ONE override
    (Kosovo -> XKX)** + a noData path you need anyway. NOT "~15 exceptions".
    Generated at build time: **175 entries, 2,100 bytes raw, 902 BYTES GZIPPED.**
    The entire "vendored geo package" = a ~10-line build script + a 2KB JSON file.
    => LARGEST SINGLE MISPRICING IN THE PLAN.
    Alternatives all live: iso-3166 v4.4.0, countries-list v3.4.1, world-countries v5.1.0.
I4. **world-atlas feature ids ARE ISO-3166-1 NUMERIC STRINGS** (zero-padded "840","250",
    "036"). THE PLAN NEVER SAYS THIS - which is exactly why it over-priced the join.
I5. **ISO_A3=="-99" DOES NOT APPLY TO world-atlas** (no ISO_A3 property at all; France is
    id 250, Norway 578). Correct warning, WRONG FILE. Inflates perceived day-1 difficulty.
I6. CONFIRMS G: **geoOrthographic + drag = a spinning globe from the SAME d3-geo and the
    SAME 38KB topojson, ~30 lines.** No three.js, no WebGL, no window.THREE, no
    dynamic(ssr:false), no bundle gate, no resolve.dedupe, no one-context-per-transcript.
    Canvas-backed orthographic redraw holds 60fps on a phone at 177 polygons.
    "The choice isn't 2D-vs-globe.gl - it's FLAT-vs-ORTHOGRAPHIC, and orthographic is
    nearly free." ~3 hours on top of day 1. The `projection` prop already anticipates it;
    v3 just assigned "sphere" to the wrong implementation.
    As specced, day 5's recording "shows a static rectangle of the world" - doesn't match
    the brief, and it's the artifact the whole phase exists to produce.
I7. **DAY 4 CAN BE PROVEN IN 2 HOURS ON FIXTURES, BEFORE DAYS 1-3.** The $from+snapshot
    mechanism is COMPLETELY ORTHOGONAL to d3/join/WB/resolver. Two hardcoded JSON
    fixtures + a <select> standing in for the map + a metric tile. If it fails you save a
    week; if it works, days 1-3 become "make it real" instead of "hope it holds up."
    "THE PLAN FRONT-LOADS THE RISK IT CAN SEE AND BACK-LOADS THE RISK IT CLAIMS MATTERS
    MOST."
I8. **PERSISTENCE - §0's SELF-DECLARED STRONGEST ARGUMENT - IS NEVER TESTED.** Nothing in
    Phase A re-renders a stored spec in a fresh session. It's a ONE-HOUR test (save JSON,
    restart server, render, assert identical). Biggest hole in Phase A.
    Determinism (reason 2) also untested - a 20-line script.
I9. **THE CHAT UI HAS ZERO BUDGET.** The brief's opening image is "the whole screen was a
    chatbox". Phase A's six steps contain NO message list, no input box, no transcript
    scroll management, no interleaving of streamed text with mounted React blocks, no
    scroll-anchoring when a block mounts and pushes content. 1-2 days, and it IS the
    product surface. /gallery is a component harness, not a chat.
I10. "ONE SONNET CALL" IS NOT SPECIFIED and the latency claim depends entirely on how:
     SSE from a Next route handler, parse content_block_delta for text_delta, accumulate
     input_json_delta for the tool_use block, validate, mount. That IS the §1 trace and
     it isn't a step. Plus: eager_input_streaming decision (progressive block render means
     YOU own validation - the tolerant parser hands you a silently truncated spec).
I11. **GRAMMAR COMPILATION LATENCY, unbudgeted.** Docs: "The first time you use a specific
     schema, there is additional latency while the grammar compiles." Cached 24h from last
     use, INVALIDATED BY ANY SCHEMA CHANGE OR TOOL-SET CHANGE. On day 2 you change the
     schema every iteration -> you eat it every time. §1's 400ms/3.5-4.5s ignore cold
     grammar. Also: min cacheable prefix is MODEL-DEPENDENT (512-4096) - check, don't assume.
I12. NO REPLAY/FIXTURE MODE = WHAT MAKES DAY 2 THREE DAYS. Every prompt iteration is a
     live call at 3-5s with no saved output. specs/*.json fixture dir + a replay flag =
     ~2 hours, pays for itself twice on day 2 and again on day 5 (you need a known-good
     spec to render under two themes).
I13. HONEST PHASE A PRICING: step0 0.5d | day1 2d | **day2 2.5-3d (SECRETLY THREE DAYS:
     schema sanitizer + no replay harness + the catalog artifact that has no owning step)**
     | day3 2d for a stub / 4-5d for what §5 specifies | day4 1d (only estimate I believe)
     | day5 1.5d (a second theme is a DESIGN problem, not engineering).
     **TOTAL 9-11 working days = 2-2.5 weeks.** Overrun concentrated in days 2 and 3 -
     exactly the two days the plan under-describes.
I14. ESTIMATE TABLE IS NOT DERIVED FROM THE FINDINGS. "§7's table is a separate, more
     optimistic document stapled to the back... the estimates and the findings were
     written by different hands."
I15. DAY 1'S KILL CRITERION IS THE WEAKEST ("does it look good?" = a taste judgment with
     no failure mode). Day 1 has effectively NO GATE.
I16. MISSING: error states (9 catalogued, 0 built - model emits an iso3 with no polygon
     [48 exist], valid indicator w/ all-null values, /api/resolve 500s mid-stream, tool
     call failing zod after strict should have prevented it); attribution rendering
     (20 min, but a retrofit across every renderer if not on day 1); loading/layout-shift
     for the 2D path (choropleth also mounts after narration and shoves the transcript);
     turn-2 context token count; .env/key handling; per-turn cost number; 429 behaviour.
I17. CONFIRMED CORRECT (re-ran): world-atlas properties=={name} across all 177;
     per_page=50 and the BRA;USA 1990:2024 call returns 50 of 70 with first row 2024 and
     last 2010; aggregates dominate (WLD 8,140,897,523 matches); 5 blank countryiso3code;
     217/78 via region.id==='NA' needing a 2nd call; bad indicator -> 200 + error envelope;
     unit:""; Syria 2 nulls in 35; CORS *; no rate-limit headers; US pop 340,003,797;
     110m 38.4KB gz / 50m 230KB gz; 50m's 5 no-id features AND duplicate id 036 sharing
     Australia + Ashmore & Cartier ("nice catch, and it's real").

## Round 3 ratings: G=7 (fix audit), H=6 (fresh eyes), I=5 (executability). Mean 6.0.
## Running: R1 mean 5.7 -> R2 mean 6.0 -> R3 mean 6.0.
