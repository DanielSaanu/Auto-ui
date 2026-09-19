# A0 implementation — QA loop summary

Three rounds, three independent reviewers each, none on the builder's model. Target 8.5.
**Not reached.** The loop ran its full allowance and stopped.

## Scores

| Round | Reviewers | Score | The round's defining finding |
|---|---|---|---|
| 1 | A 7.4 · B 7.2 · C 7.3 | **7.3** | Access escalation; prototype drift; unvalidated reopen; and the figure validator wrong a 3rd *and* 4th time |
| 2 | D 7.1 · E 7.6 · F 8.2 | **7.63** | Two of three new defects were **created by round 1's fixes** |
| 3 | G 6.6 · H 7.8 · I 7.7 | **7.37** | Round 2's fixes reopened all three of their own defect classes in sibling code |

**Tests: 53 → 94 → 115 → 130.** `tsc --noEmit` clean throughout.

## What the loop actually demonstrated

The score went up, then down. That is the honest shape, and the reason is the same in every
round:

**A fix aimed at a reproduction, rather than at a class of problem, reopens the same bug
next door.** Round 2 capped recursion depth in `setLocal`; round 3 found three unbounded
walks including one that runs *before validation*. Round 2 made a real id beat a placeholder
for live elements; round 3 deleted the element first. Round 2 stopped a stub being re-stubbed;
round 3 found the same `continue` also skipped validation and the byte recompute.

Three rounds, one lesson, learned late: **fix the class, not the repro.** The round-3 fixes
were written that way — one `MAX_VALUE_DEPTH` threaded through every walk, one structural
prefix rule instead of a liveness check, one shared title helper instead of three copies.

## The second lesson: a test that names a behaviour may not test it

Three separate times, across two rounds, a test named a behaviour and asserted something
adjacent:

1. Round 1 (found by C): `expect(lines[1]).not.toContain(b === a ? "" : a)` — a dead ternary.
2. Round 2 (found by E): the pinned-ordering test reached into the object `get()` returns and
   mutated it, because no public API could set `pinned`. Committed *in the pass that answered
   round 1's test-honesty finding.*
3. Round 3 (found by H, by mutation): deleting the "real id wins" branch left all 115 tests
   green. The test named after it exercised a different guard.

Only mutation testing caught the third. Reviewers who mutation-tested found things reviewers
who read code did not, every round.

## The figure validator, four failures

The one rule the whole no-hallucinated-figures claim rests on:

| Attempt | Leaked |
|---|---|
| anchor on `$` and `%` | `"a 5% rise"`, `"$100"` |
| allow digits after a letter (to admit `G7`) | `"USD100"`, `"EUR250"`, `"M5"`, `"R5000"` |
| test `\p{Nd}` | `"Ⅹ"` (Nl), `"〡〢〣"` (No) |
| test only the NFKC form | `"Ⅹ"` again — NFKC folds U+2169 to the letter `X`, destroying the numeric property before the test runs |

Now: `\p{N}` against **both** raw and normalised text, minus a closed reviewed lexicon. The
header of `figures.ts` lists all four leaks as a table, without mentioning rounds — the
counterexamples are what protect the code; the failure count is not.

## Where it stands

**The A0 gate holds.** `$from` resolves against live state, the snapshot regenerates, an
element persists and reopens rendering identically — verified by tests, by the demo, and by
three reviewers independently. The plan's kill criterion is met.

**The verdict from the readiness reviewer (I, 7.7): ship it and build A1**, after validating
the write boundary — which round 3 then did.

**Unreviewed, again.** Round 3's fixes landed after its reviewers finished. That is now three
for three, and the base rate for "the fix pass introduced something" is two for two. The
difference this time: the fixes were deliberately written as class fixes, and the two most
suspect ones were mutation-verified before committing.

## Final pass — the open list, closed

After round 3 the five open items were worked through directly, without another review.
Applying the loop's own lesson, each was fixed as a class rather than at the call site that
exposed it.

1. **`get()` returns a copy.** The live object is reachable only through a private `live()`
   used internally. Mutating what `get()`, `update()` or `promote()` return now changes
   nothing — closing the path that produced a test asserting on its own fixture.
2. **`resolvedProps(id, {validate: true})`** re-checks the substituted result against the
   block schema and raises `unresolved-props` naming the element. Off by default, because a
   half-resolved element is a normal state in a live space — an unselected binding resolves to
   `undefined`, which is correct for an optional prop and wrong for a required one. A4 opts in
   and gets a guarantee instead of a surprise.
3. **`requires` is checked** on reopen; `missingPacks()` names what the space needs and the
   registry does not have, so stub-rendering has a stated reason.
4. **`Stub` carries `pack` and `block` as separate fields**, not one `"pack/Block"` string,
   and its registry key is now bare (`Stub`) like every other block — the qualified key was
   the only exception and made lookups inconsistent.
5. **§7.3 is hedged inline.** The substitution-before-table-check sentence now reads as a
   requirement on A2, explicitly `[asserted]`, because no resolver or `EntityDef` exists.

**Also:** `beginTurn()` is now required before `place()` — forgetting it silently recorded
every element as turn 0 and never cleared placeholders, which an HTTP layer would not notice.
That guard immediately caught a test that had never called it, and caught a regression in the
demo when the Stub fields were renamed.

**Tests: 130 → 139.**

## Still open, deliberately

- **Local state is per-process**, held in a `Map` on the runtime. Fine for A0; genuinely
  underspecified for A3a's Postgres, and nothing in the plan's schema accounts for renderer-
  local state at all. This is a design decision for A3a, not a defect now.
- **`invokeChainDepth` is inert** — typed, stored, read by nothing, and no longer settable by
  a caller. The server-derived increment lands with invoke execution.
- **The `[asserted]` items in §7** remain unbuilt by definition: SSRF pinning, redirect
  refusal, the restricted path evaluator and the entity-table check are all A2 work.

## What a round 4 would be for

Not this list. The remaining risk is no longer in A0's surface — it is in whether the next
phase repeats the pattern this loop kept finding: a fix aimed at a reproduction rather than a
class. The instrument that caught it every time was mutation testing, and A1 should start
with it rather than adopt it after three rounds.
