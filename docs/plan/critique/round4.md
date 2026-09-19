# Round 4 findings

## Critic J (FRESH EYES on v4, never saw v1-v3) - rating 7/10 (up from 6 on v3)
J1. NO ZOD SCHEMAS. §4 opens "This is the artifact. Everything else is scaffolding around
    it" and the artifact is a SIX-ROW MARKDOWN TABLE OF PROP NAMES. You cannot write
    blocks.ts Monday from a column that says "`rows` | `ref`". Monday stalls in hour one.
J2. **DETERMINISM CONTRADICTS ITS OWN KILL CRITERION.** §1 sells "the same question twice
    gives the same interface"; A3 accepts ">=80% block-type match" = a DIFFERENT interface
    up to 20% of the time. Determinism is a property of the RENDERER (same spec -> same
    pixels), NOT the selection step. The doc sells it as a property of the system.
J3. **PERSISTENCE CONTRADICTS `mry`.** Reason #1 is "re-renders in two years"; A5 tests
    "save a spec, restart, re-render identically". But mry = most recent COMMON year =
    RELATIVE TO NOW. Same spec in 2028 shows different numbers - the exact failure the
    plan indicts mrv for. mry reduces per-country drift to GLOBAL drift; doesn't solve it.
    A5's one-hour restart test CANNOT DETECT IT.
J4. **PHASE B REPEATS THE SIN v4 CONGRATULATES ITSELF FOR FIXING.** §6: resolver "~3-4
    weeks for the full version". §8: "Phase B ~5 weeks" containing B6 (that resolver) PLUS
    package extraction + 3 block renderers + G2 theme emitter + json-render playground +
    a sandboxed code-execution SECURITY BOUNDARY + conformance suite + 2nd renderer.
    Also §4.5's theme work "about a week" sits inside a 9-11 day Phase A = half of it.
J5. TABLE RENDERS IN B2 (weeks 3-7), not Phase A. Phase A ships SIX SCHEMAS AND TWO
    BLOCKS - the model can emit a Table spec nothing can draw. Never said out loud.
J6. DIAGRAMS - one of the user's three named examples - sit in PHASE C, LABELLED OPTIONAL,
    behind an eval harness and pixel goldens. If it's genuinely "GPT-Vis adapter", say
    that and cost it; an adapter for a lib already committed in B2 is NOT Phase-C work.
J7. `ref` HAS TWO INCOMPATIBLE SHAPES, never reconciled. Metric: {source, entity, year}.
    Choropleth fill: {source, year, entities, scale, legend}. Is `fill` a ref? §4.3 says
    every resolved ref carries attribution - does a fill get ONE attribution or 177?
    This is the FIRST decision A0 forces and the doc doesn't make it.
J8. `[ui state]` FORMAT IS ONE ILLUSTRATIVE STRING. Called "the contract" and "the bones",
    and A0's whole purpose is to prove it - but no grammar, no escaping rule, no statement
    of what happens with 8 blocks, no spec for what a Table contributes.
J9. `field` is "an enum" and THE ENUM IS NEVER LISTED. Only `selection` appears anywhere.
J10. ESCALATION TIERS: "blocks must declare it" with NO SYNTAX and no per-block
     declarations. §4.1's "Local interactions" column is prose, not schema.
J11. NO SYSTEM PROMPT EXISTS. A3 sets a threshold on an artifact the doc never drafts,
     sketches, or budgets tokens for. It's the thing that makes or breaks the thesis and
     it's a method call (catalog.prompt()) in a table in §2.
J12. A0's ORDERING IS WRONG. A0 promises "a correct follow-up turn" in 2 hours, but
     whether text-then-tool-call works AT ALL is A1's spike. Either A0 doesn't hit the
     model (then it doesn't prove the follow-up turn) or it's blocked on A1.
J13. THE strict:true / GRAMMAR-COMPILATION CLAIM IS THE ONLY MAJOR TECHNICAL CLAIM NOT
     MARKED "measured" while every geo/WB fact is. Reads like it may be carried from a
     different provider's semantics. VERIFY BEFORE A1 - A1's kill criterion and A3's cost
     both hang off it.
J14. NO COST MODEL AT ALL, and specifically NO SYSTEM-PROMPT TOKEN BUDGET. catalog.prompt()
     generates it from schemas, so IT GROWS WITH EVERY BLOCK ADDED. That is the actual
     scaling cost of the entire approach and it is not discussed once.
J15. ACCESSIBILITY: ZERO WORDS. A canvas globe + canvas charts have no keyboard path and
     no screen-reader story. The doc makes EXACTLY the "retrofit across every renderer
     later" argument about attribution and never applies it to a11y - the more expensive
     retrofit, and the one that blocks anyone shipping commercially.
J16. NO PERSISTENCE/STORAGE FORMAT despite persistence being reason #1. Where does a spec
     live so it can "re-render in two years"? DB? transcript JSON? localStorage? Unstated.
J17. NO REPO LAYOUT / FILE TREE. NO TEAM SIZE ("9-11 working days" for how many people?
     changes whether Phase B is 5 weeks or 15). NO ICON/ILLUSTRATION ASSET STORY (the word
     "icon" never appears; empty states, loading states, legend chrome all need marks).
J18. PATCHES APPEAR FROM NOWHERE. §4.3 has a "patch vs local state" rule but §3 shows the
     model emitting whole block arrays via tool_use, and RFC-6902 is listed in §2 as
     json-render's. Nothing says WHO emits a patch, WHEN, or in what shape. Dead rule.
J19. FIVE "EARLIER DRAFTS" ASIDES = a changelog spliced into a plan. "makes the document
     feel like it's arguing with a ghost rather than telling me what to build." CUT ALL
     FIVE, KEEP THE CONCLUSIONS.
J20. §2's "don't rebuild" table is LOAD-BEARING (B3 makes the playground a json-render app)
     and UNFALSIFIABLE from inside the document. No fallback if catalog.prompt() isn't
     what it sounds like. Plan flags the pre-1.0 risk then couples MORE tightly.
J21. OVERCLAIMS TO THE DOC'S OWN MEASURED STANDARD:
     - "If that 30-second recording exists, the project is proven" = OVERREACH. It proves
       the GLOBE. Not that the vocabulary generalises to table/chart/diagram - which IS
       the thesis, and the two-thirds of the brief Phase A doesn't touch.
     - "about 30 lines, canvas-backed, 60fps on a phone at 177 polygons" - the 30 lines is
       the ROTATE HANDLER. Canvas hit-testing, fill scale, legend, halo channel, settled,
       mobile scroll rules are NOT in it. And "60fps on a phone" is the ONE perf number in
       a doc that measures everything else - it's ASSERTED.
     - "the join - an hour, not a week" is immediately followed by a hand-corrected ~40
       entry CAMERA TABLE that is not in the hour.
     - "Kills streaming jitter as a class" - `settled` has no definition of how you detect
       props stopped changing on a stream THAT CAN SIMPLY PAUSE.
J22. WHAT LANDS: §1 + §3.2 are the pitch ("a product I can see and want"). The
     orthographic-not-WebGL call = "the single best engineering call in the plan". The
     "four props that exist because the obvious version is broken" table = "close to
     exemplary - do that for the other five blocks and the balance fixes itself".
     "digest converts the model's uncertainty into a structured, authoritative-looking
     object" = "the best sentence in the plan". Bones naming + geo table as bones = sharp.
     Conformance-proven separation = "best-handled requirement in the document".
     Join arithmetic CHECKS OUT (174 + Kosovo = 175; 3 no-id + 5 no-WB-row = 7 of 177) -
     but the reader has to do the arithmetic; state the exclusion list as ONE LIST.
J23. DETAIL BALANCE STILL INVERTED: §5+§6 are ~40% of the doc and are "magnificent"; §4 -
     "the artifact" - is SHORTER THAN THE COUNTRY-CODE JOIN and has no schemas.
     "That's not detail crowding out vision - it's detail crowding out THE OTHER DETAIL
     THAT'S ACTUALLY LOAD-BEARING."

## Critic L (final adversarial) - rating 7/10. THE BEST CRITIQUE OF THE LOOP.
L1. **THE UNEXAMINED ASSUMPTION: THIS IS AN APPLICATION, NOT A FRAMEWORK.**
    The brief's load-bearing clause is "build UI around WHATEVER APPLICATION IT IS
    OPERATING FOR". Four rounds fought over globes/joins/digests/schedules - all internals
    of ONE app: a World Bank statistics browser. Round 3 raised it (H11) and **v4 SILENTLY
    DELETED IT** - not answered, not deferred, not refused. DELETED.
    Of the four "bones": blocks.ts = 6 hardcoded blocks; actions.ts = bindings over those;
    tokens.json = genuinely reusable; THE GEO TABLE = a WB/Natural Earth join artifact.
    THREE OF FOUR ARE DEMO-SPECIFIC. ZERO ARE AN EXTENSION POINT. No defineBlock(), no
    resolver registration, no way for a 2nd app to add a block/source/digest without
    FORKING blocks.ts - the file the plan calls the contract.
L2. **"CLOSED VOCABULARY" AND "WORKS FOR WHATEVER APPLICATION" ARE IN DIRECT TENSION AND
    THE PLAN NEVER CONFRONTS IT.** All four of §1's reasons assume the catalog is fixed and
    global. If a host app adds blocks: determinism holds only within one app VERSION;
    persistence means a spec is re-renderable only by the app that emitted it (reason #1
    collapses to "stored React, but JSON"); catalog.prompt() grows per-app; evals don't
    transfer. MUST PICK: one curated pack/one product (honest, smaller - then stop calling
    it THE BONES) OR an extensible catalog (then THE EXTENSION API IS THE ARTIFACT and §8
    is planning the wrong four files). It claims the second while building the first.
    TELL: §1's "nobody has shipped a permissively-licensed block PACK" = a pack claim
    (assets + taste). §8 plans a PLATFORM. Different products, different month-2s.
L3. **THE REF GRAMMAR IS THE REAL HOLE.** Every ref in v4 is a SINGLE SCALAR LOOKUP
    {source, entity, year}. Every interesting request is a QUERY: entities x range x
    filter x order x limit. That grammar EXISTS NOWHERE. And §8 files resolve.ts as
    "innards, not bones" - EXACTLY BACKWARDS: the ref shape is typed into blocks.ts, sits
    in every persisted spec, and is the hardest thing here to change later.
L4. THREE HARD REQUESTS, ALL FAIL, ALL AT THE REF GRAMMAR:
    (a) "compare GDP of the G7 over time" - Chart needs a multi-entity time series
        {source, entities:[7], range:[1990,2024]}; NO SUCH SHAPE SPECIFIED (year is scalar
        or "mry"). The digest returns series12/cagr/gaps so the RESOLVER handles series -
        but the BLOCK PROP THAT REQUESTS ONE IS NEVER WRITTEN DOWN. Hole in the PRIMARY
        chart category. "G7" expands from parametric memory; geo table accepts any valid
        ISO3 so WRONG MEMBERSHIP PASSES SILENTLY; is the EU included (it IS a G7
        participant)? Both defensible -> DETERMINISM FAILS ON A TRIVIALLY COMMON REQUEST.
        "GDP" has >=3 first-class sources; if the model picks current-US$, the
        comparableAcrossTime:false caveat lands in NARRATION while the CHART - the
        persisted, screenshot-able, credibility-lending artifact - shows the misleading
        line. §3.1's own argument, INVERTED, unaddressed.
    (b) "which countries have the worst air quality" - no resolver; WB PM2.5 sparse+stale;
        Open-Meteo CUT for licensing. §7's registry rejects it. **THE PLAN SPECIFIES
        VALIDATION BUT NOT RECOVERY** - no defined user-visible behaviour for "tool call
        validated and rejected". A3's kill criterion proves they know it happens.
        LIKELY MODEL BEHAVIOUR: fall back to a Prose block and narrate from memory.
        **§3.1's no-figures rule GOVERNS ONLY PHASE-1 NARRATION. A phase-2 Prose block
        full of recalled numbers is UNCONSTRAINED - and unlike narration, IT IS PERSISTED.
        Live hole in the plan's signature safety rule.**
        "worst" = rank across all entities + top-N. Table.sort is LOCAL over already-
        fetched rows; ref has no all-entities form and no limit.
    (c) "sort my sales data by region, top 3" - **"MY". THERE IS NO PATH FOR USER DATA
        INTO THIS SYSTEM.** No upload, paste, file, host dataset, connector. Table.rows is
        inline literal = THE MODEL MUST RETYPE THE USER'S DATA AS TOKENS (blows the 250-tok
        claim, caps at a few dozen rows, transcription error). ref points only at public
        resolvers. Round 3 flagged this (H9); v4's response was to add `sort` to Table -
        **IT ADDED THE VERB AND NOT THE NOUN.** No limit/topN either, so the model
        pre-slices to 3 rows, DESTROYING the interactivity that was the point.
        THIS IS THE SECOND OF THE BRIEF'S TWO CONCRETE IMAGES, and it needs no globe, no
        geo join, no camera table, no WB licensing.
L5. **`mry` IS `mrv` WITH EXTRA STEPS.** For entities:"countries" (217 rows) on any sparse
    indicator the strictly-common year is a decade old or EMPTY. No quorum/coverage
    threshold, no fallback defined. Either the hero globe silently renders 2011, or mry
    quietly means "common among those that have data" = mrv, same defect.
L6. **BLOCK IDS ARE NEVER SCOPED ACROSS THE TRANSCRIPT.** Turn 3 and turn 7 both emit "b1"
    -> {"$from":{"block":"b1"}} is AMBIGUOUS and binds to the wrong globe. Correctness bug
    in the file called bones. ONE SENTENCE TO FIX, currently absent.
L7. **[ui state] SCOPE UNDEFINED.** All ten turns' blocks (line grows every turn; model
    must guess which of six globes "zoom in" means) or only the current turn's (spinning
    an older globe is invisible, follow-ups wrong)? States the rule, not the scope.
    THE LOAD-BEARING AMBIGUITY OF actions.ts.
L8. **A5'S TEST IS DESIGNED TO PASS WHILE THE BUG SHIPS.** "Save a spec, restart,
    re-render identically" restarts in MINUTES; mry drifts over YEARS. Fix is trivial
    (FREEZE resolvedYear INTO THE SPEC ON PERSIST) and is not in the plan.
L9. SUCCESS CRITERION PROVES ~NOTHING. Every visible element is old: orthographic globe
    (Bostock 2012, plan says ~30 lines), click-to-update tile (2010), CSS var flip (2015).
    The only new thing is INVISIBLE ON CAMERA (that a model chose the spec) - and a
    recording CANNOT DISTINGUISH A GENERATED SPEC FROM A FIXTURE, and the plan BUILDS
    FIXTURE REPLAY MODE IN A2, so the demo is literally indistinguishable from its own
    test harness. Worse: "show me america" is THE OVERFIT PROMPT - 4 revisions of props
    exist specifically to make THAT FRAME render. The skeptic's first move is "let me type
    something" and the plan has no answer staged.
    THE PLAN'S REAL CRITERION IS A3's (20x3, >=80%, zero invalid codes, threshold written
    first) - a genuine falsifiable generalisation claim, BURIED IN A TABLE CELL while
    "Done looks like" points at the movie. SUCCESS CRITERION AND KILL CRITERION DISAGREE
    ABOUT WHAT MATTERS.
    The token flip is ANTI-PERSUASIVE: proves theming (undoubted) while REVEALING THE
    CEILING - same layout, same blocks, different colors -> "so the AI picked a
    palette-agnostic template."
    WHAT WOULD CONVINCE: three UNREHEARSED prompts typed by the skeptic, one deliberately
    out of vocabulary, where the system VISIBLY SAYS IT CAN'T and degrades honestly. The
    plan's strongest + least-shown idea, absent from the demo.
L10. INTERACTION IS NOT FREE for what users actually reach for:
     - CHANGING THE YEAR is THE interaction for a temporal choropleth. Slider is deferred
       as "app chrome, the commodity". IT IS NOT CHROME HERE - it's the primary control of
       the hero block. Every parameter change becomes tier-3: 3-5s + tokens, per year step.
     - MULTI-SELECT: the plan's own follow-up ("why is it so far behind") is inherently
       two-country. field:"selection" is scalar; Metric.ref takes ONE entity. Changes the
       binding's CARDINALITY and every consumer's shape. Users try this in the first minute.
     - ZOOM: not in local interactions; `zoom` is a spec prop = model call. Mobile forbids
       wheel-zoom and PINCH IS THE MOST REFLEXIVE GESTURE ON A MAP ON A PHONE. The single
       most-attempted interaction has no tier.
     - TIER 2 ISN'T FREE: network round trip + spinner, and tapping fires TWO. The
       abort-token machinery is B6, FIVE WEEKS AFTER THE DEMO -> during Phase A fast
       tapping produces exactly the mislabeled-data bug the plan schedules away from.
     - UNDO: "snapshot not log" is right for the model and REMOVES THE USER'S HISTORY.
       Tap Brazil, want USA back - scrolling up restores nothing. Two sides, one examined.
     - COPY/EXPORT: zero affordance. First thing anyone does with a table of real data.
L11. AFTER 10 TURNS: six live canvases, no teardown/virtualization/off-screen freezing.
     `settled` kills jitter WITHIN a block by changing its height after mount ->
     SHOVES THE TRANSCRIPT under the reading position. Solved in the small, created in the
     large. Cost is MARGINAL-ONLY: "~250 tokens" is per spec; turn 10 carries ten specs,
     ten snapshots, digests with series12 arrays, plus a catalog.prompt() system prompt
     realistically 1.5-3k tokens. NOBODY HAS PRICED A 10-TURN CONVERSATION.
L12. **THE SIMPLER DESIGN THAT GETS 80%:** ONE LIVE SURFACE, AND THE MODEL EMITS A QUERY,
     NOT A BLOCK.
     - Kill transcript-embedded blocks. One versioned panel beside the chat. Deletes: id
       collision, snapshot scope, which-globe ambiguity, six canvases, scroll jump. Gives
       UNDO FREE (versions) and PERSISTENCE FREE (one artifact).
     - SHRINK the vocabulary instead of growing it. Model emits
       {source, entities, range, filter, order, limit} + a ONE-WORD MARK HINT
       (map|line|bar|table|number). Everything else - axes, scale, legend, stacking, color
       channel - is AUTO-ENCODED FROM THE RESOLVED DATA'S SHAPE. Twenty years of published
       citable work (Vega-Lite, "Show Me"/APT, Draco). Model's surface goes from "6 blocks
       x 8 props" to "one query grammar + 5 words" AND IS MORE GENERAL - it answers (a),
       (b), (c) directly because ALL THREE ARE QUERIES. Removes the model's chance to pick
       a wrong scale or forget entities:"countries" - those become RENDERER decisions,
       which is the plan's own §4.2 rule 1 APPLIED ONE LEVEL FURTHER UP.
     - SHIP THE TABLE OVER USER DATA ON DAY ONE. No geo table, no join, no camera table,
       no WB licensing, no Natural Earth politics. Half the brief, one week.
     - KEEP tokens.json + emitters and the 30-line orthographic globe as the `map` mark.
     - STRONGER: for slice 1, ROUTE WITH A HARDCODED SWITCH instead of the model. If the
       interface isn't good with a PERFECT router, the model won't save it. A0 has this
       instinct and the plan abandons it by A3.
     LOST: multiple simultaneous blocks per answer, and widgets-inline-in-a-chat-log.
     THAT AESTHETIC IS THE SOURCE OF MOST REMAINING HARD PROBLEMS AND WAS NEVER ARGUED
     FOR - ONLY ASSUMED.
L13. **WHAT KILLS IT IN MONTH 2 (not the listed risks):**
     1. MONTH 2 *IS* PHASE B, AND PHASE B HAS NO USER AND NO VISIBLE OUTPUT. Five weeks of
        extraction/sandbox/conformance/2nd renderer/full resolver immediately after the
        dopamine hit of the recording, every item making the product look IDENTICAL to the
        demo already shot. Nobody is waiting for any of it because there IS no second
        application and no adopter pulling. "The precise coordinate where prototypes die:
        the demo shipped, the glory is spent, and the next 200 hours are infrastructure
        for a user who doesn't exist." The plan labels itself correctly by accident -
        "glue, done well" - AND GLUE WITH NO SECOND THING TO GLUE IS A PORTFOLIO PIECE.
     2. THE PROMPT IS THE PRODUCT AND NOTHING GUARDS IT. catalog.prompt() is generated from
        schemas, so EVERY schema change rewrites the prompt, invalidates every eval result,
        and invalidates the cached grammar (plan notes this for LATENCY, not CORRECTNESS).
        By month 2: 10 blocks, 3 sources, whack-a-mole - fixing "it uses Chart for
        geographic data" breaks "it uses Metric for single values" - WITH NO REGRESSION
        GATE, because THE ONLY INSTRUMENT THAT WOULD DETECT IT (eval harness w/ thresholds,
        held-out prompts, acceptable-sets) IS SCHEDULED IN PHASE C, "OPTIONAL".
        "The plan measures its thesis once, in A3, then stops measuring it and keeps
        changing the thing being measured. That's not a risk; it's a guaranteed slow decay
        with the detector switched off."

## Round 4 ratings so far: J(fresh eyes)=7, L(final adversarial)=7. K pending.
## Trajectory: R1 5.7 -> R2 6.0 -> R3 6.0 -> R4 ~7.
