# Round 6 findings — v6

Three independent reviewers, distinct lenses, none on the builder's model.
**Ratings: P (schemas) 7.0 · Q (red team) 7.7 · R (fresh eyes) 7.6 → 7.43**
Trajectory: 5.7 → 6.0 → 6.0 → 7.0 → 7.1 → **7.43**

---

## Critic P — the schemas, audited as an implementer — 7.0

**Verdict: §4.7 does not compile as written.** Three defects, found by reading it as someone
who has to type it in.

P1. **Dangling schemas.** `DataSource` uses `query: QuerySchema`; `Bound()` uses
    `BindingSchema`; `Refusal.suggest[].query` uses `QuerySchema`; `ResolverDef.measures`
    uses `MeasureDef`. **None of `QuerySchema`, `BindingSchema` or `MeasureDef` is ever
    defined as a zod value anywhere in the document** — only `type Query` and `type Binding`
    exist, as plain TS interfaces, which are not zod objects. `DataSource`, the thing the
    document calls "THE ONE DATA SHAPE" and hangs the whole Choropleth reconciliation on,
    references an identifier that does not exist. "The same class of gap rounds 4 and 5
    punished, one level down: the table of prop names became real code, but the code
    references undefined symbols."
P2. **`corePack` does not satisfy `PackDef`.** §2.2 types `blocks?: Record<string,
    BlockDef<any>>`, and `BlockDef` requires `name`, `props`, `tiers`, `fields`, `mobile`,
    `a11y`, `render`. §4.7 passes bare `z.object(...)` values with none of those. Fails
    structural typing. **`defineBlock()` is never actually called anywhere in the document.**
    Worse: `BlockDef.render` is a *single* function, but §8.1's repo layout has **three**
    renderer packages (`packs-core`, `render-svg`, and B4's static SVG). One field, three
    implementations, unaddressed.
P3. **`Table` breaks the `.strict()` pattern.** Every other block ends `.strict()`; `Table`
    ends `.refine(...)` with none. In zod, `.refine()` returns `ZodEffects`, which **has no
    `.strict()` method** — it must be called on the `ZodObject` *before* `.refine()`. "The doc
    looks like exactly this mistake was hit and silently abandoned rather than fixed, leaving
    Table — the block that takes user-uploaded arbitrary rows — as the one block without
    closed-object discipline."
P4. **THE `Prose` REGEX FAILS IN THE DANGEROUS DIRECTION.**
    `/(?<![\w$#])\d[\d,.]*(?![\w%])/` over-rejects "COVID-19" (cheap — a retry), but
    **"a 5% rise" and "$100" do not match at all**: the trailing `(?![\w%])` exempts
    percent-suffixed numbers and the leading `(?<![\w$#])` exempts dollar-prefixed ones. "So
    percentage claims and dollar-figure claims — the two most common vectors for fabricated
    economic statistics in exactly this app's domain — sail through §3.1's signature safety
    rule unchecked. This is the opposite of the document's stated bias and is a load-bearing
    bug, not a style nit."
P5. **`defineResolver` cannot express what §6.3 and §4.2 require of it.** The descriptor is
    one parameterised GET plus JSONPath. It cannot do the second call for indicator-metadata
    `units`, CAGR/gap computation, or the `mry` quorum (coverage %, `excluded[]` across
    candidate years) — all genuinely imperative. Either `digest()` is first-party code outside
    the "resolver = declarative" model, which is **never stated**, or third-party resolvers get
    only the naive digest §6.3 itself calls "a laundering mechanism" — silently reintroducing
    the exact danger that section exists to kill, for every pack except `worldbank`.
P6. **A4 undercounts against the document's own numbers.** §8.3 sums correctly to 15.0 days,
    but §6.1 states the Choropleth block alone is "~3 days" and §6.2 adds the camera table as
    "a separate ~half-day, not folded in" — 3.5 before year-scrub UI, pinch handling, or the
    real-device 60fps pass A4 also promises.
P7. **Choropleth/Metric reconciliation is nominal, not typed.** Both being `DataSource` does
    not reconcile cardinality (one value vs 217) or entity kind — `EntitySel` has no geographic
    constraint, so `fill.query.source` could point at a non-geographic dataset and nothing in
    the type catches it.
P8. **All factual claims re-verified correct**, live: all 11 npm version/licence pairs match
    exactly; World Bank `per_page=50` with `total=70` confirmed, `unit:""` confirmed;
    game-icons.net's about page confirms "Creative Commons 3.0 BY license" verbatim.

---

## Critic Q — red team — 7.7

Q1. **Round 5's fixes are mostly real, not renamed.** N1, N2, N3, N4 and O2 are substantive.
    O1 is mostly real but leaves an ungoverned seam: `base` is allowlist-checked "at
    pack-install time" and **nothing says who administers that allowlist** for a third-party
    author's new host — for a one-person team, either a bottleneck on every resolver or an
    unstated auto-approval.
Q2. **O3's B6 is the weakest fix.** "A second pack by a second author" has **no name, no day
    budget, no scope, and no kill criterion**, and it collides with §8.1's own "Team size:
    one" — B6 requires a person who does not exist in the plan's staffing.
Q3. **SECURITY: EXFILTRATION, NOT EXECUTION.** §2.3 proves a resolver cannot run code and
    stops there. But `filter.value: string|number` and `EntitySel.ids` are free user/model text
    slotted into an allowlisted third-party author's own request — **a malicious resolver
    author can simply declare a slot and harvest whatever text a query carries.** §7.3 never
    mentions this class of risk at all.
Q4. **SECURITY: redirects and DNS.** The egress re-check does not say whether the checked IP is
    the one actually connected to (pinned) or a fresh lookup (still rebindable), and
    **redirects are never mentioned** — a 302 from an allowlisted host to `169.254.169.254` is
    a standard allowlist bypass this design does not address.
Q5. **SECURITY: JSONPath is asserted safe with no library named and no dialect stated.** Some
    JSONPath implementations evaluate filter/script expressions (`?()`), which would put code
    execution straight back in. Unverified, unlike every npm fact in the document.
Q6. **SECURITY: block `render` is unsandboxed trusted code, and gets none of the design effort
    resolvers got.** §7.3 admits it and moves on. Full render-context access. "'Warned action'
    for something pitched as click-and-install is thin," and it is a much bigger surface than
    the resolver.
Q7. **The security claims carry no `[asserted]` tag** despite being unverified implementation
    behaviour — the one place the document's own labelling discipline is not applied, and it is
    applied to its highest-stakes new material.
Q8. **§4.4's argument for eight blocks is self-serving.** Reason 1 is false: a discriminated
    `View{mark}` with `.superRefine` keyed on `mark` gets the same "geographic mark needs
    geographic entities" check natively. Reason 2 proves the surface is the same size either
    way. Reason 3 genuinely defends *three* types, not eight. "The section knocks down a
    strawman and declares victory for the shipped number without arguing why 8 and not 4." §4.8
    already collapses to one discriminated `place` tool, undercutting the framing entirely.
Q9. **NEW UNEXAMINED ASSUMPTION: an accumulating space has no spatial or navigational story.**
    `layout?: {span, minH}` is the only spatial primitive in ~900 lines. `list_space` is an
    *agent* tool, not human UI. For the brief's own scenario — "as I write more more things pop
    up and persist" — there is no search, no grouping beyond `Stack`'s 12-child cap, no
    archive, no way for a human to find an element placed three months ago among fifty.
Q10. **Freezing conflates two readings of "persist".** §4.2 resolves persistent as *frozen*,
     which is one reading of "persist so long as the server exists" but not the only one. A
     user wanting an always-live ticking metric has no path: `refresh` is manual, and
     `interval` is scoped only to agent-invoking controls, not silent data refresh.
Q11. **Three hard requests that still fail:** (a) "find the map I made a few weeks ago about
     Brazil" — no search layer; (b) "keep this GDP tile updated automatically" — freeze mandate
     plus no auto-refresh primitive; (c) "duplicate this chart with different countries" /
     "group these five together" — the tool list has no duplicate or reparent op, and `Stack`
     is a layout container, not a folder.
Q12. **A3 is the most bundled line item in Phase A** (Postgres schema, migrations, lifetimes,
     versioning, compaction, undo, snapshot cap — 3 days) and is exempted from the document's
     own anti-bundling logic, the same logic used to justify splitting A5/A6.
Q13. **Brief fidelity drift.** Freeze, versioning, compaction, 5-year retention with a UI
     countdown, an egress allowlist, a licence-audit CI gate, Postgres+S3+migrations — all
     legitimate for the claims made, but the brief called this "a prototype" whose top half gets
     thrown away. "The plan has quietly become the permanent product's plan rather than the
     prototype's, with no discussion of a smaller v0 that defers governance machinery until the
     thesis is validated."

---

## Critic R — fresh eyes, brief fidelity, the document as a document — 7.6

R1. **The two-sentence test passes.** "A persistent, agent-addressable UI substrate where a
    model places typed elements from a fixed registry instead of writing code, so the result is
    cheap to render, provably on-theme, and survives after the model stops talking."
R2. **All six consequences of the clarification are visibly answered**, including the lifetime
    count (§4.1 "On the count" names the mismatch and gives a collapse plan) and the
    model-as-user consequence (§1.1, now its own subsection).
R3. **Diagrams are effectively parked.** `GraphQuery` is typed but **no diagram block schema
    exists**, and the Phase-B placement is never argued against globe and table landing in
    Phase A.
R4. **The document has become heavier than "a prototype".** Concretely: a **5-year** retention
    commitment before a line of code exists; a DNS-rebinding-safe allowlist plus a cron+queue
    scheduler fully engineered for a feature that ships `intervalsEnabled: false`. "The bones
    themselves have grown to include chain-depth tracking, three lifetimes, a
    versioning/retention policy and a resolver security model — a lot to freeze permanently for
    something the user called throwaway on top."
R5. **Balance has re-inflated, not resolved.** §4 is now **451 of 1072 lines — 42%**, up from
    302/810. §6 (~123 lines) is substantially World Bank digest minutiae — a demo pack the
    clarification says "was never the product" — and outweighs §5 (assets, ~80 lines), which the
    same clarification calls half the brief.
R6. **The prose fix worked, verified by grep: zero matches** for "Round", "v4", "v5", "prior
    round", "four rounds". One faint residual — "what made earlier estimates read in days" — with
    no version tag.
R7. **Missing:** no TOC or glossary across 1072 lines introducing a dozen load-bearing terms
    (envelope, tier, digest, pack, invoke, freeze). **No access-control or ownership model for a
    space** — who may write to it, who may trigger `invoke` — despite the space being explicitly
    multi-agent-addressable. No visual diagram of the Space/Element/Binding relationship, in a
    document planning a visual system.
R8. **Three weakest passages:** §6.3's WB deep-dive (demo detail crowding a downgraded demo);
    §2.4's "5 years" (asserted precision, no basis); §8.6's narrative and the paragraph after it
    restate each other.

---

## Builder decisions

**FIX — all accepted into v7.** The schema defects first, because a contract that does not
compile is not a contract:
P1 (define `QuerySchema`/`BindingSchema`/`MeasureDef` as real zod) ·
P2 (make `corePack` satisfy `PackDef`; split `render` out of `BlockDef` so three renderer
targets can each register) · P3 (`.strict()` before `.refine()` on `Table`) ·
**P4 (rewrite the `Prose` validator — it currently lets `5%` and `$100` through, which is the
single worst defect found in six rounds)** · P5 (state that `digest()` is first-party platform
code, and make the source-specific parts declarative fields so third-party packs get the rich
digest too) · P6 (re-price A4) · P7 (constrain `fill` to geographic entity selectors).

Q3 (name the exfiltration class; restrict which `Query` fields may fill third-party slots) ·
Q4 (pin-then-connect; forbid or re-validate redirects) · Q5 (restricted JSONPath subset, our
own evaluator, no filter expressions) · Q6 (a containment posture for block `render`) ·
Q7 (`[asserted]` on every unverified security claim) · Q2 (B6 gets a scope, a budget, a kill
criterion, and an honest answer to the staffing contradiction) · Q8 (argue the number or admit
it is a taste call) · Q9 + Q11a/c (a navigation, search and grouping story) ·
Q10 (state the interpretation of "persist"; give live data an explicit path) ·
Q12 (split A3) · Q13 (name the v0 inside the plan).

R3 (argue the diagram asymmetry) · R4 (mark governance machinery design-now-build-later) ·
R5 (move the WB minutiae to an appendix; expand §5) · R7 (TOC, glossary, **access-control
model**) · R8 (merge §8.6's duplicated paragraphs; cut the residual aside).

**Disagreement, recorded.** R4 and Q13 both read the 5-year retention as over-commitment. Kept
as a *stated policy* rather than built machinery, because "how long is forever" is the question
the brief's own persistence ask raises, and refusing to answer it is worse than answering it
provisionally. v7 marks it explicitly as a policy decision with no code behind it until B-phase.
