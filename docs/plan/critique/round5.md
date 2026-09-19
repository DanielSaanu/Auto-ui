# Round 5 findings — v5 (the sandbox reframe)

Three independent reviewers, distinct lenses, none on the builder's model.
**Ratings: M (brief fidelity) 7.3 · N (implementability) 6.7 · O (red team) 7.3 → 7.1**
Trajectory: R1 5.7 → R2 6.0 → R3 6.0 → R4 7.0 → **R5 7.1**

Note: rounds 5–7 were run on Sonnet. The two reviewers originally launched on Fable 5.1
died with `out of usage credits` and were relaunched; model diversity this round is
therefore lower than rounds 1–4.

---

## Critic M — brief fidelity and fresh-eyes readability — 7.3

M1. **Consequence #6 of the clarification is never named.** "The user is a sufficiently
    sophisticated model" — ergonomics-for-a-model as the design target — appears nowhere as
    its own claim. It is implicit in §4.8's ≤8-props rule and the mark-hint auto-derivation
    but never stated as a response. "Which is exactly the 'silently absent' pattern G1
    forbids."
M2. **Three lifetimes shipped against a brief that said two.** The clarification's binding
    item #3 says "TWO EXPLICIT LIFETIMES"; §4.1 ships ephemeral/session/persistent and
    justifies it by re-quoting "persistent or temporary, interchangeably" without ever
    flagging the count mismatch. Drift, not decision.
M3. **The brief's two loudest asset nouns are the weakest-verified claims in the document.**
    "Sprites" and "pixel art" stop at `[asserted — verify before relying]` with the audit
    pushed to A2, in a document that verifies everything else. Either check them now (15
    minutes) or flag them as the weakest claim, the way §6.1 flags the 60fps figure.
M4. **J19's disease returns in a milder costume.** "round 4"/"v4" each appear **28 times**.
    Most explain the finding inline — better than v4's opaque asides — but several are pure
    scorekeeping with no new information (§6.1 "Round 4 called this the single best
    engineering call in the plan and it stands unchanged"; §4.7 "on day one, not later at
    24").
M5. J23's inversion is fixed, "arguably decisively": §4 ~302 lines vs §6 ~129 and §5 ~77.
M6. **CONSIDER** — diagrams are one of the brief's three named examples, equal in status to
    globe and table, yet land in Phase B while the other two land in Phase A. Justify the
    asymmetry in one sentence or move a minimal Tree/Flow into Phase A.
M7. **CONSIDER** — "painting software" is never addressed as an authoring workflow. §5.3
    says "source art is authored or sourced" without saying how or with what.
M8. **WHAT LANDS:** §4's types are "the first version across 5 rounds a reader could
    actually start coding from Monday morning". §4.6 `Refusal` tied to §8.5's demo framing
    "genuinely resolves L4(b) and gives the demo an honest failure mode". All 10 open items
    traced to a concrete answer. Every PRESERVE item survives, none regressed.

---

## Critic N — technical feasibility and implementability — 6.7

**N re-verified every factual claim against live sources.** All 11 npm facts match exactly.
World Bank re-verified live: default `per_page=50` with `total=70` on the BRA+USA 1990–2024
call, only 50 rows returned, USA's present years truncate to **exactly 2010–2024** (matching
the doc's claim precisely), `unit` is `""`, and a bad indicator returns HTTP 200 with an
error envelope. "The doc's numbers are exact, not rounded."

N1. **§4.7 GIVES ZERO REAL SCHEMAS FOR ANY OF THE 8 BLOCKS — J1 RECURS ONE LEVEL DOWN.**
    §4 opens "Here are the types," then §4.7 delivers *the same table shape as v4's six-row
    original* (now four columns), captioned "this table is an index, not the definition."
    Worst case: **`Choropleth`'s only listed prop is `fill`, whose type is never written
    anywhere in the document** — not `Query`, not a variant of it, just the bare word in a
    table cell. **Round 4's J7 ("`ref` has two incompatible shapes") is not reconciled, it is
    renamed and left unresolved.** This is the actual artifact §4 claims to be.
N2. **§4.2 freeze and §4.5 bindings contradict.** A persisted Choropleth still supports
    drag-rotate, tap-select and scrub-year as local/refetch tiers, but §4.2 says a persisted
    element "renders from its frozen data — offline, forever". Tapping a country or year
    outside the frozen slice needs `/api/resolve` — a live call not captured by `refresh`'s
    version bump. So either "offline forever" is false the moment someone interacts, or
    interaction silently stops working offline. Neither is stated. Separately: a frozen
    `Metric` bound to a live `Choropleth.selection` never says whether the binding
    re-evaluates against the frozen snapshot or triggers a live resolve.
N3. **Guard 2 ("depth tracked server-side") has no field to hold it.** `Element` has no depth
    counter; `Invoke.budget.maxDepth` is a per-element authored ceiling, not a chain counter,
    so nothing in the written schema stops each newly-placed element resetting its own
    `maxDepth=2` and the chain running indefinitely. Mitigated only by the per-space
    `maxCalls` ceiling, which is real.
N4. **Guard 4 (`interval`) has no scheduler.** Firing an interval invoke in a space nobody
    has open needs a worker/cron. Absent from §8's stack entirely and never budgeted a day.
N5. **CONSIDER** — A2 (2 days) bundles CSV/TSV/JSON/XLSX parsing + profiling + full Table
    CRUD + persistence *and* the unrelated asset-licence audit. Two deliverables, one
    estimate.
N6. **CONSIDER** — A5 (2 days) bundles authoring 8 zod schemas, the strict-mode sanitizer,
    the two-phase streaming turn loop, the Refusal validator, *and* running and scoring 60
    eval samples — on top of A1's separate 1-day spike for the same strict-mode question.
    "Optimistic by roughly a day."
N7. **CONSIDER** — no repo layout, data store choice, or migration story anywhere in 810
    lines. Round 4's J16/J17, still unanswered. This makes A3's own estimate unpriceable,
    since what it persists to is unstated.
N8. **CONSIDER** — §3's diagram never shows `place()`/`query()`/`update()`/`remove()` as
    actual tool-use schemas. One discriminated `place` over 8 block variants, or 8 tools?
    This materially changes both §8.4's token pricing and A1's spike scope.

---

## Critic O — red team — 7.3

O1. **THE EXTENSION API IS ASSERTED, NOT DESIGNED.** §2's "a substrate with an extensible
    registry, and the extension API is the artifact" is the document's single highest-stakes
    claim — the direct answer to round 4's headline finding — yet `defineBlock()` and
    `defineResolver()` appear **exactly twice, with no signature**, no pack-version compat
    story (what does `core@1` → `core@2` do to specs written against v1?), and **critically
    no security model: if resolvers are third-party-extensible server code, §7 never mentions
    arbitrary-code-execution risk from a registered resolver.** No second author or second app
    is ever shown exercising the registry. "A table cell standing in for a mechanism, exactly
    the failure mode round 4 punished." → Write the contracts, or downgrade to "one app,
    modular internally" and stop claiming the extension API is the artifact.
O2. **PERSISTENCE-UNDER-TIME IS UNBUDGETED FOR THE FAILURE MODES THAT ACTUALLY OCCUR.** §4.2
    answers only "pack entirely missing" (labelled stub). It never answers an element frozen
    against `core@1`'s prop shape opened by a runtime shipping only `core@3`'s renderer — does
    the runtime keep every historical block-schema version's renderer forever? And storage:
    "`refresh` creates version n+1, keeping n" with **no compaction**, so a space refreshed
    daily for five years accumulates ~1800 full copies of frozen rows. §7's quotas cover only
    uploaded datasets, never `FrozenData` versions. §8.4 prices tokens to the decimal and has
    no line for storage or pack retention.
O3. **B4 IS MISLABELLED AS "THE SECOND APPLICATION".** It proves *renderer* separation — real
    and valuable — but it is the same product, same blocks, same data model, read-only. It is
    not evidence that anyone besides the plan's authors can build a different application on
    the substrate, which is the actual claim under test. "Calling it 'the second application'
    answers the extensibility question by redefining it."
O4. **CONSIDER — B2's diagrams may not survive the query grammar.** `Query` is flat and
    tabular (`select`, `entities`, `filter`, `order`, `limit`) with **no edge or hierarchy
    shape at all**. Tree/Flow/Network either bypass the query-grammar discipline the rest of
    the doc enforces everywhere, or need an unspecified `GraphQuery` variant. §8.2 claims the
    reordering "survives contact with dependencies" and this is the one place it does not get
    pressure-tested.
O5. **CONSIDER** — L12's fuller simplification (one `View{query, mark}` replacing
    Chart/Metric/Choropleth) was only half-adopted. Eight discrete block types remain, which
    is exactly the surface §8.4 calls "the real scaling cost". A paragraph arguing why 8 typed
    blocks earn their keep over one parametrised block would close this either way.
O6. **UNCERTAIN** — the brief's "or some other API/AI agent" may be served by nothing here.
    The tool-calling grammar is verified only against Anthropic's semantics, and the space
    protocol is never checked against a **non-Claude agent writing into an existing space it
    did not build**. Could not tell if deliberately out of scope or a silent gap.
O7. **UNCERTAIN** — whether B4's static-SVG renderer is a separately-buildable codebase (as
    "no React, no DOM" implies) or a build-time flag on the same renderer. No repo layout to
    check against.
O8. **G1 partially undercut:** "not a transcript" is contradicted by `origin: {turn: number}`
    (§4.1) and a snapshot scoped to "session elements from the last N turns" (§4.5) —
    turn-counting, not space-native.
O9. **WHAT LANDS:** freeze-on-persist "precisely kills the year-2028-drift bug round 4 caught,
    and is testable, not asserted". The query grammar "re-checked adversarially and it holds".
    `Refusal` + the `Prose.figures` validator close L4b's hole "in the validator, not a
    convention". No "earlier drafts said" asides found; §4 now proportionate to §5/§6.

---

## Builder decisions

**FIX — all accepted and carried into v6:**
N1 (write all 8 block schemas; reconcile `fill` with `Query` — the J7 fix) ·
N2 (`freeze: "envelope" | "slice"`, the offline envelope) ·
N3 (`Element.invokeChainDepth`) · N4 (name and budget the scheduler) ·
O1 (design `defineBlock`/`defineResolver`, pack versioning, **and the resolver security
model**) · O2 (pack retention + `FrozenData` GC, both priced) · O3 (rename B4's claim) ·
M1 (state the model-as-user consequence) · M2 (acknowledge the lifetime count) ·
M3 (asset licences — see below) · M4 (cut the round-4 scorekeeping).

**M3, acted on during the round rather than deferred.** Verified live:
**game-icons.net is CC BY 3.0** (confirmed from their own about page). **Kenney could not be
machine-verified** — `kenney.nl/assets` returns 200 but the licence text is JS-rendered and
`kenney.nl/license` 404s; Kenney's own GitHub repos are MIT (starter kits) while a
third-party mirror carries CC0-1.0. The honest conclusion is neither "it's CC0" nor "defer":
**the authoritative licence for a Kenney pack is the `License.txt` inside each downloaded
pack**, and that is what the audit must read. v6 states this as method.

**CONSIDER — accepted:** N5, N6 (re-price A2 and A5) · N7, N8 (repo layout, data store,
migration, tool definitions) · O4 (the graph-query shape — B2 is genuinely blocked on it) ·
O5 (argue why 8 blocks beat one parametrised block) · M6 (the diagram asymmetry) ·
M7 (name the authoring tool).

**CONSIDER — deferred, with reason:** O6's non-Claude-agent conformance. Real gap, but
writing a second agent's integration before the first one exists prices a bridge to a shore
nobody has surveyed. v6 states it as an explicit non-goal for Phase A with a named test in
Phase B, rather than inventing a spec for it now.

**Disagreement, recorded:** O8 calls `origin.turn` turn-counting that undercuts the space
reframe. Kept, because a turn ordinal is genuinely useful provenance — but v6 renames the
snapshot's scope rule to be space-native (recency by element, not by turn), which is the part
of the objection that bites.
