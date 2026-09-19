# A0 implementation — QA round 1

**Ratings: A (correctness) 7.4 · B (contract fidelity) 7.2 · C (design & tests) 7.3 → 7.3**

Every reviewer ran the code rather than only reading it. Every bug below was reproduced by
the builder with a probe script before being fixed, and each now has a regression test that
names the finding.

---

## Confirmed defects, all fixed

### Security / correctness

1. **Access escalation through role/kind conflation** (A, B). `can()` gated *invoke* and
   *remove-own-only* on the grant's **role**, but §4.10 states both as properties of **being
   an agent**. Granting an agent principal `editor` handed it both.
   *Observed:* `can(space, AGENT, "invoke") === true`, and an agent removed a user's element.
   *Fix:* principal kind is checked first and no grant can override it.

2. **Prototype drift through `resolveBindings`** (A). `JSON.parse('{"__proto__":{...}}')`
   creates `__proto__` as an *own* property; rebuilding the object re-pointed the result's
   prototype. Not global pollution, but the reachable path is `setLocal()`, which is
   unvalidated and is exactly what an HTTP tap endpoint will wrap.
   *Fix:* skip `__proto__`/`constructor`/`prototype`; pass non-plain objects through untouched.

3. **`fromJSON` did no structural validation** (A). An element missing `lifetime` produced a
   raw `TypeError` from deep inside `snapshot()`. `frozen.bytes` was trusted as declared.
   *Fix:* `SpaceSchema`/`ElementSchema` parse on reopen → `OrreryError`; per-element props
   validated against their block; `bytes` recomputed; duplicate ids rejected; an unknown
   block degrades to a labelled stub (§2.5) rather than failing the whole reopen.

4. **`queryKey` collision** (A). `extraKeyFields` joined on `,`, so `["a,b"]` and `["a","b"]`
   produced identical keys — in the one function whose docstring claims it makes cross-tenant
   reuse "structurally impossible".
   *Fix:* every component JSON-encoded before joining.

5. **`ulid()` produced a 154-character id containing `"undefined"`** when a pluggable `rand`
   returned exactly 1 (A).
   *Fix:* clamp both `rand()` and `now`.

6. **`remove()` deleted every element sharing an id** (A), via `filter`.
   *Fix:* `splice` exactly one.

7. **Unbounded recursion via `setLocal`** (A) — deep values reached `resolveBindings` and
   overflowed the stack with an uncaught `RangeError`.
   *Fix:* depth cap, raising a bounded `OrreryError`.

### The figure validator, wrong for a third and fourth time

8. **`\p{Nd}` missed Nl/No** (A): Roman numerals, Suzhou numerals and fractions are numbers
   but not *decimal digits*. `hasBareFigure("chapter Ⅹ revenue grew")` returned `false`.

9. **And widening the class alone did not fix it.** Verified after the change: Roman numerals
   *still* passed, because **NFKC maps `Ⅹ` (U+2169) to the ASCII letter `X`** — the
   normalisation step destroyed the numeric property before the test could see it.
   *Fix:* test `\p{N}` against **both** the raw and the normalised form.

   Four failures now, same family every time: *match the widest class and subtract an
   enumerated allowlist; never match a narrow class and hope it is complete.* That sentence is
   now in the source.

### Contract and honesty

10. **Snapshot claimed hidden rows that did not exist** (B). Ephemeral elements were counted
    as "hidden" though they were never candidates, so the snapshot advertised rows
    `find_elements` could never return.
    *Fix:* count only findable (non-ephemeral) elements.

11. **Snapshot dropped the element the user had just touched** (B). `[...persistent,
    ...sessions]` put every stale pinned element ahead of the one being worked on — the exact
    opposite of the recency-by-interaction rule written in the comment above it.
    *Fix:* explicit pins first, then everything else by interaction recency.

12. **A frozen element could drift** (A). `update()` changed `props` while `frozen.rows` kept
    the old values, with nothing saying which a renderer should believe.
    *Fix:* refuse props changes on a frozen element; title/tags still allowed.

13. **`place()` discarded the placeholder→id mapping** the plan requires (C).
    *Fix:* placeholders are recorded, turn-scoped, and **rewritten inside bindings before
    validation** — which is what makes a multi-element turn with cross-references work at all.

14. **`ephemeral` and `session` swept identically** (C), leaving the third lifetime state with
    no behaviour to justify it.
    *Fix:* `endTurn()` sweeps ephemeral, `endSession()` sweeps both.

### Test quality

15. **Two of the builder's own assertions could not fail** (C):
    - `expect(lines[1]).not.toContain(b === a ? "" : a)` — `b === a` is never true with a fixed
      id generator, so the ternary was dead code dressed as a guard.
    - `.not.toThrow()` on placing a binding to a nonexistent element — `place()` inspects no
      binding targets, so this held under every possible implementation.
    *Fix:* the first now asserts the **full** three-element recency order (and caught a wrong
    replacement immediately); the second keeps the call but documents that only the
    resolve-time assertion below it has power, and checks the error `code`.

**Test count: 53 → 94.**

---

## Accepted, not yet acted on

- **`invokeChainDepth` is caller-supplied and unused** (B). Invoke execution is out of scope
  for A0, but the parameter currently looks like a working guard. Flagged in code; the
  derivation lands with invoke itself.
- **`Choropleth.fill` geographic/arity enforcement** (B) — `EntityDef`/`EntityKind` do not
  exist yet; the plan's §4.7 comment claims enforcement "at registration". Needs the resolver.
- **Local state is per-process** (B, C) — fine for A0, genuinely underspecified for A3a's
  Postgres. Nothing in the plan's schema accounts for renderer-local state.
- **`registry` should be its own package** (C) per §8.1; `defineBlock` currently lives in
  `packs-core`. Cheap now, awkward once `registerRenderer` needs somewhere pack-agnostic.
- **`core/Stub` has no schema** (C): stub props are never validated by any block.

## Contract change to push back into the plan

`EntitySel.ids` accepts a binding, which v8 §4.3 does not say. Justified — without it "this
tile follows that map's selection" is inexpressible — but B is right that it moves the
bounded-entity-table check downstream, and §7.3's exfiltration argument depends on that check
happening before a value reaches a request slot. **v8 §4.3 and §7.3 both need updating**, and
that is a plan edit, not a code one.
