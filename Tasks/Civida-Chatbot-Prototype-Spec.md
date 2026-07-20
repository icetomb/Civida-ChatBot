# Civida Support Chatbot — Prototype Spec

**Status:** Draft for review (Ray + Customer Success manager) · **Date:** 2026-07-20 · **Owner:** Ray
**Phase:** Prototype (proof-of-concept). Not production.

---

## 1. Purpose & goal

A small web chatbot for Civida whose single job is **call deflection**: answer the routine
questions the Customer Success team fields by phone that are already answerable from civida.ca.
It does this by first identifying **which kind of user** is asking, then walking them through that
group's most common questions to a short answer plus the right link, form, or contact.

**Guiding principle — deflect, don't trap.** The bot handles the easy questions and makes it
*easy* to reach a human for everything else. A visible "talk to a person" path is always present.
The moment it feels like a wall, people just call anyway.

**Success for the prototype** = a clickable, shareable demo that shows the Customer Success
manager exactly how the pattern works, using her curated questions and real Civida links.

## 2. Locked decisions (scope)

| Decision | Choice | Notes |
|---|---|---|
| Bot type | **Scripted decision tree** | Buttons/menus only. No AI at runtime. Zero hallucination risk. |
| Frontend | **Static, vanilla JS + HTML/CSS** | Matches Ray's Financial-Model style; no framework/build step. |
| Backend | **None (for now)** | Content lives in the page. Backend (Flask) returns later for AI + analytics. |
| Target | **Standalone prototype** | Self-contained; not yet wired into civida.ca. |
| Packaging | **Single self-contained `index.html`** | Content inlined as a JS object so it opens by double-click — no server, no `file://` fetch/CORS issue. Trivial to share. |
| Content source | **CS manager's curated FAQ list** | Real civida.ca links (gathered below). Draft wording pending her sign-off. |

## 3. Interaction design (UX rules)

- **Chat-style panel.** Bot messages in bubbles on the left; the user's chosen option echoes as a
  chip on the right; options render as **quick-reply buttons** under the latest bot message.
- **Flow:** greeting → pick your group → pick a question → answer (short text + links + the group's
  default contact) → follow-up buttons if the node branches.
- **Routing question (first prompt), from the manager's wording:** *"To get you the right answer —
  which of these describes you?"*
  - **Applicant** — "I've applied, or want to apply, for housing or a benefit"
  - **Tenant** — "I'm a current Civida tenant"
  - **Recipient** — "I receive a rent-assistance benefit from Civida"
  - **Not sure / something else** — routes to general help (780-420-6161 / civida@civida.ca).
- **Escape hatch (required in every group):** a "Something else / talk to a person" option that
  shows that group's default contact. Every answer also ends with a quiet "Still need help?" →
  same contact.
- **Navigation controls, always available:** `‹ Back` (previous step), `⟲ Start over` (back to the
  group choice), and after any answer `Ask another question` (back to the current group's list).
- **Tone:** warm, plain-language, short sentences. The **gender-based-violence** path is handled
  gently and without judgment.
- **Mobile-first:** large tap targets, readable type, works one-handed on a phone (many applicants
  are on phones).
- **Light Civida branding:** their logo + brand colors so stakeholders can picture it on the real
  site. (Pull assets from civida.ca; confirm with Ray — see Open Questions.)
- **Accessibility (basic for the prototype):** real `<button>` elements, keyboard operable,
  sufficient contrast. Full a11y + translation is deferred (see §8).

## 4. Data model

All content is one JS object (later trivially a JSON file when a backend arrives). Editing this
object is how the CS team updates the bot — no code changes.

```js
const CONTENT = {
  meta: {
    title: "Civida Help",
    greeting: "Hi! I can point you to the right answer fast. Which of these describes you?"
  },
  contacts: {
    mainPhone: "780-420-6161",
    applicantEmail: "help@civida.ca",   // confirm vs civida@civida.ca (see Open Questions)
    benefitsEmail: "benefits@civida.ca",
    generalEmail:  "civida@civida.ca"
  },
  groups: [
    {
      id: "tenant",
      label: "I'm a current Civida tenant",
      defaultContact: { text: "your District Office (or call 780-420-6161)", action: "district-picker" },
      questions: [
        {
          id: "transfer",
          label: "I want to transfer / I need a bigger place",
          answer: "Transfers are only arranged in emergency situations — an imminent, life-threatening situation.",
          followUp: {
            prompt: "Is this an emergency?",
            options: [
              { label: "Yes", answer: "Please complete the Emergency Transfer form and submit it to your District Office.",
                links: [{ label: "Emergency Transfer form (PDF)", url: "https://civida.ca/wp-content/uploads/2024/01/TM3-Emergency-Transfer-2024.pdf" }] },
              { label: "No", answer: "Non-emergency transfers aren't available. Your District Office can tell you more.",
                links: [{ label: "Find my District Office", action: "district-picker" }] }
            ]
          }
        }
        // ...more questions
      ]
    }
    // ...more groups
  ],
  districts: [ /* see §6 */ ]
};
```

**Node fields:** `id`, `label` (button text), `answer` (short text), optional `links[]`, optional
`followUp` (a nested one-level branch). A **link** is either `{label, url}` (opens a page/PDF) or
`{label, action}` for a client-side action (currently only `"district-picker"`).

## 5. Content — the three groups

Wording below is **draft** (paraphrased from the manager's "easiest answers" + civida.ca) and needs
her sign-off. Each group appends its **default contact** to answers.

### 5A. Applicant — default contact: help@civida.ca / 780-420-6161
1. **"How can I get help with my rent?"** → You may be eligible for the **Rent Assistance Benefit**,
   which helps you afford rent with a private landlord. Apply through the Civida Benefit Portal.
   Links: [About Rent Assistance](https://civida.ca/housing-programs/rent-assistance/) ·
   [Apply — Benefit Portal](https://my.ppulus.com/civida)
2. **"How do I apply for housing? / I need housing"** → Apply online through the Housing Applicant
   Portal (RentCafé). Check eligibility first.
   Links: [Apply Now](https://civida.ca/apply-now/) ·
   [Eligibility](https://civida.ca/housing-programs/eligibility/)
3. **"I've applied but haven't heard back yet"** → Your file will be reviewed. Civida uses a
   points-based **priority list** (not first-come, first-served), so wait times vary and can't be
   estimated. Someone will reach out when more info is needed. Contact Civida at least once a year to
   keep your file active.
   Links: [Applicant FAQs](https://civida.ca/housing-programs/applicant-faqs/)
4. **"I need to speak with someone"** → Call **780-420-6161**. To meet in person, book an
   appointment.
   Links: [Make an appointment](https://civida.ca/make-an-appointment/)
5. *Escape:* **"Something else / talk to a person"** → help@civida.ca or 780-420-6161.

### 5B. Tenant — default contact: your District Office (+ 780-420-6161)
1. **"I have a maintenance issue (e.g., door won't lock, water problem)"** → For repairs, contact
   your **District Office**. For a maintenance **emergency**, call **780-420-6161** (24/7).
   Links: [Find my District Office](action: district-picker) ·
   [Tenant Maintenance Responsibilities (PDF)](https://civida.ca/wp-content/uploads/2021/02/Tenant-Maintenance-Responsibilities_INFO.pdf)
2. **"I need a rent adjustment (my income changed)"** → Submit a **Change of Income** form to your
   District Office so your rent can be reviewed.
   Links: [Change of Income form — HS1 (PDF)](https://civida.ca/wp-content/uploads/2024/01/HS1-Change-of-Income-Information-Form-2022-06.pdf) ·
   [Find my District Office](action: district-picker)
3. **"I want to transfer / I need a bigger place"** → Transfers are only arranged in **emergency**
   situations (imminent, life-threatening). → **Follow-up: "Is this an emergency?"**
   - **Yes** → Complete the **Emergency Transfer form** and submit to your District Office.
     Link: [Emergency Transfer form — TM3 (PDF)](https://civida.ca/wp-content/uploads/2024/01/TM3-Emergency-Transfer-2024.pdf)
   - **No** → Non-emergency transfers aren't available; your District Office can tell you more.
     Link: [Find my District Office](action: district-picker)
4. **"I have a complaint"** → Complaints must be **in writing** (email, mail, or dropbox) with as
   much detail as possible, sent to your District Office.
   Links: [Find my District Office](action: district-picker)
5. **"What is my District Office?"** → It depends on your building. → opens the **District picker**.
6. *Escape:* **"Something else / talk to a person"** → District Office or 780-420-6161.

### 5C. Recipient (benefit) — default contact: benefits@civida.ca
1. **"When will I get my benefit? / When is it deposited?"** → Your benefit is always deposited **on
   or before the first business day of each month**.
2. **"What do I need for my Annual Review?"** → Log into the **Civida Benefit Portal**, review your
   file, and upload **proof of rent** (current lease or renewal) and **income verification** (e.g.,
   your latest Notice of Assessment). Specific questions: benefits@civida.ca.
   Links: [Civida Benefit Portal](https://my.ppulus.com/civida)
3. **"How was my benefit calculated? / Why did it go down?"** → It's based on your **total household
   income** and the **local market rent**: the benefit is the difference between affordable rent
   (30% of household income) and the market rent for your unit. As income rises, the benefit can
   decrease.
4. **"Can I reapply for the Gender-Based Violence (GBV) benefit?"** → No — the GBV benefit is a
   **one-time** benefit. If you need ongoing support, you're welcome to apply for the **Rent
   Assistance Benefit**.
   Links: [About Rent Assistance](https://civida.ca/housing-programs/rent-assistance/) ·
   [Apply — Benefit Portal](https://my.ppulus.com/civida)
5. *Escape:* **"Something else / talk to a person"** → benefits@civida.ca.

## 6. District office handling

The manager wants tenants to reach *their* office. With no backend we can't do a real
address→office lookup, so the prototype uses a **client-side District Picker**: the user picks their
building/area from a list and gets that office's details. (Alternatively, link out to the map on
[civida.ca/district-offices](https://civida.ca/district-offices/) — recommended fallback link.)

**Directory (as of 2026-07-20):** offices open **Tue/Thu/Fri, 8:30 a.m.–4:00 p.m.** Emails are on
the district-offices page (not reproduced here — the fetch obfuscated them; grab exact addresses
when building).

| Office | Location | Phone | Example buildings |
|---|---|---|---|
| District A | Parkdale ONE, 8315 113 Ave NW | 780-851-7227 | Alliance Manor, Central Village, Flagstaff, Greystone Manor |
| District B | O-day'min Village, 10350 95 St NW | 780-851-7322 | Ashton Apts, McCauley, Montrose I, Queen Alexandra |
| District C | Ormsby Place II, 6250 180 St NW | 780-851-7349 | Belmead I–III, Brander Gardens, Lymburn, Ormsby Place |
| District D | Duggan, #4 3716 105 St NW | 780-851-7402 | Blue Quill, Duggan, Ekota, Saddleback, Yellowbird |
| District E | Lee Ridge I, 549 Millbourne Road East | 780-851-7411 | Hillview, Kameyosek, Lee Ridge, Tweddle Place |
| District F | Lorelei VI, 16217 103 St NW | 780-851-7419 | Caernarvon, Calder, Dunluce, Lorelei |
| District G | **Closed** (walk-ins) → served by District H | — | Abbottsfield, Clareview, Rundle Heights (now via H) |
| District H | Londonderry, 14544 72 St NW | 780-851-9223 | Belvedere, Clareview V–VI, Steele Heights + former G |

## 7. Reference — links & contacts (single source of truth)

**Portals / key pages:** Apply for housing (RentCafé) `https://civida.ca/apply-now/` ·
Eligibility `https://civida.ca/housing-programs/eligibility/` ·
Rent Assistance `https://civida.ca/housing-programs/rent-assistance/` ·
Benefit Portal (Ppulus) `https://my.ppulus.com/civida` ·
GBV Benefit `https://civida.ca/housing-programs/gbv/` ·
Make an appointment `https://civida.ca/make-an-appointment/` ·
District offices `https://civida.ca/district-offices/` ·
Tenant resources `https://civida.ca/tenant-resources/` ·
Info sheets & forms `https://civida.ca/tenant-resources/info-forms/` ·
Contact us `https://civida.ca/contact-us/`

**Forms (PDF):** HS1 Change of Income `.../2024/01/HS1-Change-of-Income-Information-Form-2022-06.pdf` ·
TM3 Emergency Transfer `.../2024/01/TM3-Emergency-Transfer-2024.pdf` ·
TM2 Move Out `.../2021/06/TM2-Tenant-Notice-of-Move-Out.pdf` ·
CM2 Change of Household Info `.../2019/01/CM2_Change-of-Household-Information-2026.pdf` ·
CM1 Annual Income Review `.../2019/01/CM1_CH-AIR-Package-2026.pdf` ·
CM3 Consent to Release Info `.../2019/01/CM3_Consent-to-Release-Personal-Info-2026.pdf` ·
Tenant Handbook `.../2019/01/Civida-Tenant-Handbook-June-2024-1.pdf`
(all under `https://civida.ca/wp-content/uploads/`)

**Contacts:** Main **780-420-6161** · Fax 780-426-6854 · General/applicants **civida@civida.ca** ·
Benefits **benefits@civida.ca** · Main office **10232 – 112 Street NW, Edmonton, AB T5K 1M4** ·
Hours Tue–Fri 8:30–4 in person (Mon/Wed remote only) · Interpretation in 200+ languages.

## 8. Out of scope / deferred (conscious choices)

- **Analytics / logging** — which questions get asked, how many calls deflected. This is the payoff
  metric and the reason a thin **Flask backend** returns later.
- **AI / free-text understanding** — phase 2; would answer only from approved content, with a human
  hand-off when unsure.
- **Real address → district lookup** — using the client-side picker instead.
- **Full website FAQ coverage** — prototype ships only the manager's curated set.
- **Translation & full accessibility** — the live site uses Recite Me + CanTalk; the prototype is
  plain English with basic a11y.
- **CS self-serve editing UI** — for now the CS team edits the content object directly.

## 9. Open questions to confirm (Ray / manager)

1. **Applicant email:** show `help@civida.ca` (manager's note) or `civida@civida.ca` (site general)?
2. **Maintenance line:** route tenants to their District Office, or a specific ext. on 780-420-6161?
   (Sources disagree on ext. 1 vs 2 — confirm before we print an extension.)
3. **Answer wording:** this draft paraphrases; does the manager want exact approved copy?
4. **Branding:** OK to pull Civida's logo + colors for the prototype look?
5. **District picker:** pick-from-list in the bot, or just link to the district-offices map page?
6. **GBV / crisis:** should that path carry a more prominent, sensitive safety note or a 24/7
   resource, beyond the reapply answer?

## 10. Build plan (next session)

1. Scaffold the single `index.html` — chat panel, message list, quick-reply button row (mobile-first
   CSS, light Civida branding).
2. Drop in the `CONTENT` object (§4–§6) and write the tree-walker (render group → questions →
   answer/links → follow-up).
3. Implement the **District Picker** action and the **escape hatch** + `Back` / `Start over` /
   `Ask another question` controls.
4. Style pass (bubbles, buttons, spacing, phone widths) + tone polish.
5. **Verify** each path: all three groups, the emergency transfer branch (Yes/No), the district
   picker, every escape hatch, and back/start-over from every step. Check 390px + 320px widths.
6. Deliver as a single openable file for the manager to click through; log the session.

---
*Content accuracy: links verified against civida.ca on 2026-07-20. Answer text is draft pending
Customer Success sign-off.*
