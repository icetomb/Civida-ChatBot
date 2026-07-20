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
links to the right form, portal, or district office. **Nothing is built yet** — the repo is a
fresh git repo; this session set up the logging system and gathered source context for planning.

## Routing model (the core interaction)
The chat's **first question** classifies the user into one of three groups (the Customer
Success manager's framing — *"have you applied for housing or the benefit, are you a Civida
tenant, or do you receive a rental assistance benefit from Civida?"*):
- **Applicant** — has applied (or wants to apply) for housing or a benefit.
- **Tenant** — currently rents a Civida-managed home.
- **Recipient** — receives a rental-assistance benefit (RAB / TRAB / GBV) from Civida.
Each group then gets its own curated FAQ set. The manager supplied a starter list of the most
common questions per group, the "easiest answer" (A), and a fallback contact
(`help@civida.ca` / `benefits@civida.ca` / District Office / 780-420-6161).

## Current branch
`main` — initial commit only (`README.md`, 16 bytes). Everything from this session is
**uncommitted / untracked** (the new `Claude Logs/` files). Rayan handles commits.

## Current active tasks
1. **Chatbot planning — NOT STARTED (next up).** Decide scope, tech stack, where the FAQ
   content lives, how routing/classification works, and how answers link out. No spec or plan
   written yet — will live under `Tasks/`.
2. **Logging system — SET UP THIS SESSION.** `Claude Logs/` now mirrors the RYCHEZT
   (Financial-Model) reference: README, LOGGING_FORMAT, CURRENT_CONTEXT, SESSION_INDEX, logs/.

## Source material gathered (civida.ca, 2026-07-20)
- **Six housing programs:** Community (Social) Housing, Near Market (Affordable), Mixed Income,
  Rent Assistance Benefit (RAB) + Temporary (TRAB), Gender-Based Violence (GBV) Benefit, Women
  Building Futures.
- **Two separate portals** (a known confusion point a bot can clear up): **RentCafé** = Housing
  Applicant Portal; **Civida Benefit Portal** (`my.ppulus.com/civida`) = rent-assistance
  benefits. Applying for both = two separate applications.
- Deep FAQ libraries already exist on-site for Applicants and Tenants (already Q&A-shaped — good
  bot source material).
- Deflection endpoints: 780-420-6161, `civida@civida.ca`, district offices, free translation via
  Recite Me (web) + CanTalk (phone/in-person), 211 Alberta for emergencies.

## Open issues / things to watch
- **No `/CLAUDE.md` yet** — the workflow's "read stable rules first" step has no target until
  one is created (recommended during/after planning, once the stack is chosen).
- FAQ answer content is not yet captured into the repo — only summarized in this session's log
  and the manager's screenshots. A content model is a planning decision.
- Group definitions can overlap (a tenant may also be a benefit recipient) — routing needs a
  plan for multi-role users.

## Standing notes (operational facts)
- Project root: `Civida-ChatBot/` containing `Claude Logs/` (this system) and `Tasks/` (empty;
  will hold specs/plans). Note the folder name uses a **space** (`Claude Logs`), unlike the
  reference's `Claude_Logs`.
- Reference/"RYCHEZT" logging system lives in the connected `Financial-Model/Claude_Logs` — the
  house style for logs is dense, honest, and verification-focused.

## Next recommended step
1. Run a planning session: define the chatbot's scope, the group-routing flow, the FAQ content
   model, and the tech stack; capture it under `Tasks/`.
2. Create a root `CLAUDE.md` with stable project rules once the stack is decided.
3. Begin development per the plan.

## Last updated
2026-07-20 (logging-system setup + civida.ca context-gathering; nothing built yet)
