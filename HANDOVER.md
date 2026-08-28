# Civida Help: Chatbot Handover

**Prepared by:** Rayan Zhi (developer), last day 2026-08-28
**For:** whoever picks this up next, on the Communications (content) or Systems (technical) side
**Escalation and decisions:** Ashton Wong (manager)
**The app:** `index.html` in this folder. Double-click it. That is the whole thing.

---

## 1. Start here (15 minutes)

1. Double-click `index.html`. Click through: Applicant, then Tenant > "I want to transfer" (the one Yes/No branch), then a district in the picker, then an escape hatch ("Something else / talk to a person").
2. Skim `Tasks/Civida-Chatbot-Prototype-Spec.md`, sections 1 to 3. That file is the single source of truth for content, links, and districts.
3. Open `index.html` in a text editor and find `var CONTENT`. Everything the bot says lives in that one object.
4. Technical readers: run `node --test tests/core.test.mjs` (Node 20+). Expect 17/17 passing.
5. Read section 10 below: the decisions nobody has made yet.

## 2. What this is and where it stands

Civida Help is a call-deflection chatbot prototype. Its single job: answer the routine questions the Customer Success team fields by phone that are already answerable from civida.ca. It first asks which kind of user is visiting (Applicant / Tenant / Recipient / Not sure), then walks them through that group's most common questions to a short answer plus the right link, form, or contact.

Guiding principle: **deflect, don't trap.** A visible "talk to a person" path is always present, and every answer ends with the group's contact. The moment the bot feels like a wall, people just call anyway.

To share the prototype, send the file itself: it opens by double-click on any computer, no install.

### Status as of 2026-08-28

| Area | State |
|---|---|
| Build | Prototype complete and verified (built 2026-07-20; official brand mark added 2026-08-05) |
| Tests | 17/17 passing, re-run 2026-08-28 |
| Git | Branch `dev`, working tree clean, latest commit `2e00db9` |
| Wording | All DRAFT, pending Customer Success sign-off. The footer carries a draft disclaimer |
| Deployment | Not deployed. Opens locally; not wired into civida.ca |
| VP presentation | Given 2026-08-05 (deck in `docs/`). Positive reception, no changes requested, no direction chosen yet |
| Next milestone | Customer Success wording review: share `index.html`, collect sign-off plus section 10 answers, apply edits to `CONTENT` |

Ownership as pitched to the VP: **Communications owns the content, Systems keeps it running.** It is cheap to keep: a single page, no vendor, no licence, no infrastructure.

## 3. Rules that must not break

| Rule | Why it exists |
|---|---|
| One single self-contained `index.html`, opens from `file://` by double-click | Shareable by sending one file; no server, no CORS. This is why images are embedded as base64 data URLs |
| No framework, no build step, no CDN, no backend | Nothing to install, nothing to maintain, works on any machine |
| Scripted decision tree only: buttons, no free text, no runtime AI | Zero hallucination risk, deliberate for a housing provider. AI is a roadmap phase, not this file |
| Content edits happen only in the `CONTENT` object (`<script id="core">`) | Content changes need no code changes and cannot break the logic |
| The core script stays DOM-free | The Node tests load and run it directly (`node:vm`). Browser APIs inside it break testing |
| Every group keeps its escape hatch; every leaf answer ends with the contact line | Both are added automatically by the logic. Deflect, don't trap |

## 4. Map of the repo

| Path | What it is |
|---|---|
| `index.html` | The entire app: styles, `CONTENT`, logic, DOM renderer |
| `Tasks/Civida-Chatbot-Prototype-Spec.md` | The spec and single source of truth: per-group content (section 5), district directory (6), every link and contact (7), deferred scope (8), open questions (9) |
| `tests/core.test.mjs` | 17 zero-dependency Node tests |
| `assets/` | Canonical brand sources: `Civida_Logo_RGB.png` and `civida-c-mark.png` (512px cropped C mark). The copies the app actually uses are embedded inside `index.html` |
| `docs/Civida-Help-VP-Deck-Themed.pptx` | The VP deck, built on the official Civida PowerPoint template |
| `docs/superpowers/plans/` | Implementation plan from the build session |
| `CLAUDE.md` | Working rules for AI-assisted coding sessions on this repo |
| `Claude Logs/` | Session history system: `CURRENT_CONTEXT.md` (living snapshot), `SESSION_INDEX.md` (one row per session), `logs/` (full detail). Optional to keep using, useful for archaeology |
| `README.md` | Stub |

## 5. How it works: three layers in one file

1. **`CONTENT`** (data): every word, link, contact, and district office. Editing this object is how the bot changes. This is the only part most people should touch.
2. **`renderStep(content, loc)`** (logic): a pure function that turns a location into `{ messages, options }`. No DOM access. This is what the unit tests exercise.
3. **DOM renderer** (the second `<script>` block): draws bubbles, user chips, and quick-reply buttons; keeps the history stack behind `Back` and `Start over`; handles animation, focus, and reduced motion.

A click runs `choose(label, loc)`: the choice echoes as a chip, `loc` is pushed onto `history`, and `renderStep` output is appended to the transcript.

`loc.view` values: `routing` (first prompt), `group` (question menu), `answer`, `followup`, `escape`, `picker`, `district`.

A link is either `{label, url}` (https page or PDF, `tel:`, `mailto:`) or `{label, action: "district-picker"}`.

Synthesized automatically, never hand-written into `CONTENT`: the escape option on every group menu, the "Still need help?" contact line on every leaf answer, "Ask another question", the picker's map-page fallback, and District G's redirect to H.

## 6. The question tree

Flow: greeting > routing question > group menu > answer (short text + links + contact line) > follow-up only where a node branches.

The routing prompt is the manager's exact wording and is test-enforced: *"To get you the right answer — which of these describes you?"*

### Applicant ("I've applied, or want to apply, for housing or a benefit")

Default contact: help@civida.ca / 780-420-6161

| id | Button | The answer points to |
|---|---|---|
| `rent-help` | How can I get help with my rent? | Rent Assistance Benefit; About page + Civida Benefit Portal (my.ppulus.com/civida) |
| `apply-housing` | How do I apply for housing? | Housing Applicant Portal (RentCafé) via Apply Now, plus the eligibility page |
| `no-response` | I've applied but haven't heard back | Points-based priority list, wait times can't be estimated; contact Civida once a year to keep the file active; Applicant FAQs |
| `speak` | I need to speak with someone | Call the main line, or book an appointment |

### Tenant ("I'm a current Civida tenant")

Default contact: their District Office, plus 780-420-6161

| id | Button | The answer points to |
|---|---|---|
| `maintenance` | I have a maintenance issue | District Office for repairs; maintenance emergencies call 780-420-6161, answered 24/7; responsibilities PDF |
| `rent-adjustment` | I need a rent adjustment - my income changed | HS1 Change of Income form, submitted to the District Office |
| `transfer` | I want to transfer / I need a bigger place | Emergency-only policy. **The only branching node:** "Is this an emergency?" Yes > TM3 Emergency Transfer form; No > not available, District Office can advise |
| `complaint` | I have a complaint | Must be in writing (email, mail, or office dropbox) to the District Office |
| `which-district` | What is my District Office? | Jumps straight into the district picker (`action` node, no answer text) |

### Recipient ("I receive a rent-assistance benefit from Civida")

Default contact: benefits@civida.ca

| id | Button | The answer points to |
|---|---|---|
| `deposit` | When will I get my benefit? | Deposited on or before the first business day of each month |
| `annual-review` | What do I need for my Annual Review? | Benefit Portal: upload proof of rent + income verification |
| `calculation` | How was my benefit calculated? Why did it change? | Benefit = market rent minus 30% of household income |
| `gbv` | Can I reapply for the Gender-Based Violence (GBV) benefit? | One-time benefit; points to Rent Assistance instead. Carries the open safety-note decision (section 10, item 9.6). Tone: gentle, no judgment |

### Not sure / something else

A direct-answer group with no question menu: general help right away (780-420-6161, civida@civida.ca, Contact Us page).

### District picker

Reached from Tenant links or `which-district`. The user picks District A to H by example buildings, then gets that office's card: location, phone, and hours (Tue / Thu / Fri, 8:30 a.m. to 4:00 p.m.), plus a fallback link to the district-offices map page. District G walk-ins are closed: picking G automatically shows District H's card.

Two cautions: the directory is a 2026-07-20 snapshot of civida.ca (verify before wider use), and district emails are deliberately not embedded (they live on the district-offices page).

## 7. Editing content (Communications)

Everything below happens in `index.html`, inside `<script id="core">`, in the `CONTENT` object. Nothing else needs touching.

- **Change wording:** find the question by its `label`, edit the `answer` string. Keep it short, warm, plain-language. Text stays inside the quotes; leave the commas and braces alone. A `\n` inside a string renders as a line break in the bubble.
- **Change a phone/email:** the canonical values sit in `CONTENT.contacts`, but numbers and addresses are also written out inside some answer strings and `contactText` lines. Search the whole file for the old value and replace every occurrence.
- **Add a question:** copy an existing `{ id, label, answer, links }` block inside that group's `questions` array. Give it a unique lowercase-hyphen `id`. Array order is display order. Example skeleton:

```js
{
  id: "parking",
  label: "Who do I ask about parking?",
  answer: "Contact your District Office.",
  links: [{ label: "Find my District Office", action: "district-picker" }]
}
```

- **Links:** `{label, url}` with https URLs on civida.ca / my.ppulus.com (plus `tel:` and `mailto:`), or `{label, action: "district-picker"}`.
- **Never hand-add** the escape option, the "Still need help?" line, or "Ask another question": the logic generates them (section 5).
- **Expect the tests to complain, on purpose.** They pin the question count per group, the contact values, and the big URLs byte-for-byte. A legitimate change (a new question, an updated PDF link) fails tests until the matching expectation in `tests/core.test.mjs` is updated too. That is the guard rail working: update the expectation deliberately, never delete the test.
- **Sign-off:** every answer is a paraphrase and stays DRAFT until the Customer Success manager approves the wording. The footer disclaimer comes off only after that.

## 8. Checking your work

**Automated:** `node --test tests/core.test.mjs` (Node 20+; pass the file path, a bare `tests/` argument fails on some setups). Expect `# pass 17`. Coverage: group order and routing prompt, contacts, per-group question counts, node and link shape, byte-exact portal/PDF URLs, the full district directory, the transfer branch, the escape hatch on every menu, the contact line on every leaf, the G-to-H redirect, and a crawl of every reachable location (33 at last count) checking each one renders and terminates.

**Manual, two minutes after any edit:** open the file and click the changed path end to end. Then: each of the four groups, the transfer Yes/No, one district card, one escape hatch, `Back`, and `Start over`. Check a phone width if layout changed; the build was verified at 390px and 320px.

## 9. Branding: done and deferred

- **Done:** the official C mark marks every bot turn and is the favicon, embedded as base64 inside `index.html` (single-file rule). Canonical sources are in `assets/`. If the logo ever changes: re-crop the C mark, then re-embed it in both places (the favicon `<link>` in `<head>` and the `.msg-bot.step-start::before` CSS rule).
- **Deferred on purpose:** the UI palette is still the one sampled from civida.ca in July 2026 (purple `#452283`, ink `#231142`, coral `#dc5339`, amber `#ffaa2d`). The official palette arrived 2026-08-05: Indigo `#5D2972`, Rose `#953372`, Grass `#7D9917`, Lime `#B3C50E`, Charcoal `#363434`, Stone `#76777B`, White. It is recorded in the `:root` comment in `index.html`. Swapping the `:root` tokens is the whole change, but the official palette has no coral or amber equivalent, and those colors carry meaning here (coral = escape hatch, amber = focus outline). That mapping needs a human decision first: see section 10.
- The brand font "Eagle" is licensed and cannot ship inside a single file; system font stacks stand in for it.

## 10. Open decisions being handed over (all still open as of 2026-08-28)

| # | Decision | Where it's flagged |
|---|---|---|
| 9.1 | Applicant email: `help@civida.ca` (manager's note, currently shown) or `civida@civida.ca` (site general)? | Comment at `CONTENT.contacts.applicantEmail` |
| 9.2 | Maintenance routing: District Office (current) or a specific extension on 780-420-6161? Sources disagreed on ext. 1 vs 2, so no extension is printed | Comment at the tenant `maintenance` node |
| 9.3 | Exact approved copy: every answer is a paraphrase pending Customer Success sign-off | Footer disclaimer; spec section 5 |
| 9.4 | Official palette swap, including the coral/amber mapping | `:root` comment in `index.html`; section 9 above |
| 9.5 | Keep the in-bot district picker, or link only to the map page? (Currently both: picker with map fallback) | Spec section 9.5 |
| 9.6 | Should the GBV answer carry a 24/7 safety-resource note? Manager to decide; keep the tone gentle | Comment at the recipient `gbv` node |

Plus one data chore: refresh the A-to-H district directory against civida.ca before any launch (snapshot dated 2026-07-20).

## 11. Out of scope on purpose (don't rebuild these by accident)

From spec section 8: analytics and call-deflection logging (the payoff metric, and the reason a thin Flask backend returns later); free-text AI answers (a later phase: approved content only, human hand-off when unsure); real address-to-district lookup; full site FAQ coverage (only the manager's curated set ships); translation and full accessibility (the live site uses Recite Me and CanTalk); and a self-serve editing UI for the CS team.

## 12. Where this goes next (as pitched to the VP)

Phases, deliberately without dates:

1. **Implementation:** wire it into civida.ca and launch.
2. **Data & analytics:** measure what gets asked and what calls get deflected.
3. **Future features:** headline is an automated AI pipeline that books appointments inside the chat; also free-text questions and more languages.

The deck's closing asks, still awaiting VP direction: does Applicant/Tenant/Recipient routing fit how Civida thinks about its customers; which metric counts as success; which roadmap phase matters first. Reception on 2026-08-05 was positive with no changes requested.

## 13. People and pointers

| Who | Role in this project |
|---|---|
| Ashton Wong | Manager: escalation point and owner of the section 10 decisions |
| Communications team | Owns what the bot says |
| Customer Success manager | Curated the question set; wording sign-off is hers |
| Systems team | Keeps it running: tests, and deployment when that day comes |
| Rayan Zhi | Original developer (internship ended 2026-08-28) |

Pointers: the spec (`Tasks/`), the VP deck (`docs/`), brand sources (`assets/`), session-by-session history (`Claude Logs/SESSION_INDEX.md`), and the AI-session working rules (`CLAUDE.md`).

---

*Written 2026-08-28 and verified against the repo that day: branch `dev` clean at commit `2e00db9`, tests 17/17.*
