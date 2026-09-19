# QA goals: A0 implementation

Rounds 1-3 of a critique loop on CODE, not a plan. Same method as the planning loop:
three independent reviewers per round, distinct lenses, none on the builder's model.
**Target 8.5.** Max 3 rounds. Stop early on 8.5+.

## What is being reviewed

The working tree on branch `a0-binding-loop`:

- `packages/protocol` — space, element, lifetime, binding, principal, ulid
- `packages/query`   — the query grammar as zod, `queryKey`
- `packages/packs-core` — 8 block schemas, `defineBlock`/`definePack`, the figure validator
- `packages/runtime` — place/update/remove/promote, binding resolution, snapshot, access,
  serialise/reopen
- `apps/studio/a0-demo.ts` — the runnable demo
- `test/` — 53 tests

`npm test` and `npx tsc --noEmit` both pass. Run them.

## What A0 is, and is not

A0 is the plan's FIRST GATE (`docs/plan/v8.md` §8.3), scoped at half a day:

> Binding loop on fixtures. Two hardcoded specs, a `<select>` for the map, one metric
> tile, one element persisted and reopened. No model, no d3, no API.
> **Kill criterion: if `$from` + snapshot + reopen fails, stop — it is the thesis.**

**Out of scope, and NOT defects:** no HTTP/resolver (A2, B5), no Postgres (A3a), no real
renderer or d3 globe (A4), no model or tool loop (A5), no eval harness (A6), no tokens or
theming (A7), no `find_elements`/`duplicate`/`group` (Phase B), no `invoke` execution,
no diagram blocks, no digest.

Judge what is here. Do not mark absent later-phase work as a failure — but DO flag
anything built now in a way that will make a later phase expensive or impossible.

## Goals

G1. **The A0 gate genuinely holds.** `$from` resolves against live local state, the
    snapshot regenerates, an element persists and reopens rendering identically. Not
    just "a test asserts it" — verify the tests actually test it.
G2. **The contract matches the plan.** `docs/plan/v8.md` §4.1-§4.11 is the spec. Find
    where the code and the plan disagree, and say which one is wrong.
G3. **The figure validator is sound.** §3.1/§4.7. It has been wrong twice. Attack it.
G4. **Local state never mutates the spec** (§4.2) — a tap must not change persisted props.
G5. **Access rules hold** (§4.10): agent acts `onBehalfOf`, cannot invoke, cannot raise
    budget, removes only its own.
G6. **Persistence freezes values INTO the element** (§4.2) and survives a round trip.
G7. **Correctness under adversarial input** — malformed specs, cycles, unicode, deep
    nesting, prototype pollution, huge payloads.
G8. **A second engineer could build A1-A4 on this** without fighting it.
G9. **Tests are honest** — they test behaviour, not their own mocks, and would fail if
    the implementation broke.
G10. **No security foot-guns** introduced now that §7 will have to retrofit later.

## Reviewer instructions

Rate 1-10, harsh and calibrated. The planning loop ran 5.7 -> 7.43 over seven rounds; do
not inflate because this is new code. Run the tests. Write throwaway scripts to probe
behaviour. Report what you actually observed, not what the code appears to intend.
