# Round 1 consolidated findings (critics A=feasibility 6/10, B=product 5/10)

## ACCEPTED - structural (both critics, independently)
1. §1/§3 contradiction. Ship NO element tree. schema = catalog of per-block PROP schemas
   + data-ref type. json-render becomes a real dep of the renderer (below line, allowed).
   Kill the "envelope". Kill "free renderers" claim (false: their renderers walk trees,
   they don't contain our blocks).
2. Throwaway line is backwards. Blocks ARE the product. Disposability must be proven by a
   CONFORMANCE SUITE (2nd ugly renderer passes ~40 specs), not by a no-React lint rule.
   Also: diagram puts durable at TOP but prose says "throw away the top half" - fix wording.
3. Globe must be slice 1, not wave 2. It is the user's own example = the acceptance test.
   cobe CANNOT highlight a country (dot cloud + pins, no polygon layer) -> globe.gl/
   three-globe + world-atlas + d3-geo. Commit to one. Verified independently.
4. Strict decoding vs "everything optional renders" are mutually exclusive.
   -> BlockStrict (tool.json + eval) and BlockPartial (derived, streaming). CI asserts derived.
5. Data-by-reference blinds the model -> it narrates data it never saw -> confidently wrong
   prose NEXT TO a correct chart (worse than hallucinated numbers).
   -> resolver exposed as a TOOL returning a digest {min,max,first,last,delta,units,n}.
   -> hybrid: inline literals <50 points, reference above.
   -> unknown indicator codes: reject-with-suggestion (WB returns 200+empty, fails silently).
6. Missing entirely: prose/UI interleaving (two-phase: narrate then emit spec), block
   identity + turn semantics (does turn N+1 patch turn N?), state-echo of tier-1
   interactions back into transcript (else "why is that one so high?" is undefined).
7. Scope is 4-6x a prototype. CUT: theme-gen, both bridges, Playwright goldens,
   dependency-cruiser, Map (needs a geocoder - none listed), inputs (Form/Slider/Choice),
   eval harness in slice 1.

## ACCEPTED - corrections
- @dagrejs/dagre (dagre unmaintained since 2018). ELK/EPL-2.0 caution CORRECT.
- @json-render/core is 0.5.0, PRE-1.0. Moving target.
- json-render streaming = RFC 6902 JSON Patch over JSONL, NOT partial-JSON parsing.
  §11 "render what validates" describes a different mechanism.
- json-render ~16.4k stars; renderers incl. Ink (terminal), R3F, PDF, Email, Remotion.
- A2UI v0.9.1 ALREADY has a client-held catalog concept. Differentiator = catalog CONTENTS.
- OpenFreeMap: no key/limits confirmed, attribution required, BUT single donation-funded
  instance, no SLA. Weekly planet dumps exist -> name self-host fallback in plan.
- Table breaks 3 of 6 prop rules and is in slice 1 -> amend rules to how they'll be enforced.
- Token budget: 2500/24 blocks = ~104 tok/block. Doesn't work. Do the division.
- Threat model absent: Prose->markdown XSS, Gallery->model-supplied URLs, source:->SSRF.
- Versioning: specs get persisted in transcripts. version field + migrations/ from commit 1.
- Eval set == few-shot set = training on test. Split; score acceptable-SET membership.
- Layout blocks (Diagram/Tree) jitter under streaming -> `settled` signal, layout once.
- "Haiku 4.5 is sufficient" = hypothesis stated as finding, one section before its own test.

## REJECTED / deferred
- (none yet - hold for economics critic)

## Round 1 ratings: A(feasibility)=6, B(product)=5, C(economics)=6. Mean 5.7.

## Critic C (economics/licensing/prior-art) - NEW findings
1. FATAL: Haiku 4.5 min cacheable prefix = 4096 tok. §6 CI budget caps catalog at <2500.
   Below minimum, NOTHING caches and NO error is returned. §6 and §9 are mutually
   exclusive and one CI rule enforces the broken half. -> Sonnet 5 (1024 min) or >4096.
2. Open-Meteo free tier is NON-COMMERCIAL ONLY (CC-BY, <10k/day). Listed under "all
   permissive". Every downstream commercial user silently breaches ToS. CUT from defaults.
3. PRIOR ART UNDERSTATED BY HALF. AntV GPT-Vis (MIT) ships 26 chart types INCLUDING the
   whole relational tier (mindmap, network graph, flow, org chart, fishbone, indented
   tree) + an LLM DSL + an MCP server + 3 themes. Unmentioned. Occupies 2 of 6 tiers.
4. json-render's `catalog.prompt()` ALREADY generates prompts from schemas.
   -> §2.3 "generated prompt pack" is NOT a gap. Delete the claim.
5. => Honest gap is TWO items: SPATIAL blocks + DATA-BY-REFERENCE. Not five.
6. @auto-ui/data is a SERVER package described as isomorphic. Browsers cannot set
   User-Agent (Wikimedia policy structurally unsatisfiable), per-IP limits become
   per-end-user, CORS, no cross-user cache. Wikimedia rolling out global limits in 2026.
7. Cost baseline is a STRAWMAN. Real default is markdown text (~200-600 tok), which is
   CHEAPER than the JSON spec. "150-400 tok" also excludes Prose content + inline Table
   rows (realistic multi-block = 400-900). Reframe: "cheap enough not to matter".
8. Catalog sent TWICE (catalog.md in system + tool.json in tools). Any tool-definition
   change invalidates the ENTIRE cache hierarchy for every user. Send it once.
9. strict:true does NOT support oneOf+discriminator, recursion, pattern, min/max.
   §4 leans on discriminated union for Chart.kind. SPIKE ON DAY 1.
10. Bridges are the DISTRIBUTION CHANNEL, scheduled last (step 8) and below the line.
    Inverted. Playground should BE a json-render app. Bridge in slice 1.
11. MCP Apps (SEP-1865) stabilized Jan 2026, shipped in ChatGPT/Claude/VS Code, and
    standardises host-supplied CSS custom properties. Relevant to the token tier.
12. NAME COLLISION: "Auto-UI" vs "A2UI", spoken aloud in the same sentence. Rename now.
13. ELK excluded for WRONG REASON. EPL-2.0 is file-level; consuming an unmodified dep
    does not infect. Real disqualifier = ~1.5MB GWT bundle + worker requirement.
14. @dagrejs/dagre is ALIVE (3.1.0, days old). Unscoped `dagre`/`dagrejs` is the dead one.
15. Natural Earth encodes disputed-boundary editorial choices (Kashmir, Crimea, Taiwan,
    W. Sahara) -> ships to every Globe/Region user. Market-access, not license.
16. Attribution obligations absent: World Bank CC-BY, Wikipedia CC BY-SA (share-alike),
    OpenMapTiles CC-BY (mandatory "(c) OpenMapTiles (c) OpenStreetMap contributors").
17. OFL requires license text + copyright shipped WITH self-hosted fonts. No NOTICE step.
    (RFN worry unfounded - neither Inter nor JetBrains Mono reserves a name.)
18. §10 defines metrics with NO PASS THRESHOLDS -> step 3's gate is unenforceable.
19. TanStack Table MIT confirmed, no relicensing event. Don't manufacture that risk.
20. IP: model outputs are fine (Anthropic assigns rights + indemnifies). Residual risks:
    theme-gen on "make it look like <brand>" = trademark, not covered by copyright
    indemnity; copying json-render/A2UI Zod declarations verbatim = Apache-2.0 NOTICE
    (copying a format's SHAPE is safe post-Google v. Oracle); indemnity does not extend
    to downstream users.
