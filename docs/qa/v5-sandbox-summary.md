# QA loop summary — rounds 5–7, the sandbox reframe

Three rounds, three independent reviewers each, none on the builder's model. Target 8.5.
**Not reached.** The loop ran its full allowance and stopped.

Round files stay in `docs/plan/critique/` beside rounds 1–4 rather than moving to an archive
folder — that is where this repo's earlier rounds already live, and the verbatim reports are
the data from the experiment.

## Scores

| Round | Reviewers | Score | The round's main finding |
|---|---|---|---|
| 1–4 | 12 (prior loop) | 5.7 → 6.0 → 6.0 → 7.0 | "Application or framework? — pick one." Never answered. |
| **5** | M 7.3 · N 6.7 · O 7.3 | **7.1** | §4 announced types then gave a table; the extension API was a table cell standing in for a mechanism. |
| **6** | P 7.0 · Q 7.7 · R 7.6 | **7.43** | The schemas did not compile. The security model proved no-RCE and stopped. |
| **7** | S 6.5 · T 7.7 · U 7.8 | **7.33** | The figure-ban validator had a live bypass class: `USD100`, `M5`, `R5000` all passed. |

The final round's average fell. Two reviewers scored v7 above round 6; the one who type-checked
it instead of reading it scored it well below, because round 6's headline fix turned out to
leak. That is the loop working, not the loop failing — but it is why the number went down.

## What the clarification changed

The 2026-09-19 brief clarification arrived between rounds 4 and 5 and resolved the finding two
rounds had failed to close. "Application or framework?" had no good answer because both were
wrong: it is a **substrate** — a persistent, agent-addressable space. That reframe demoted the
World Bank statistics browser from "the product" to one demo, and it made persistence the
product rather than a justification for a design choice.

## What was fixed, by round

**Round 5 → v6**
- All 8 block schemas written as real zod; `Choropleth.fill` reconciled to one `DataSource`
  shape — the J7 finding four rounds had left open.
- `defineBlock`/`defineResolver`/`definePack` given signatures; resolvers made **declarative
  descriptors rather than code**; pack versioning and a retention policy added.
- `freeze: "envelope" | "slice"` resolved the contradiction between "renders offline forever"
  and a frozen element still offering tap-select and year-scrub.
- `Element.invokeChainDepth` made server-written, closing the self-reset exploit.
- `FrozenData` compaction and a shared quota, priced. `GraphQuery` specified. Repo layout,
  Postgres/S3 store, migrations and tool definitions written. Phase A repriced.

**Round 6 → v7**
- The schemas made to compile: `QuerySchema`, `BindingSchema`, `MeasureDef` defined as real zod
  values; `corePack` made to satisfy `PackDef`; `Table`'s `.strict()` moved before `.refine()`.
- **The `Prose` figure validator rewritten** after it was found to exempt `%`-suffixed and
  `$`-prefixed numbers — "a 5% rise" and "$100" passed the document's signature safety rule.
- Security extended past RCE: slots restricted so `filter` never reaches a third party,
  connection pinning, redirect refusal, an in-house restricted path subset. All of §7 tagged
  `[asserted]`.
- **"No open block registry"** stated plainly, since `render` is code — replacing an implied
  marketplace with an honest scope boundary.
- Access control, `find_elements`/`duplicate`/`group`, `RefreshPolicy` split from `invoke`,
  `interval` cut, the eight-blocks argument downgraded to an honest taste call, a named v0.

**Round 7 → v8**
- **The figure validator rewritten again**, correctly this time: the "any letter then digits"
  permission that admitted `G7` also admitted `USD100`, `EUR250`, `M5` and `R5000`. Replaced
  with a **closed enumerated lexicon** plus NFKC normalisation. Verified in Node: rejects all
  reported bypasses plus fullwidth and circled digits; accepts every lexicon term. A6 now runs
  it as a **property test**, because hand-picked cases are how the previous version passed.
- Eight remaining dangling symbols defined, including `EntityDef` — which also gave the World
  Bank aggregate-exclusion rule a declarative home and made the exfiltration closure provable.
- `registerRenderer` parametrised over the pack, so a mismatched renderer is a compile error
  rather than silently accepted.
- Redirect and DNS-pinning costs named and the mechanism verified; cache keys made
  platform-prefixed so cross-tenant reuse is structurally impossible.
- `promote()` given a **mandatory `title`**, without which the search feature searched nothing.
- Access reduced to owner + agent for the v0; retention number deferred; `"ink"` removed;
  a `Diagram` props sketch added; totals re-summed (Phase A is 18 days, v0 is 9.5).

## What was preserved across all seven rounds

Every item on the PRESERVE list survived, and reviewers re-verified the factual ones live in
each of rounds 5, 6 and 7:

- Don't rebuild `json-render` or GPT-Vis. All 11 npm version/licence pairs re-verified three
  times, matching exactly each time.
- `d3.geoOrthographic` over WebGL — ~56 KB against ~600 KB, and the reasons.
- The country-code join: world-atlas ids *are* ISO-3166-1 numeric; 174/177; one override.
- The digest laundering findings — World Bank `per_page=50` truncating a 70-row call to 50 and
  moving the USA's first year from 1990 to 2010; `unit` empty; Brazil 5.24% current vs 2.36%
  constant. Re-verified live in rounds 6 and 7.
- Closed bindings, resolver registry keys, no model-supplied string in a URL.
- Licensing: Open-Meteo non-commercial, Wikipedia client-impossible, World Bank CC-BY
  propagating to every chart.

## What was deferred, and why

| Deferred | Why |
|---|---|
| Diagram blocks | Need `GraphQuery` implemented plus an adapter — a dependency the globe and table do not have. Props now sketched so it is designed, not postponed. |
| 3D / meshes | A format decision, a second renderer, a licence surface, and no good a11y answer. A second product. |
| Open block registry | `render` is code; needs a renderer sandbox first. |
| Code-backed resolvers | Descriptors cover every source considered. |
| `interval` agent timers | Cut entirely — `RefreshPolicy` covers the real want with no model call. |
| Spatial layout, version comparison, bulk delete | Named as explicit gaps rather than left silent. |
| Non-Claude agent integration | Given a shape (`Principal` + narrower `packs` grant); the integration is not Phase A work. |
| Retention duration | No usage data, no cost model, no users. A minimum exists; the number waits. |

## Open FIX items — none

Every FIX item from rounds 5, 6 and 7 was acted on. Round 7's were applied to v8 after the loop
closed, so **v8 has not been reviewed by anyone.** That matters: each previous round found that
the fix for the last round's headline defect introduced or concealed a new one — twice in a row,
on the same validator. v8's changes deserve the same scrutiny, and have not had it.

## Where it stands

**v8 is the current plan.** It answers all ten of the original open items, all six consequences
of the clarification, and every FIX item raised in three rounds. It is rated 7.33 in its v7
form; the v8 edits address the findings that produced that number but are unscored.

**The honest read on 8.5:** the gap is no longer conceptual. Rounds 5–7 found no structural
objection that survived — the substrate question is settled, the query grammar holds under
adversarial re-derivation, persistence has a mechanism rather than a promise. What kept pulling
the score down was **execution defects in the artifact itself**: symbols that did not resolve,
a regex that did not do what its own comment claimed, totals that did not add up. Those are
found by type-checking and running things, which is what a fourth round would do — and, given
that two consecutive rounds found the previous round's flagship fix broken, is what it should
do before any code is written.

## What to look at first

1. **Run the `Prose` validator against your own adversarial strings.** It is the safety
   mechanism the whole no-figures rule rests on, it has been wrong twice, and it is ~8 lines.
   Try currency codes, units, ordinals, spelled-out numbers.
2. **Decide whether the v0 is the right 9.5 days** (§1.4, §8.3: A0–A3c plus A6). If the answer
   to "does this work at all" is not in those items, the phase table is wrong.
3. **Read §2.4 and §7.4 together** — "no open block registry" is the biggest scope decision in
   the document, and it narrows what "extensible substrate" means. It is defensible; it should
   be a decision you make, not one you inherit.
4. **Check §4.4's eight-blocks reasoning.** It is explicitly a taste call with a stated collapse
   condition. If you disagree, collapsing to one `View {query, mark}` is a smaller system and
   the query grammar survives intact.
5. **The asset tier was the least-verified part of the plan** (§5.1) and it is half the brief.
   Resolved after the loop closed, by the method the plan prescribes: clone a pack and read it.
   Kenney ships **MIT code and CC0 assets** — both signals that looked contradictory from
   outside were true about different things. The survey also found that 2 of 7 packs contain
   separately-attributed third-party items, and that the account includes a **GPL-3.0** repo, so
   the audit key stays the pack rather than the author. §5.1 records this.
