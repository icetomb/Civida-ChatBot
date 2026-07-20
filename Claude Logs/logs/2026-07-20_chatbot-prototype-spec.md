# Session Log — Chatbot planning + prototype spec

## Date / Time
2026-07-20 10:45 MDT

## Git Branch
dev

## Session Goal
Decide the Civida chatbot's approach with Ray, gather the real civida.ca links + district-office
directory the answers need, and write a reviewable prototype spec into `Tasks/`. Planning +
documentation only — no application code.

## Files Inspected
- civida.ca `tenant-resources/` and `tenant-resources/info-forms/` — real form URLs
  (HS1 Change of Income, TM3 Emergency Transfer, TM2 Move Out, CM1 Annual Income Review,
  CM2 Change of Household, CM3 Consent to Release, Tenant Handbook + maintenance/issues sheets).
- civida.ca `district-offices/` — the A–H directory (names, offices, phones, hours; District G
  closed → served by H; how tenants find their office = building-name search on the map).
- civida.ca `contact-us/` — phones (780-420-6161), fax, emails (general/applicants + benefits),
  main office address, hours (Tue–Fri in person; Mon/Wed remote), 200+ language interpretation.
- Prior context: the manager's FAQ screenshots (curated questions + "easiest answers" per group)
  and the 2026-07-20 setup log's civida.ca overview.

## Files Changed
- `Tasks/Civida-Chatbot-Prototype-Spec.md` — created: the full prototype spec (purpose, locked
  decisions, UX rules, data model, per-group content, district handling + directory, links/contacts
  reference, out-of-scope, open questions, build plan).
- `Claude Logs/CURRENT_CONTEXT.md` — overwritten: locked decisions, spec-written state, build-next.
- `Claude Logs/SESSION_INDEX.md` — prepended this session's row (newest at top).
- `Claude Logs/logs/2026-07-20_chatbot-prototype-spec.md` — created: this log.

## Summary of Completed Work
Worked through the design with Ray and locked the prototype's shape: a **scripted decision-tree**
chatbot, **static vanilla JS + HTML/CSS**, **no backend**, a **standalone prototype**, packaged as
a **single self-contained `index.html`** (content inlined so it opens by double-click). Confirmed
the interaction is routing-first (Applicant / Tenant / Recipient / "not sure"), then that group's
curated questions, with a required escape hatch and Back/Start-over controls throughout. Gathered
the real civida.ca URLs and the A–H district directory, then wrote a complete, reviewable spec to
`Tasks/` — including a concrete JSON-ish `CONTENT` data model (nodes with label/answer/links + a
one-level `followUp` branch, and a `district-picker` link action) and per-group content mapped 1:1
to the manager's list (the one branch is Tenant → transfer → "is this an emergency?"). Refreshed
the memory layer to match. No code was written.

## Important Technical Decisions
- **Single self-contained `index.html` with inlined content** — a static prototype that must "just
  open" can't `fetch()` a JSON file from `file://` (browsers block it); inlining the `CONTENT`
  object sidesteps CORS and makes the demo a one-file share. Content still lives in one editable
  object so the CS team edits answers without touching logic.
- **Client-side District Picker instead of address lookup** — no backend means no real
  address→office resolution; a pick-from-list (with a link-out fallback to the district-offices
  map) delivers the manager's "give them their office" need fully client-side.
- **One-level `followUp` in the node schema** — the manager's content only branches once
  (emergency transfer), so the model stays simple rather than a general recursive tree.
- **Draft wording, flagged** — answers paraphrase the manager's "easiest answers" + site copy and
  are explicitly marked pending her sign-off (a housing authority must not ship unreviewed copy).

## Tests / Commands Run
- `WebFetch` × 4 — tenant-resources, info-forms, district-offices, contact-us (link/URL gathering).
- `TZ='America/Edmonton' date` — session timestamp.
- No pytest / build / lint — no application code exists yet.

## Results of Verification
- Links in the spec were taken directly from civida.ca page fetches on 2026-07-20 (form PDFs,
  portals, district phones). NOT re-verified by opening each URL in a browser — recommend a quick
  link-check pass during the build.
- District-office **emails** were obfuscated by the fetch tool and are intentionally NOT reproduced
  (would need to be read off the page when building).
- NOT tested: nothing runs yet; no code, no CLAUDE.md.

## Bugs / Issues Discovered
- **Maintenance extension conflict:** the district-offices page says maintenance = 780-420-6161
  **ext. 1**, while an earlier tenant-FAQ read implied **ext. 2** for building info. Left as an
  open question rather than printing a possibly-wrong extension.
- **Applicant email ambiguity:** manager's note says `help@civida.ca`; the site's general/applicant
  email is `civida@civida.ca`. Flagged in the spec (§9).

## Risks / Unresolved Questions
- Answer copy is DRAFT — must get CS manager sign-off before any public use.
- 6 open questions in spec §9 (emails, maintenance ext., exact wording, branding assets, district
  picker vs link-out, GBV safety-note treatment).
- Deferred by design: analytics (needs the future Flask backend), AI/free-text, translation, full
  a11y, full FAQ coverage.

## Next Recommended Steps
1. Build the prototype from `Tasks/Civida-Chatbot-Prototype-Spec.md` §10 — single `index.html`,
   chat UI + `CONTENT` object + tree-walker + district picker + escape hatch, then verify all paths
   (three groups, the emergency branch, escape hatches, back/start-over) at 390px + 320px.
2. Send the spec's §9 open questions to the manager (can run in parallel with the build).
3. On build start: create a root `CLAUDE.md`; commit `Claude Logs/` + `Tasks/`.

## Prompt to Start the Next Session
> Read `Claude Logs/CURRENT_CONTEXT.md`, `Claude Logs/SESSION_INDEX.md`, the latest log in
> `Claude Logs/logs/`, and `Tasks/Civida-Chatbot-Prototype-Spec.md`. Build the Civida support
> chatbot **prototype** exactly per that spec: a single self-contained `index.html`, static vanilla
> JS + HTML/CSS, no backend, decision-tree with the `CONTENT` object and the three groups
> (Applicant / Tenant / Recipient + "not sure"), the one-level emergency-transfer branch, the
> client-side District Picker, and the escape-hatch + Back/Start-over controls. Mobile-first, light
> Civida branding, warm plain-language tone. Then verify every path and log the session.
