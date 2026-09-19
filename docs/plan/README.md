# Orrery — planning archive

A persistent, agent-addressable **space**: a durable surface that accumulates. An agent places
typed elements from a closed block registry instead of writing UI code, so what it makes is
cheap to render, provably on-theme, and still there after the model stops talking. Working name
only — "Auto-UI" collides with Google's "A2UI" when spoken aloud.

## Status: 7 rounds of critique complete. No code written yet.

`v8.md` is the current plan. Rated **7.33** in its v7 form against a target of 8.5;
**v8's edits are unreviewed** (see below).

## Files

| File | What |
|---|---|
| `00-brief.md` | The original ask, verbatim, plus the 2026-09-19 clarification that reframed it |
| `v1.md` … `v8.md` | Successive drafts |
| `critique/round1..7.md` | Consolidated adversarial critique, all findings, with ratings |
| `../qa/v5-sandbox.md` | The goals rounds 5–7 were scored against |
| `../qa/v5-sandbox-summary.md` | **Start here** — scores, what was fixed, what was deferred, what to check |

## How this was produced

Seven rounds, three independent adversarial reviewers per round (21 total), each with a distinct
lens — technical feasibility, product fidelity, economics and licensing, fix auditing, fresh-eyes
readability, implementability, schema type-checking, and red team. Reviewers were instructed to
be harsh and to rate 1–10, and several verified claims against live APIs, packed npm tarballs
and a local Node runtime rather than from memory.

**Rating trajectory: 5.7 → 6.0 → 6.0 → 7.0 → 7.1 → 7.43 → 7.33**

Rounds 1–4 ran on mixed models; rounds 5–7 ran on Sonnet after the reviewers originally launched
on Fable 5.1 hit a usage-credit limit. Reviewers were never the builder's model.

## The reframe that unblocked it

Rounds 1–4 stalled on one finding: *"closed vocabulary" and "works for whatever application" are
in direct tension — pick one.* The 2026-09-19 clarification answered it by making neither choice
correct. The product is a **substrate**: a persistent space, with lifetimes, agent-callable
elements and an asset tier. That demoted the World Bank statistics browser from "the product" to
one demo, and made persistence the product rather than an argument for a design choice.

## What survived all seven rounds (high confidence, re-verified live in rounds 5, 6 and 7)

- **Don't build an element tree, a prompt generator, or charts.** `json-render` (Apache-2.0,
  0.21.0) owns the tree, patch streaming and `catalog.prompt()`; AntV `GPT-Vis` (MIT, 1.0.2) owns
  26 chart types. All 11 npm version/licence pairs matched exactly on three independent checks.
- **Build the globe with `d3.geoOrthographic`, not WebGL.** ~56 KB vs ~600 KB, and it deletes
  three copies of three.js and a `window.THREE` module-scope read that throws in Node.
- **The country-code join is ~1 hour.** world-atlas feature `id`s *are* ISO-3166-1 numeric;
  `numericToAlpha3` resolves 174/177; exactly one override (Kosovo → `XKX`); 902 bytes gzipped.
- **The naive digest launders errors.** World Bank `per_page` defaults to 50, silently truncating
  a 70-row call so the USA's first year moves 1990 → 2010; `unit` is an empty string; Brazil's
  GDP CAGR is 5.24% current vs **2.36%** constant.
- **No figures outside resolved data**, enforced in the validator rather than by convention.
- **Disposability is proven by a second renderer passing a conformance suite**, not a lint rule.
- **Licensing:** Open-Meteo non-commercial (cut); Wikipedia client-impossible; World Bank CC-BY
  propagates to every rendered chart; OpenMoji is CC-BY-SA and stays out of core.

## What the last three rounds settled

- **Persistence has a mechanism**: freeze-on-persist, with an `envelope` so interaction still
  works offline, version compaction, and a quota. A saved artifact shows the same numbers in 2028
  because the numbers are inside it.
- **The extension API is written**, and honestly bounded: resolvers are declarative descriptors
  and can be third-party; blocks contain render code and **cannot be**, until a sandbox exists.
- **The query grammar holds** under adversarial re-derivation — entities × range × filter × order
  × limit, plus `GraphQuery` for diagrams, plus a path for the user's own uploaded data.
- **Access control exists**: an agent always acts `onBehalfOf` a user, cannot raise its own
  budget, cannot grant access, and cannot trigger `invoke`.

## Read this before writing code

**v8 has not been reviewed.** Round 7's fixes were applied after the loop closed. In each of the
last two rounds, a reviewer found that the previous round's *headline fix* had introduced or
concealed a new defect — twice on the same eight-line validator. v8's changes deserve the same
treatment and have not had it.

The remaining gap to 8.5 is not conceptual. No structural objection survived rounds 5–7. What
kept pulling the score down was execution in the artifact: symbols that did not resolve, a regex
whose behaviour did not match its own comment, totals that did not add up. Those are found by
type-checking and running things.

`../qa/v5-sandbox-summary.md` ends with five concrete things to check first.
