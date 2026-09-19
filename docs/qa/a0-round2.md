# A0 implementation — QA round 2

**Ratings: D (adversarial) 7.1 · E (contract/new code) 7.6 · F (fresh eyes) 8.2 → 7.63**
Round 1 was 7.3.

All 15 round-1 fixes were independently re-verified and hold. Two reviewers ran mutation
tests against the suite; both reported the assertions they broke failed correctly.

## The pattern of this round

**Two of the three new defects were created by round 1's fixes.** The placeholder rewrite —
added to close a real gap — introduced a hijack path. The depth cap bounded nesting within a
single value and left chains between elements unbounded. That is the second consecutive round
where fixing a finding produced the next one, and it is the argument for running the loop on
code rather than on a document.

## Confirmed defects, all fixed

1. **Placeholder shadowing a real element id** (D, E, reproduced by the builder). `place()`
   accepted any `name`, and `rewritePlaceholders` rewrote any `$from.el` matching it —
   including a real id the agent had read from the snapshot. Observed: a binding written
   against the real element resolved to `["IMPOSTOR"]`.
   *Fix:* a real id always wins in `rewritePlaceholders`; `place()` rejects a `name` that
   collides with an existing element, and rejects the same placeholder twice in one turn.

2. **Unbounded binding chains crashed the process** (D). A 5,000-element *acyclic* chain is
   not a cycle, so `seen` never fired, and `assertDepth` bounds a value's nesting rather than
   hops between elements. Observed: uncaught `RangeError`.
   *Fix:* `MAX_BINDING_HOPS = 32`, raising a controlled `binding-too-long`. The two limits
   bound different things and both are needed.

3. **`core/Stub` destroyed the identity it exists to record** (E, predicted and reproduced by
   the builder). `Stub` was not a registered block, so a second reopen re-stubbed an already
   stubbed element and overwrote `of: "future/Timeline"` with `of: "core/Stub"` — losing the
   only record of which pack the element needs, permanently.
   *Fix:* `Stub` is a real registered block with a schema; `fromJSON` never re-stubs.

4. **`pinned` was unreachable through any public API** (E). `update()` dropped `lifetime`
   (against §4.8) and `promote()` took no `pinned`. The snapshot's pinned tier was therefore
   dead code — and the round-1 test covering it passed only by reaching into the object
   `get()` returns and mutating `lifetime` directly. That is a test asserting on its own
   fixture, committed in the pass that answered round 1's test-honesty finding.
   *Fix:* `update()` carries `lifetime`, `promote()` takes `pinned`, and the test now uses
   the public API.

5. **`fromJSON` accepted dangling binding targets** (D). Shape parsed; the broken reference
   surfaced much later as a render-time error on one element.
   *Fix:* binding targets are collected and checked against the space on reopen.

6. **`roleOf` was first-match-wins on duplicate grants** (D) — effective role depended on
   array order.
   *Fix:* `SpaceSchema` rejects two grants for one principal rather than inventing an
   untested precedence rule.

## Accepted, non-defect changes

- **Test files are now grouped by behaviour** (F), not by review round: `access`, `bindings`,
  `snapshot`, `reopen`, `lifecycle`, `figures`, plus the `a0` gate. A file named for a review
  round bakes review history into the suite's permanent taxonomy.
- **Comment meta-narration cut** (F): the count of past failures is not information a
  maintainer needs; the counterexamples are. `figures.ts` now carries a table of the four
  shapes that leak and why, with no mention of which round found which.
- **`invokeChainDepth` carries a TODO at the call site** (F), not only in a QA document.
- **The plan is updated.** `EntitySel.ids` accepting a `Binding` is now in v8 §4.3, and §7.3
  states that the bounded-table check applies to the *resolved* value — which is what keeps
  the exfiltration argument intact. Round 1 logged this as "a plan edit, not code debt" and
  then did not make it; E checked `git log` and caught that.

**Tests: 94 → 115.**

## Open

- `get()` returns a live mutable reference into `space.elements` (E). Real, and the reason
  finding 4's bad test was possible. Not fixed: cloning on every `get()` is a performance and
  ergonomics decision that belongs with A3a's store work, not a reflex.
- `requires` is parsed but never checked against the loaded pack (D).
- `assertDepth`'s limit of 32 is invented, not from the plan (E), and untested against
  realistically deep data rows.
- `beginTurn()` remains caller discipline; forgetting it silently degrades provenance and
  placeholder isolation (D, E).
