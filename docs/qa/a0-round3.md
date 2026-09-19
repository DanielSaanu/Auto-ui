# A0 implementation — QA round 3 (final)

**Ratings: G (adversarial) 6.6 · H (contract/tests) 7.8 · I (readiness) 7.7 → 7.37**
Rounds: 7.3 → 7.63 → **7.37**

This was the first review of this code state. Rounds 1 and 2 reviewed earlier states; both
fix passes landed after their reviewers finished.

## The finding that explains the score

G, in one sentence:

> Round-2's own fix pass reopened all three of its headline defect classes — crash, hijack,
> and validation bypass — in the sibling code it didn't touch.

Each round-2 fix was applied to the call site the reviewer's repro used, not to the class of
problem. All three reproduced:

| Round 2 fixed | Round 3 found |
|---|---|
| Depth cap on `setLocal` | `rewritePlaceholders`, `collectBindingTargets` and `resolveBindings`'s generic walk were all unbounded — and `place()` hits one **before schema validation runs**, with `Table.rows` typed `z.unknown()` so deep nesting is schema-legal. Uncaught `RangeError`. |
| "A real id always wins" | `remove()` the element and its id is free to reuse as a placeholder. Hijack works again — verified `hijacked? true`. |
| Don't re-stub a stub | `continue` skipped props validation **and** the `bytes` recompute, directly under a comment reading "recompute; never trust". A crafted stub was accepted forever. |

## And the test-quality finding

H mutation-tested six round-2 assertions. Five were caught. The sixth was not:

Deleting `if (this.get(b.$from.el)) return value;` — the actual fix for round 2's headline
finding — left **all 115 tests passing**. The test named *"A REAL ID ALWAYS WINS over a
placeholder of the same name"* only exercised the separate `place()` collision guard.

H: *"the third instance of this exact failure mode across two rounds."* Correct. Three times
now a test has named a behaviour and asserted something adjacent to it.

H also found that `test/helpers.ts`'s `note(name, text, lifetime?: any)` **masked** the
lifetime-validation gap: typed properly, TypeScript would have rejected the malformed literal
at every call site.

## Fixed

1. **One depth bound for every recursive walk.** `MAX_VALUE_DEPTH = 64`, threaded through
   `rewritePlaceholders`, `resolveBindings` and `collectBindingTargets`, and used by
   `setLocal` instead of its own literal. Capping the entry point a reviewer probed leaves
   the crash reachable through its siblings.
2. **Placeholders cannot impersonate ids structurally.** Any name matching `el_`/`sp_` is
   refused, so delete-then-reuse is closed permanently rather than by a liveness check.
   The precedence branch is kept as defence in depth **and is now genuinely tested** — with
   a runtime whose ids are not prefixed, because otherwise the branch is unreachable and the
   test would be theatre again. Mutation-verified: deleting the branch fails the test.
3. **Stubs are validated like every other block**, and their `bytes` recomputed. Registering
   `Stub` made the skip unnecessary; removing it closes the bypass.
4. **`lifetime`, `title`, `tags` and `layout` are validated at the write boundary**
   (`LifetimeSchema`, new `ElementMetaSchema`). Previously only `props` was checked, so a
   hallucinated `{mode:"eternal"}` produced an element no snapshot tier could see and
   `endTurn` would not sweep. This is the surface A1 connects to model output.
5. **`place()` no longer takes `chainDepth`.** §4.6 requires it server-written; a
   caller-supplied value with nothing reading it was a guard-shaped hole.
6. **One shared title rule** (`requireTitleIfPersistent`) instead of three copies.
7. **`helpers.ts` is typed** — `lifetime?: Lifetime`, not `any`.

**Tests: 115 → 130.**

## Open, and deliberately so

- **`get()` returns a live mutable reference** (E round 2, I round 3). Real; it is what made
  round 1's dishonest test possible. Cloning on every access is a store-layer decision that
  belongs with A3a, not a reflex now.
- **`resolvedProps()` never re-validates against the block schema after substitution** (I).
  Props are guaranteed valid at rest; what a renderer draws carries no such guarantee. A4
  should decide this deliberately.
- **`requires` is parsed and never checked** against the loaded pack (D round 2, I round 3).
- **`Stub.of` conflates pack and block** in one `"pack/Block"` string (H); the plan's §2.5
  describes them as separate facts.
- **`beginTurn()` is caller discipline.** Forgetting it silently degrades provenance and
  placeholder isolation.
- **§7.3's substitution sentence reads as present fact** for machinery that does not exist
  (H). It sits under §7's `[asserted]` header but the local wording does not repeat the hedge.
