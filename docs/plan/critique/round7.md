# Round 7 findings — v7 (final round)

**Ratings: S (schemas) 6.5 · T (red team) 7.7 · U (fresh eyes) 7.8 → 7.33**
Trajectory: 5.7 → 6.0 → 6.0 → 7.0 → 7.1 → 7.43 → **7.33**

The average fell. That is the honest result: two reviewers scored v7 above round 6, and the
reviewer who type-checked it instead of reading it scored it well below, because the headline
fix of round 6 turned out to have a live bypass.

---

## Critic S — the schemas, re-typed from scratch — 6.5

S installed zod 4.6.5 locally, re-typed §4.7, verified the regex in Node, and hit every npm /
World Bank / game-icons endpoint live.

S1. **§4.7 still does not fully compile, and the claim that it does is false.** Line 516 says
    "The schemas, with every referenced symbol defined." Round 6 named three dangling symbols
    and v7 fixed **exactly those three** — "a narrow, name-matched patch, not a type-check."
    Still undefined anywhere: `PathSegment`, `ParamSlot`, `Path`, `EntityDef`, `Gesture`,
    `Tier`, `RenderCtx`, `Receipt`. **The identical defect class one level down, in the same
    section the builder claims closed.**
S2. **`EntityDef` matters most**: §2.3 and the Choropleth comment claim entity-kind is
    "enforced at registration… via `EntityKind` declared by `EntityDef`" — but `EntityDef` is
    never defined, so the claim cannot be confirmed, and it is what §7.3's exfiltration closure
    also rests on.
S3. **THE `Prose` REGEX HAS A LIVE BYPASS CLASS.** The document's five stated cases all verify
    true. But `hasBareFigure("raised USD100 million in funding")` → **false**;
    `"a magnitude M5 earthquake struck"` → **false**; `"grew to R5000 per capita"` → **false**;
    fullwidth `"４５０ million"` → **false**. The `WORD_DIGIT` lookbehind meant to whitelist
    "G7"/"H1N1" **also whitelists any fabricated number prefixed by a letter** — currency codes,
    magnitude letters, unit abbreviations — "a completely natural pattern in financial and
    scientific prose." This is the fix billed as repairing the worst defect of six rounds, and
    it lets fabricated figures into persisted, screenshot-able artifacts: exactly the harm §3.1
    exists to prevent. Spelled-out numbers also pass, never claimed caught but inside §3.1's
    stated scope of "any number".
S4. **`registerRenderer` lost the type link.** `pack`/`block` are plain strings with no
    type-level connection to the `BlockDef<P>` registered under them; `P` is inferred from the
    render function passed in, so `registerRenderer("core","Choropleth","react",drawMetricReact)`
    **compiles cleanly**. "Splitting `render` out of `BlockDef` traded a structural-typing
    failure for a silent one."
S5. `corePack` calls `defineBlock()` for 2 of 8 blocks; the rest are asserted by comment. With
    `Gesture` and `Tier` undefined, "the same shape" is not even a checkable claim.
S6. **P5 is reframed, not resolved for one case.** `digest()`-as-platform-code genuinely covers
    CAGR, gaps and the `mry` quorum — correctly reasoned. But Appendix A's own flagship example,
    `region.id !== 'NA'`, is **World Bank-specific domain knowledge**, and nothing in
    `ResolverDef` shows how a third-party pack would declare it.
S7. **A4's 4 days** leaves ~half a day for scrub, pinch and the real-device measurement combined.
S8. **Verified true, live:** all 11 npm pairs; game-icons "Creative Commons 3.0 BY license"
    verbatim; World Bank `per_page:50, total:70` and `unit:""` on both observation and indicator
    metadata; **`.strict()` before `.refine()` works correctly in real zod 4.6.5**; Phase A sums
    to exactly 17.0.

---

## Critic T — red team — 7.7

T1. **"Redirects are not followed" is presented as a free win** with no cost analysis. Real APIs
    redirect constantly (http→https, `/v2`→`/v2/`, trailing-slash normalisation). A same-host
    upgrade-only exception is not even considered.
T2. **"The connection is pinned to that checked address" is asserted with no implementation
    path.** Node's `fetch`/undici cannot do this without a custom dispatcher with a custom
    `lookup`. "Contrast the JSONPath fix, which explicitly says 'implemented in-house' to name
    its cost — DNS pinning gets no such honesty."
T3. **`entities.ids` closure is unspecified for `EntityKind: "generic"`.** For geo entities the
    table is a fixed ISO3 list; for arbitrary pack-declared entities the document never says
    whether the table is a bounded enumeration or a pattern match. If the latter, `entities.ids`
    is free text again and the exfiltration fix is open.
T4. **NEW: cross-tenant cache poisoning.** `cache.keyFields` is **resolver-declared**, not
    platform-enforced to include a space or tenant id. A sloppy or hostile pack author can omit
    a discriminating field and let one space's query populate another's cache slot. Never
    addressed.
T5. **"No open block registry" is an honest retreat, not a gutting** — §1's substrate claim
    survives because it never promised a public marketplace, only a registry the app operator
    populates. B6 is "self-aware theatre": it tests API ergonomics for *this* author, not the
    communication gaps a stranger would hit. The document admits this, which earns credit
    without making it evidence of extensibility.
T6. **NEW UNEXAMINED ASSUMPTION: `title`/`tags` are optional and nothing populates them.**
    §4.11's whole Phase-B pitch depends on `find_elements` searching them, but `place()` marks
    both optional with no validator requirement and no derived default. **"The exact scenario
    the document claims to have solved sits on an input nothing guarantees exists."**
T7. **Three hard requests still failing:** comparing an element against a specific past version
    (no `BoundField` addresses a version); bulk or filtered removal (`remove` is single-element,
    while undo is claimed in scope); rearranging elements (free layout explicitly deferred, only
    `Stack` and `layout.group` exist).
T8. **A3's bundling was relocated, not resolved.** A3b still carries seven subsystems including
    the full four-role access model in 2 days — the same finding as round 6, moved one letter
    down. Full RBAC for one solo owner and one agent is "premature weight in the v0 critical
    path."
T9. The 5-year retention figure remains asserted precision with no basis.

---

## Critic U — fresh eyes — 7.8

U1. **The two-sentence test passes** and §1.2's "why worth building" lands in under a page.
U2. **First stall:** `RenderTarget` includes `"ink"`, "introduced and never mentioned again —
    not built in Phase A or B, not explained, not costed."
U3. **Second stall:** `MeasureDef`/`ResolverDef` remain plain TS interfaces with **no zod
    counterpart**, "an unexplained asymmetry after the document went to real trouble to fix
    exactly this class of dangling-schema bug for blocks."
U4. **All six clarification consequences are visibly, honestly answered**, including the
    lifetime-count mismatch named rather than hidden, and the `interval` cut reasoned. Of the
    three named examples, **diagrams remain parked** — `GraphQuery` is typed but no diagram
    block schema exists.
U5. **§4 is 44% of the document, up from the 42% flagged last round.** The World Bank move to
    Appendix A worked; the rebalance did not. Numbered subheadings keep it navigable, so this is
    real but not crippling.
U6. **RESIDUAL SCOREKEEPING, a new leak:** line 823, "none of which **v6** could express" — a
    direct reference to a prior draft, "inside the very passage added to fix round 6's finding.
    This is exactly the defect class G10 was meant to have eliminated."
U7. **Verified fixes from round 6, spot-checked, mostly real:** P1, P2, P3 (correct order
    confirmed), P4 (traced by hand — closes the `$100` / `5% rise` hole), P6, Q3–Q5, Q8's honest
    "taste call" reframing, Q2's B6 scoping, Q9/Q11's find/duplicate/group.

---

## Builder decisions — all FIX items acted on, in v8

**S3 first, because it is the same defect the previous round called the worst in six.**
Reproduced in Node: all five of S's attacks pass the v7 validator. Replaced with a **closed
reviewed lexicon** — NFKC-normalise, strip `{{fN}}`, remove only enumerated digit-bearing names
(`G7`, `H1N1`, `PM2.5`, `COVID-19`, …), then any remaining digit rejects. **[measured, Node
v24.13.0]** it now rejects all five attacks plus fullwidth `４５０` and circled `②`, and still
accepts every lexicon term and `{{fN}}` form. The permission is *enumerated, not inferred*,
which was the actual error. The spelled-out-numbers gap is stated in the code comment rather
than left to be discovered, and A6 now runs this as a **property test** — hand-picked cases are
how the previous version passed review.

**S1/S2** — `PathSegment`, `ParamSlot`, `Path`, `EntityDef`, `Gesture`, `Tier`, `RenderCtx` and
`Receipt` are now defined in §2.2. `EntityDef` carries a **bounded, enumerable** `table` and a
declarative `exclude` — which also gives **S6**'s `region.id !== 'NA'` a home a third-party pack
can express, and **T3**'s closure its guarantee: a pack whose entities are not finite cannot be
third-party. **S4** — `registerRenderer` is now parametrised over the pack so a mismatched
renderer is a compile error. **S5** — `Table` added as a second worked `defineBlock`. **S7** —
A4 split into A4a/A4b/A4c.

**T1/T2** — the redirect rule keeps its security property but now states what it breaks and
moves the failure to install time; connection pinning names its mechanism, verified: `http.Agent`
accepts a custom `lookup` natively **[measured, Node v24.13.0]**, while the global `fetch`
requires an explicit `undici` dependency and a dispatcher. **T4** — the platform now prepends
`{spaceId, packId, packVersion, resolverVersion}` to every cache key and a pack may only add,
making cross-tenant reuse structurally impossible. **T6** — `promote()` takes a **mandatory
`title`**; optional metadata nothing compels an agent to write is metadata that will not exist.
**T7** — version comparison, bulk removal and rearranging are now named as explicit deferrals
rather than silent gaps. **T8** — access split into A3c and **reduced to owner + agent for the
v0**, with the four-role matrix deferred to B4 where sharing first makes it mean anything.
**T9** — the retention figure is replaced by "a stated minimum, published per major", with the
number deferred until there is something to base it on.

**U2** — `"ink"` removed. **U3** — `ResolverDefSchema`/`MeasureDefSchema` stated as zod, since a
descriptor from outside is untrusted input exactly like a spec. **U4** — a `Diagram` props
sketch added so the third named example is designed rather than merely postponed. **U5** — a
sub-index added at the head of §4. **U6** — the `v6` reference deleted, and a second one this
round's own edits introduced was caught by grep and removed too.

**Corrected while editing:** Phase A's stated total and the v0 figure no longer matched the
table once A3 and A4 were split. Re-summed from the rows: **Phase A is 18 days and the v0 is
9.5**, not the 17 and 8 the text claimed.

**Disagreement, recorded.** T5 calls B6 theatre. Kept as-is: with a team of one it is the
strongest test available, the document says so in those terms, and replacing it with nothing
would be worse than running a weak test honestly labelled.
