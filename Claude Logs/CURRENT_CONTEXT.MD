# Current Context

> **Living snapshot of the _current_ state only.** Overwrite these sections in place each
> session — do **not** prepend. Full history lives in `SESSION_INDEX.md` (one row per session)
> and `logs/` (detailed per-session entries). Keep this file lean (≤ ~150 lines). For stable
> rules see `/CLAUDE.md`.

## What the project does
A **customer-support chatbot for Civida** — Edmonton's largest provider of community and
affordable housing (civida.ca). Its purpose is to **deflect the redundant phone calls** the
Customer Success team fields whose answers already live on the website, by identifying which
customer group a visitor belongs to and then answering that group's most common questions with
links to the right form, portal, or district office.

## Locked decisions (this prototype)
**Scripted decision tree** (buttons/menus, no runtime AI) · **static vanilla JS + HTML/CSS** ·
**no backend** · **standalone prototype** · packaged as a **single self-contained `index.html`**
(content inlined as a JS object so it opens by double-click — no server/CORS). Full spec:
`Tasks/Civida-Chatbot-Prototype-Spec.md`.

## Routing model (the core interaction)
The chat's **first question** classifies the user (manager's framing):
- **Applicant** — has applied / wants to apply for housing or a benefit.
- **Tenant** — currently rents a Civida-managed home.
- **Recipient** — receives a rent-assistance benefit (RAB / TRAB / GBV).
- **Not sure / something else** — routes to general help (780-420-6161 / civida@civida.ca).
Each group then shows its curated questions; every group keeps a visible "talk to a person"
escape hatch + Back / Start-over controls.

## Current branch
`dev` (spec + logs committed by Rayan earlier). **Uncommitted right now:** `index.html`
(logo-avatar edit), `assets/` (new — official logo + C mark), `tests/`, `CLAUDE.md`, `docs/`
(implementation plan), and `Claude Logs/` updates. Rayan handles commits.

## Current active tasks
1. **Prototype build — DONE (2026-07-20).** `index.html` built per spec §10 and verified:
   17/17 unit tests (`node --test tests/core.test.mjs`) + full browser click-through of every
   path at 390px and 320px. Architecture: CONTENT object (CS team edits this only) → DOM-free
   `renderStep` logic (vm-tested) → DOM renderer. Log:
   `logs/2026-07-20_chatbot-prototype-build.md`.
2. **Official brand mark integrated — DONE (2026-08-05).** Rayan supplied the official logo +
   palette hexes. The "C" mark (cropped, `assets/civida-c-mark.png`) now marks every bot turn
   and is the favicon — embedded in `index.html` as a base64 data URL to keep the single-file
   constraint. Palette swap intentionally deferred (Rayan chose icon-only scope). 17/17 tests +
   390/320px screenshots re-verified. Log: `logs/2026-08-05_civida-logo-avatar.md`.
3. **CS manager review — NEXT.** Share `index.html`; collect wording sign-off + §9 answers;
   apply edits to the `CONTENT` object (no code changes needed).

## Content & links (all captured in the spec)
- Real form/page/portal URLs + the A–H district directory live in the spec §6–§7 (single source
  of truth) and are now inlined in `index.html`'s CONTENT object; unit tests byte-verify the
  key URLs against the spec strings.
- Three groups' questions map 1:1 to the manager's curated list; one branch (Tenant → transfer →
  "is this an emergency?"); Tenant also has the district-picker question (G closed → H).

## Open issues / things to watch
- **Answer wording is DRAFT** — needs the CS manager's sign-off (footer disclaimer says so).
- **§9 open questions:** 4 (branding) is now half-answered — official logo integrated, and
  official palette hexes are on file (recorded in the §9.4 comment in `index.html`: Indigo
  `#5D2972` · Rose `#953372` · Grass `#7D9917` · Lime `#B3C50E` · Charcoal `#363434` · Stone
  `#76777B` · White `#FFFFFF`). Still pending: 1 applicant email, 2 maintenance ext, 5 picker
  vs link-out, 6 GBV safety note.
- **UI palette still the sampled set** (`#452283` purple / `#231142` ink / `#dc5339` coral /
  `#ffaa2d` amber): swapping `:root` to the official hexes is a deliberate future change —
  official palette has no amber/coral roles, so escape-hatch/focus mapping needs a decision.
  Brand font "Eagle" still can't be embedded (licensed) — system stacks stand in.
- **`assets/` has no code path** — the avatar/favicon are embedded data URLs; if the mark
  changes, re-export from `assets/` and re-embed (documented in the CSS comment).
- District office **emails not shown** (civida.ca obfuscates them) — district cards link to the
  live district-offices page instead.
- `node --test` on this machine needs the explicit file arg (`tests/core.test.mjs`).
- Git indexes the context file as `CURRENT_CONTEXT.MD` (uppercase, from the initial commit); a
  `git mv` to lowercase `.md` would match the reference (disk copy is already `.md`).
- **No analytics** (no backend) — the deflection metric returns with the future Flask phase.

## Standing notes (operational facts)
- Project root: `Civida-ChatBot/` with `Claude Logs/` (memory system), `Tasks/` (spec),
  `docs/superpowers/plans/` (implementation plan), `tests/` (Node test suite), `assets/`
  (official logo + C mark — canonical brand sources), `index.html` (the deliverable),
  `CLAUDE.md` (project rules). Folder name uses a **space** (`Claude Logs`).
- Reference/"RYCHEZT" logging system lives in the connected `Financial-Model/Claude_Logs`.
- The `<script id="core">` block in `index.html` must stay DOM-free (tests evaluate it in vm).

## Next recommended step
1. Rayan: double-click `index.html` to review the new C-mark avatar + favicon, then commit
   (`index.html`, `assets/`, `Claude Logs/`).
2. Send the file to the CS manager; collect §9 answers + approved wording.
3. Apply approved copy to CONTENT; re-run tests; log the session.
4. Later phases: §9.4 palette swap (hexes on file), Flask backend (analytics), AI free-text
   layer, address→district lookup, translation + deeper a11y.

## Last updated
2026-08-05 (official C mark = bot avatar + favicon; assets/ added; palette swap deferred)
