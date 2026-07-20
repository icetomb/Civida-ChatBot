# Current Context

> **Living snapshot of the _current_ state only.** Overwrite these sections in place each
> session — do **not** prepend. Full history lives in `SESSION_INDEX.md` (one row per session)
> and `logs/` (detailed per-session entries). Keep this file lean (≤ ~150 lines). For stable
> rules see `/CLAUDE.md` (not created yet).

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
`dev` (at `5a2720f` "New updates for claude logs"). The `Claude Logs/` system is already
**committed**; **uncommitted right now:** `Tasks/Civida-Chatbot-Prototype-Spec.md` plus this
session's `CURRENT_CONTEXT` / `SESSION_INDEX` / new-log updates. Rayan handles commits.

## Current active tasks
1. **Prototype build — NOT STARTED (next up).** Build the single-file chatbot per
   `Tasks/Civida-Chatbot-Prototype-Spec.md` §10 (scaffold chat UI → CONTENT object + tree-walker →
   district picker + escape hatch → style → verify all paths).
2. **Planning + spec — DONE (2026-07-20).** Decisions locked; civida.ca links + A–H district
   directory gathered; per-group content drafted (paraphrased, pending CS sign-off).

## Content & links (all captured in the spec)
- Real form/page/portal URLs + the A–H district directory live in the spec §6–§7 (single source of
  truth): apply-now (RentCafé), rent-assistance + Benefit Portal (`my.ppulus.com/civida`), tenant
  PDFs (HS1/TM3/TM2/CM1/CM2/CM3 + handbook), district-offices, contacts.
- Three groups' questions map 1:1 to the manager's curated list; one branch (Tenant → transfer →
  "is this an emergency?").

## Open issues / things to watch
- **Answer wording is DRAFT** — needs the CS manager's sign-off before anything goes live.
- **6 open questions** to confirm (spec §9): applicant email `help@` vs `civida@`; maintenance
  extension (sources disagree ext 1 vs 2); exact approved copy; branding assets OK to pull;
  district picker vs link-out; whether the GBV path needs a sensitive safety note.
- District office **emails not captured** (the web fetch obfuscated them) — grab exact emails +
  addresses when building.
- **No `/CLAUDE.md` yet** — create once the build starts.
- **No analytics** (no backend) — the deflection metric returns with the future Flask phase.
- Git indexes the context file as `CURRENT_CONTEXT.MD` (uppercase, from the initial commit); a
  `git mv` to lowercase `.md` would match the reference (disk copy is already `.md`).

## Standing notes (operational facts)
- Project root: `Civida-ChatBot/` with `Claude Logs/` (this memory system) and `Tasks/` (now holds
  the prototype spec). Folder name uses a **space** (`Claude Logs`) unlike the reference
  `Claude_Logs`.
- Reference/"RYCHEZT" logging system lives in the connected `Financial-Model/Claude_Logs`.

## Next recommended step
1. Build the prototype from `Tasks/Civida-Chatbot-Prototype-Spec.md` (single `index.html`).
2. Confirm the §9 open questions with the manager (can run in parallel — wording is draft anyway).
3. Create a root `CLAUDE.md` when the build starts; commit `Tasks/` + the latest `Claude Logs/` updates.

## Last updated
2026-07-20 (planning complete; prototype spec written to `Tasks/`; build not started)
