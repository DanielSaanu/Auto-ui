# QA goals: plan v5 (the sandbox reframe)

Rounds 5-7 of a critique loop that ran 4 rounds on v1-v4 and stalled at 7/10.
**Target: 8.5/10.** Max 3 rounds. Stop early on 8.5+.

## What is being reviewed

`docs/plan/v5.md` - a planning document. No code exists. The deliverable under review is
the PLAN, judged on whether a competent team could build from it and whether what they
built would be the thing the user asked for.

## Goals v5 must meet

G1. **Answer the new brief.** Persistent, agent-addressable SANDBOX SPACE - not a chat
    transcript with widgets. See `docs/plan/00-brief.md` "CLARIFICATION (2026-09-19)".
    All six numbered consequences must be visibly answered, not silently dropped.
    (v4 silently deleted round 3's H11. That must not happen again - if v5 refuses a
    finding, it must say so and why.)
G2. **Resolve the 10 "Open, unresolved" items** in `docs/plan/README.md`. Each one either
    answered, explicitly deferred with a reason, or explicitly refused with an argument.
G3. **Lifetime model.** Persistent vs temporary as a first-class property: what controls
    it, what happens at expiry, what persistence actually guarantees across time.
G4. **The ref/query grammar** (round 4 L3/L4 - "the real hole"). Must express
    entities x range x filter x order x limit, and must handle the three hard requests
    that v4 failed: G7-over-time, worst-air-quality (no resolver / graceful refusal),
    and "sort MY sales data" (user-supplied data path).
G5. **The asset story.** Sprites, pixel art, UI elements, 2D/3D - sourcing, licensing,
    theming, and how a model addresses an asset. Free/self-made per the brief.
G6. **The space calls the agent.** A defined mechanism for elements invoking an agent,
    including cost, loops, and failure.
G7. **Schemas, not prose.** Round 4 J1: "the artifact is a SIX-ROW MARKDOWN TABLE".
    v5 must contain real type definitions for the core contract.
G8. **An honest schedule** with team size, and a month-2 that is not five weeks of
    invisible infrastructure (round 4 L13.1).
G9. **Preserve what four rounds established.** See "PRESERVE" below. Regressing any of
    these is a scoring penalty, not a neutral edit.
G10. **Readable.** Round 4 J19: cut the "earlier drafts said..." changelog asides, keep
    the conclusions. Detail balance must not be inverted (J23).

## PRESERVE - established across 4 rounds, do not regress

- Don't rebuild what exists: `json-render` (Apache-2.0) owns the element tree, patch
  streaming and `catalog.prompt()`; AntV `GPT-Vis` (MIT) owns 26 chart types.
- `d3.geoOrthographic` + drag handler, NOT WebGL. ~56 KB vs ~600 KB, and the reasons
  (three copies of three.js, `window.THREE` at module scope throwing in Node).
- The country-code join is ~1 hour: world-atlas ids ARE ISO-3166-1 numeric;
  `numericToAlpha3` resolves 174/177; one override (Kosovo -> XKX); vendored, 902 B gz.
- Phase-1 narration carries no figures (and v5 must extend this to persisted Prose - L4b).
- The naive digest launders errors: `per_page` defaults to 50; `unit` is empty string;
  Brazil GDP CAGR 5.24% current vs 2.36% constant. Keep the richer digest shape.
- Disposability is proven by a second renderer passing a conformance suite, not a lint rule.
- Licensing: Open-Meteo non-commercial (cut); Wikipedia client-impossible (User-Agent);
  World Bank CC-BY propagates to every rendered chart.
- Bindings are closed objects, never parsed dot-path strings (SSRF).
- `source:` strings parsed against a resolver registry, never templated into a URL.
- The "four props that exist because the obvious version is broken" table (round 4 J22
  called it "close to exemplary") - keep that standard of justification.

## Out of scope

- Writing code. This is a planning loop.
- Final naming. "Orrery" is a working name.
- Choosing a hosting provider / business model.

## Reviewer instructions

3 independent reviewers per round, distinct lenses, run on a different model from the
builder. Rate 1-10, be harsh, be calibrated. Verify claims against live APIs and real
package contents rather than from memory where practical. Prior rounds rated
5.7 -> 6.0 -> 6.0 -> 7.0; do not inflate to show progress.
