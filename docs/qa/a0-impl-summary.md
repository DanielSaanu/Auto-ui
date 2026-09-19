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

## If there were a round 4

In priority order, from the open list:

1. `get()` returning a live mutable reference — the root cause of one dishonest test already.
2. `resolvedProps()` not re-validating after substitution — decide before A4 builds a renderer
   on the assumption it is safe.
3. `requires` parsed and never checked.
4. `Stub.of` conflating pack and block.
5. §7.3's substitution sentence, which states unbuilt machinery as present fact.
