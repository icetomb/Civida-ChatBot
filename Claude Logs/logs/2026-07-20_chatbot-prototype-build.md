# Session Log — Chatbot prototype build (single-file `index.html`)

## Date / Time
2026-07-20 13:38 MDT

## Git Branch
`dev`

## Session Goal
Build the Civida support chatbot prototype end-to-end from
`Tasks/Civida-Chatbot-Prototype-Spec.md` (§10 build plan): single self-contained
`index.html` decision tree, all three groups' content, district picker, escape
hatches, navigation controls, Civida branding, and full path verification.

## Files Inspected
- `Tasks/Civida-Chatbot-Prototype-Spec.md` — the spec being implemented (content, UX rules, districts, links)
- `Claude Logs/CURRENT_CONTEXT.md` — project state; confirmed Rayan handles commits, CLAUDE.md wanted at build start
- `Claude Logs/LOGGING_FORMAT.md` / `SESSION_INDEX.md` / `README.md` — logging conventions
- `https://civida.ca/` + `wp-content/themes/civida/dist/assets/css/app.css` — pulled the real brand palette (see decisions)

## Files Changed
- `index.html` — **created**: the entire prototype (CSS + CONTENT object + DOM-free logic + DOM renderer)
- `tests/core.test.mjs` — **created**: 17 zero-dependency tests (`node:test` + `node:vm`) covering content shape, exact URLs, districts, and a full-tree reachability crawl (33 locations)
- `docs/superpowers/plans/2026-07-20-civida-chatbot-prototype.md` — **created**: the implementation plan the build followed
- `CLAUDE.md` — **created**: project constraints, test command, commit/logging conventions
- `Claude Logs/{CURRENT_CONTEXT.md, SESSION_INDEX.md}` — **modified**: session close-out
- `Claude Logs/logs/2026-07-20_chatbot-prototype-build.md` — **created**: this log

## Summary of Completed Work
The prototype is built and verified. `index.html` opens by double-click and holds
three layers: (1) the `CONTENT` object — all copy, links, contacts, 8-district
directory — which is the only thing the CS team edits; (2) a DOM-free pure logic
layer (`renderStep(content, loc)`) that maps a location to messages + quick-reply
options; (3) a DOM renderer (transcript, chips, staggered bubbles, Back/Start-over
history stack). All spec §5 content is in: Applicant (4 Qs), Tenant (5 Qs incl. the
emergency-transfer Yes/No branch and district-picker question), Recipient (4 Qs),
"Not sure" direct help, synthesized escape hatch in every group, "Still need help?"
contact line on every leaf answer, district picker with G→H closed redirect and a
civida.ca map fallback. Light Civida branding: real brand purple, serif bot voice,
CSS-only house avatar (amber door), coral-marked "talk to a person" path, draft-
wording disclaimer in the footer.

## Important Technical Decisions
- **Escape hatch synthesized by the walker**, not stored per group in CONTENT — the spec's "required in every group" rule holds by construction (and is unit-tested).
- **Contact line renders on leaf answers only** — a branching answer shows its follow-up question instead; its leaves carry the contact line. Keeps the emergency prompt clean.
- **Back appends rather than truncates** — chat metaphor: `‹ Back` echoes a chip and re-renders the previous step as new messages; transcript history is never rewritten.
- **`<script id="core">` is DOM-free and vm-extractable** — Node tests regex-extract and evaluate it; cross-realm prototype mismatches are handled by JSON-cloning before `deepEqual`.
- **Real brand palette scraped from civida.ca's compiled theme CSS** (`#452283` purple, `#231142` ink, `#dc5339` coral, `#ffaa2d` amber — WordPress block-palette presets in the HTML were red herrings). Brand font is "Eagle" (licensed webfont) — can't embed in a single file, so system stacks stand in; bot bubbles use a Charter/Georgia serif voice, controls use system sans.
- **Spec §9 open questions → prototype-safe defaults**, each flagged with a `§9.n` comment in `index.html`: help@civida.ca (per §5A); no maintenance phone extension; draft wording + footer disclaimer; colors-only branding (no hot-linked logo); in-bot picker *plus* map link; GBV answer kept to the manager's curated wording with a comment marking where a safety note would go.
- **No `scroll-behavior: smooth`** — with staggered appends it made the transcript visibly lag; instant pinning is standard chat UX (bubble rise animation supplies the motion).
- `node --test` needs the explicit file arg on this Node (bare `tests/` directory arg fails).

## Tests / Commands Run
- `node --test tests/core.test.mjs` — unit suite (run after every task)
- `python3 -m http.server 8517` + Chrome automation — served the file for browser click-through (extension can't drive `file://`); deleted the temporary `_vp.html` viewport harness afterwards
- `curl https://civida.ca/wp-content/themes/civida/dist/assets/css/app.css` — brand palette extraction

## Results of Verification
- Unit tests: **17/17 PASS** (content shape, contacts, per-group question counts, link `url` XOR `action` invariant, byte-exact spec §7 URLs, district directory incl. G→H, follow-up branch, routing/menu/leaf/escape/picker/district behaviors, full-tree crawl of all 33 reachable locations).
- Browser click-through at **390px**: every path per spec §10.5 — Applicant ×4 + escape; Tenant ×5 incl. transfer **Yes** (TM3 pill) and **No**, district picker, G→closed→H card (780-851-9223), escape; Recipient ×4 + escape; Not sure; `‹ Back` mid-branch and from menus (returns to previous step; disabled at routing); `⟲ Start over` (restart greeting variant); `Ask another question` after answers. External links carry ↗ and `target="_blank" rel="noopener"`; tel/mailto pills render without ↗.
- **320px**: routing, tenant menu, picker, escape — no horizontal scroll, no clipped controls.
- **Keyboard**: Tab reaches quick replies, Return activates (verified by activation).
- **NOT tested**: real phone hardware / iOS Safari / Firefox; screen readers (aria-live/role=log present but unaudited); actual link destinations (URLs byte-match the spec but weren't crawled); printing. District office **emails** are absent (obfuscated on civida.ca) — the district card links to the district-offices page instead.

## Bugs / Issues Discovered
- Auto-scroll lag: CSS `scroll-behavior: smooth` + staggered `scrollTop` writes left new messages below the fold — **fixed** (removed smooth).
- District card printed "4:00 p.m.." (hours string already ends in a period) — **fixed** in `renderStep`.
- Test-side: vm-realm objects fail strict `deepEqual` prototype checks (fixed with JSON-clone helper); the G-redirect test initially matched the redirect note instead of the office card (regex anchored).
- Chrome-extension quirk (not an app bug): the first click after a `navigate` only focuses the page; real user clicks are unaffected.

## Risks / Unresolved Questions
- All answer wording is **draft** — CS manager sign-off pending (spec §9.3); footer disclaimer flags this.
- Spec §9 items 1, 2, 4, 5, 6 still need manager confirmation (defaults chosen and flagged in-file).
- Brand tokens are sampled, not officially supplied; swap `:root` values when brand team confirms (§9.4).
- District office emails not shown (site obfuscates them) — acceptable for prototype; card links to the live page.

## Next Recommended Steps
1. Rayan: click through `index.html` (double-click the file), then commit `index.html`, `tests/`, `CLAUDE.md`, `docs/`, and `Claude Logs/` updates.
2. Share the file with the CS manager for wording sign-off + §9 answers; swap draft copy for approved copy in `CONTENT` (no code changes needed).
3. After sign-off: consider the phase-2 items (Flask backend for analytics/deflection metrics, AI free-text layer, real address→district lookup, translation/a11y depth).

## Prompt to Start the Next Session
> The Civida chatbot prototype is built and verified (see
> `Claude Logs/logs/2026-07-20_chatbot-prototype-build.md`). The CS manager has now
> reviewed it. Open `Tasks/Civida-Chatbot-Prototype-Spec.md` §9 and `index.html`'s
> `CONTENT` object, and apply her feedback: [paste her wording changes / §9 answers
> here]. Update only the CONTENT object (and the `§9.n` flagged spots), run
> `node --test tests/core.test.mjs`, re-verify any changed paths in the browser, and
> log the session per `Claude Logs/LOGGING_FORMAT.md`.
