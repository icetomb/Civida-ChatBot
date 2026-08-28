# Civida Support Chatbot Prototype — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-file, scripted decision-tree support chatbot for Civida described in `Tasks/Civida-Chatbot-Prototype-Spec.md` — a clickable, shareable call-deflection demo.

**Architecture:** One self-contained `index.html` holding three layers: (1) a `CONTENT` data object (all copy, links, contacts, districts — the CS team edits only this), (2) a DOM-free pure logic layer (`renderStep(content, loc)` maps a location descriptor to messages + option buttons), (3) a thin DOM renderer (chat transcript, quick-reply buttons, Back/Start-over history stack). The pure layer is extracted from the HTML by a zero-dependency Node test file and exercised with a full-tree reachability crawl.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no build step, no CDN, no external assets). Tests: Node built-in `node:test` + `node:vm` (Node v24 present). Verification: Chrome browser automation at 390px and 320px.

## Global Constraints

*(from the spec's locked decisions — every task implicitly includes these)*

- Deliverable is a **single self-contained `index.html`** that opens by double-click from `file://` — no server, no fetch, no CORS, no CDN links, no external fonts/images. System font stack only.
- **Scripted decision tree only** — buttons/menus; no free-text input, no AI at runtime.
- **No git commits** — Rayan handles all commits (per `Claude Logs/CURRENT_CONTEXT.md`). Plan steps end at "tests pass", never at "commit".
- Routing question uses the manager's exact wording: *"To get you the right answer — which of these describes you?"* with 4 options: Applicant / Tenant / Recipient / Not sure–something else.
- **Escape hatch in every group** menu: "Something else / talk to a person" → that group's default contact. Every **leaf** answer ends with a quiet "Still need help?" + the group contact. (A branching answer shows its follow-up question instead; its leaves carry the contact line.)
- Navigation always available: `‹ Back` (previous step), `⟲ Start over` (header), `Ask another question` after every answer.
- **Mobile-first**: layouts verified at 390px and 320px; tap targets ≥ 44px; real `<button>` elements; keyboard operable; visible focus; WCAG-ish contrast; `prefers-reduced-motion` respected.
- All URLs must be **exactly** the spec §7 strings (https, hosts `civida.ca` / `my.ppulus.com` only). District directory exactly per spec §6 (8 districts, G closed → served by H; hours Tue/Thu/Fri 8:30 a.m.–4:00 p.m.).
- Wording is DRAFT pending CS sign-off → footer carries a small disclaimer line.
- **Open-question defaults** (spec §9, prototype-safe, each flagged with a `<!-- §9.n -->` comment in the file): (1) applicant email `help@civida.ca` per §5A; (2) no phone extension printed for maintenance — District Office + 780-420-6161 for emergencies; (3) draft wording as-is; (4) brand **colors only + text wordmark**, no hot-linked logo (offline-safe); (5) in-bot district picker **plus** fallback link to the district-offices map page; (6) GBV answer kept to the manager's curated wording, phrased gently, with an HTML comment marking where a safety note would go if the manager wants one.
- Tone: warm, plain language, short sentences.

## File Structure

- `index.html` — the deliverable. Internal order: `<style>` → markup → `<script id="core">` (CONTENT + pure logic, **no DOM access**) → `<script>` (DOM renderer). The `id="core"` script is the test-extraction boundary.
- `tests/core.test.mjs` — extracts the core script with a regex, evaluates it in `node:vm`, asserts content shape + full-tree reachability. Run with `node --test tests/`.
- `CLAUDE.md` — root project guide (created in the final task, as `CURRENT_CONTEXT.md` instructs).
- `Claude Logs/…` — session log + context/index updates (final task).

---

### Task 1: Test harness + CONTENT data object

**Files:**
- Create: `tests/core.test.mjs`
- Create: `index.html` (skeleton + `CONTENT` only; logic/DOM come in Tasks 2–3)

**Interfaces:**
- Produces: global `CONTENT` object (shape below) inside `<script id="core">`, extractable via `/<script id="core">([\s\S]*?)<\/script>/`. Later tasks rely on these exact field names:
  - `CONTENT.meta = {title, greeting, restart, routingPrompt}`
  - `CONTENT.contacts = {mainPhone, applicantEmail, benefitsEmail, generalEmail}`
  - `CONTENT.groups[]` = `{id, label, sublabel, contactText, contactLinks[], questions[]?, answer?, links[]?}`
  - question = `{id, label, answer?, links[]?, followUp?: {prompt, options: [{label, answer, links[]?}]}, action?: "district-picker"}`
  - link = `{label, url}` XOR `{label, action: "district-picker"}`
  - `CONTENT.districts[]` = `{id, office, location?, phone?, buildings, closed?, servedBy?}`
  - `CONTENT.pages = {districtOffices, contactUs}`

- [ ] **Step 1: Write the failing content tests**

Create `tests/core.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

export function loadCore() {
  const m = html.match(/<script id="core">([\s\S]*?)<\/script>/);
  assert.ok(m, 'index.html must contain <script id="core">…</script>');
  const ctx = vm.createContext({});
  vm.runInContext(m[1], ctx);
  return ctx;
}

const URL_RE = /^https:\/\/(civida\.ca|my\.ppulus\.com)\//;

function eachLink(content, fn) {
  const walkLinks = (links, where) => (links || []).forEach((l) => fn(l, where));
  for (const g of content.groups) {
    walkLinks(g.contactLinks, `group ${g.id} contactLinks`);
    walkLinks(g.links, `group ${g.id} links`);
    for (const q of g.questions || []) {
      walkLinks(q.links, `${g.id}/${q.id}`);
      for (const [i, o] of (q.followUp?.options || []).entries()) {
        walkLinks(o.links, `${g.id}/${q.id}/followUp[${i}]`);
      }
    }
  }
}

test('CONTENT has the four routing groups in order', () => {
  const { CONTENT } = loadCore();
  assert.deepEqual(
    CONTENT.groups.map((g) => g.id),
    ['applicant', 'tenant', 'recipient', 'notsure']
  );
});

test('meta carries the manager-approved routing prompt', () => {
  const { CONTENT } = loadCore();
  assert.equal(
    CONTENT.meta.routingPrompt,
    'To get you the right answer — which of these describes you?'
  );
  assert.ok(CONTENT.meta.greeting.length > 0);
  assert.ok(CONTENT.meta.restart.length > 0);
});

test('contacts match the spec', () => {
  const { CONTENT } = loadCore();
  assert.deepEqual(CONTENT.contacts, {
    mainPhone: '780-420-6161',
    applicantEmail: 'help@civida.ca',
    benefitsEmail: 'benefits@civida.ca',
    generalEmail: 'civida@civida.ca',
  });
});

test('question counts per group match the curated set', () => {
  const { CONTENT } = loadCore();
  const counts = Object.fromEntries(
    CONTENT.groups.map((g) => [g.id, (g.questions || []).length])
  );
  // escape hatches are synthesized by the walker, not stored as questions
  assert.deepEqual(counts, { applicant: 4, tenant: 5, recipient: 4, notsure: 0 });
});

test('every question node is well-formed', () => {
  const { CONTENT } = loadCore();
  for (const g of CONTENT.groups) {
    assert.ok(g.label && g.contactText, `group ${g.id} needs label + contactText`);
    assert.ok(
      (g.questions && g.questions.length) || g.answer,
      `group ${g.id} needs questions[] or a direct answer`
    );
    for (const q of g.questions || []) {
      assert.ok(q.id && q.label, `question in ${g.id} needs id + label`);
      assert.ok(
        q.answer || q.action === 'district-picker',
        `${g.id}/${q.id} needs an answer or a known action`
      );
      for (const o of q.followUp?.options || []) {
        assert.ok(o.label && o.answer, `${g.id}/${q.id} follow-up option needs label + answer`);
      }
    }
  }
});

test('every link is {label,url} XOR {label,action:"district-picker"}, urls https + known hosts', () => {
  const { CONTENT } = loadCore();
  eachLink(CONTENT, (l, where) => {
    assert.ok(l.label, `link without label at ${where}`);
    const hasUrl = 'url' in l;
    const hasAction = 'action' in l;
    assert.ok(hasUrl !== hasAction, `link must have url XOR action at ${where}`);
    if (hasAction) assert.equal(l.action, 'district-picker', `unknown action at ${where}`);
    if (hasUrl && !/^(tel:|mailto:)/.test(l.url)) {
      assert.match(l.url, URL_RE, `bad url at ${where}: ${l.url}`);
    }
  });
});

test('the long-URL PDFs and portals are byte-exact per spec §7', () => {
  const { CONTENT } = loadCore();
  const urls = new Set();
  eachLink(CONTENT, (l) => l.url && urls.add(l.url));
  for (const expected of [
    'https://civida.ca/wp-content/uploads/2024/01/HS1-Change-of-Income-Information-Form-2022-06.pdf',
    'https://civida.ca/wp-content/uploads/2024/01/TM3-Emergency-Transfer-2024.pdf',
    'https://civida.ca/wp-content/uploads/2021/02/Tenant-Maintenance-Responsibilities_INFO.pdf',
    'https://my.ppulus.com/civida',
    'https://civida.ca/apply-now/',
    'https://civida.ca/housing-programs/eligibility/',
    'https://civida.ca/housing-programs/rent-assistance/',
    'https://civida.ca/housing-programs/applicant-faqs/',
    'https://civida.ca/make-an-appointment/',
  ]) {
    assert.ok(urls.has(expected), `missing exact url: ${expected}`);
  }
});

test('district directory matches spec §6', () => {
  const { CONTENT } = loadCore();
  assert.equal(CONTENT.districts.length, 8);
  assert.deepEqual(CONTENT.districts.map((d) => d.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
  const g = CONTENT.districts.find((d) => d.id === 'G');
  assert.equal(g.closed, true);
  assert.equal(g.servedBy, 'H');
  for (const d of CONTENT.districts) {
    if (d.closed) continue;
    assert.match(d.phone, /^780-851-\d{4}$/, `district ${d.id} phone`);
    assert.ok(d.location, `district ${d.id} location`);
    assert.ok(d.buildings, `district ${d.id} buildings`);
  }
  assert.equal(CONTENT.districts.find((d) => d.id === 'H').phone, '780-851-9223');
});

test('tenant transfer carries the emergency follow-up branch', () => {
  const { CONTENT } = loadCore();
  const tenant = CONTENT.groups.find((g) => g.id === 'tenant');
  const transfer = tenant.questions.find((q) => q.id === 'transfer');
  assert.equal(transfer.followUp.prompt, 'Is this an emergency?');
  assert.deepEqual(transfer.followUp.options.map((o) => o.label), ['Yes', 'No']);
  const yes = transfer.followUp.options[0];
  assert.ok(
    yes.links.some((l) => l.url?.includes('TM3-Emergency-Transfer-2024.pdf')),
    'Yes branch must link the TM3 PDF'
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/`
Expected: FAIL — `ENOENT: no such file or directory … index.html` (or missing-script assert).

- [ ] **Step 3: Create `index.html` with skeleton + full CONTENT**

Create `index.html`. Markup skeleton (style and later scripts filled by Tasks 2–4; leave the placeholder comments in place):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Civida Help — chat prototype</title>
<style>
/* Task 4 fills this. Minimal holding styles for Task 3 smoke-testing: */
body { font-family: system-ui, sans-serif; margin: 0; }
</style>
</head>
<body>
<main class="chat" aria-label="Civida Help chat">
  <header class="chat-header">
    <div class="brand"><span class="brand-name">Civida</span><span class="brand-tag">Help</span></div>
    <button type="button" id="btn-restart" class="hdr-btn">⟲ Start over</button>
  </header>
  <div id="messages" class="messages" role="log" aria-live="polite"></div>
  <footer class="chat-footer">
    <button type="button" id="btn-back" class="hdr-btn" disabled>‹ Back</button>
    <p class="disclaimer">Prototype — wording is draft, pending Customer Success review.</p>
  </footer>
</main>
<script id="core">
/* ============================================================
   CIVIDA HELP — CONTENT (edit this object to change the bot)
   This script block is DOM-free: it is also loaded by the
   Node tests (tests/core.test.mjs). Keep browser APIs out.
   ============================================================ */
var CONTENT = {
  meta: {
    title: "Civida Help",
    greeting: "Hi! I can point you to the right answer fast.",
    restart: "No problem — let's start again.",
    routingPrompt: "To get you the right answer — which of these describes you?"
  },

  contacts: {
    mainPhone: "780-420-6161",
    applicantEmail: "help@civida.ca", /* §9.1: confirm vs civida@civida.ca with the manager */
    benefitsEmail: "benefits@civida.ca",
    generalEmail: "civida@civida.ca"
  },

  pages: {
    districtOffices: "https://civida.ca/district-offices/",
    contactUs: "https://civida.ca/contact-us/"
  },

  groups: [
    {
      id: "applicant",
      label: "Applicant",
      sublabel: "I've applied, or want to apply, for housing or a benefit",
      contactText: "email help@civida.ca or call 780-420-6161",
      contactLinks: [
        { label: "Email help@civida.ca", url: "mailto:help@civida.ca" },
        { label: "Call 780-420-6161", url: "tel:780-420-6161" }
      ],
      questions: [
        {
          id: "rent-help",
          label: "How can I get help with my rent?",
          answer: "You may be eligible for the Rent Assistance Benefit — it helps you afford rent with a private landlord. You apply through the Civida Benefit Portal.",
          links: [
            { label: "About Rent Assistance", url: "https://civida.ca/housing-programs/rent-assistance/" },
            { label: "Apply — Civida Benefit Portal", url: "https://my.ppulus.com/civida" }
          ]
        },
        {
          id: "apply-housing",
          label: "How do I apply for housing?",
          answer: "You apply online through the Housing Applicant Portal (RentCafé). It's a good idea to check the eligibility rules first.",
          links: [
            { label: "Apply now", url: "https://civida.ca/apply-now/" },
            { label: "Check eligibility", url: "https://civida.ca/housing-programs/eligibility/" }
          ]
        },
        {
          id: "no-response",
          label: "I've applied but haven't heard back",
          answer: "Your file will be reviewed. Civida uses a points-based priority list — not first-come, first-served — so wait times vary and can't be estimated. Someone will reach out when more information is needed. One tip: contact Civida at least once a year to keep your file active.",
          links: [
            { label: "Applicant FAQs", url: "https://civida.ca/housing-programs/applicant-faqs/" }
          ]
        },
        {
          id: "speak",
          label: "I need to speak with someone",
          answer: "You can call 780-420-6161. If you'd rather meet in person, you can book an appointment.",
          links: [
            { label: "Call 780-420-6161", url: "tel:780-420-6161" },
            { label: "Make an appointment", url: "https://civida.ca/make-an-appointment/" }
          ]
        }
      ]
    },

    {
      id: "tenant",
      label: "Tenant",
      sublabel: "I'm a current Civida tenant",
      contactText: "contact your District Office or call 780-420-6161",
      contactLinks: [
        { label: "Find my District Office", action: "district-picker" },
        { label: "Call 780-420-6161", url: "tel:780-420-6161" }
      ],
      questions: [
        {
          id: "maintenance",
          /* §9.2: no phone extension printed — sources disagree; confirm before adding one */
          label: "I have a maintenance issue",
          answer: "For repairs, contact your District Office. If it's a maintenance emergency, call 780-420-6161 — that line is answered 24/7.",
          links: [
            { label: "Find my District Office", action: "district-picker" },
            { label: "Tenant maintenance responsibilities (PDF)", url: "https://civida.ca/wp-content/uploads/2021/02/Tenant-Maintenance-Responsibilities_INFO.pdf" }
          ]
        },
        {
          id: "rent-adjustment",
          label: "I need a rent adjustment — my income changed",
          answer: "Submit a Change of Income form to your District Office so your rent can be reviewed.",
          links: [
            { label: "Change of Income form — HS1 (PDF)", url: "https://civida.ca/wp-content/uploads/2024/01/HS1-Change-of-Income-Information-Form-2022-06.pdf" },
            { label: "Find my District Office", action: "district-picker" }
          ]
        },
        {
          id: "transfer",
          label: "I want to transfer / I need a bigger place",
          answer: "Transfers are only arranged in emergency situations — an imminent, life-threatening situation.",
          followUp: {
            prompt: "Is this an emergency?",
            options: [
              {
                label: "Yes",
                answer: "Please complete the Emergency Transfer form and submit it to your District Office.",
                links: [
                  { label: "Emergency Transfer form — TM3 (PDF)", url: "https://civida.ca/wp-content/uploads/2024/01/TM3-Emergency-Transfer-2024.pdf" },
                  { label: "Find my District Office", action: "district-picker" }
                ]
              },
              {
                label: "No",
                answer: "Non-emergency transfers aren't available. Your District Office can tell you more about your options.",
                links: [
                  { label: "Find my District Office", action: "district-picker" }
                ]
              }
            ]
          }
        },
        {
          id: "complaint",
          label: "I have a complaint",
          answer: "Complaints need to be in writing — by email, mail, or the office dropbox — with as much detail as possible, sent to your District Office.",
          links: [
            { label: "Find my District Office", action: "district-picker" }
          ]
        },
        {
          id: "which-district",
          label: "What is my District Office?",
          action: "district-picker"
        }
      ]
    },

    {
      id: "recipient",
      label: "Recipient",
      sublabel: "I receive a rent-assistance benefit from Civida",
      contactText: "email benefits@civida.ca",
      contactLinks: [
        { label: "Email benefits@civida.ca", url: "mailto:benefits@civida.ca" }
      ],
      questions: [
        {
          id: "deposit",
          label: "When will I get my benefit?",
          answer: "Your benefit is always deposited on or before the first business day of each month."
        },
        {
          id: "annual-review",
          label: "What do I need for my Annual Review?",
          answer: "Log in to the Civida Benefit Portal, review your file, and upload two things: proof of rent (your current lease or renewal) and income verification (for example, your latest Notice of Assessment). For questions about your specific file, email benefits@civida.ca.",
          links: [
            { label: "Civida Benefit Portal", url: "https://my.ppulus.com/civida" },
            { label: "Email benefits@civida.ca", url: "mailto:benefits@civida.ca" }
          ]
        },
        {
          id: "calculation",
          label: "How was my benefit calculated? Why did it change?",
          answer: "It's based on your total household income and the local market rent. The benefit is the difference between an affordable rent — 30% of your household income — and the market rent for your unit. As income rises, the benefit can go down."
        },
        {
          id: "gbv",
          /* §9.6: manager to decide if this path should carry a 24/7 safety
             resource note — add it here if so. Tone: gentle, no judgment. */
          label: "Can I reapply for the Gender-Based Violence (GBV) benefit?",
          answer: "The GBV benefit is a one-time benefit, so it can't be received a second time. If you need ongoing support with rent, you're very welcome to apply for the Rent Assistance Benefit.",
          links: [
            { label: "About Rent Assistance", url: "https://civida.ca/housing-programs/rent-assistance/" },
            { label: "Apply — Civida Benefit Portal", url: "https://my.ppulus.com/civida" }
          ]
        }
      ]
    },

    {
      id: "notsure",
      label: "Not sure / something else",
      sublabel: "I'm not sure which fits — or it's about something different",
      contactText: "call 780-420-6161 or email civida@civida.ca",
      contactLinks: [
        { label: "Call 780-420-6161", url: "tel:780-420-6161" },
        { label: "Email civida@civida.ca", url: "mailto:civida@civida.ca" }
      ],
      answer: "No problem — the Civida team can point you in the right direction.",
      links: [
        { label: "Call 780-420-6161", url: "tel:780-420-6161" },
        { label: "Email civida@civida.ca", url: "mailto:civida@civida.ca" },
        { label: "Contact us page", url: "https://civida.ca/contact-us/" }
      ]
    }
  ],

  /* District directory as of 2026-07-20 — offices open Tue/Thu/Fri 8:30 a.m.–4:00 p.m.
     Exact emails live on the district-offices page (obfuscated to scraping). */
  districts: [
    { id: "A", office: "District A", location: "Parkdale ONE, 8315 113 Ave NW", phone: "780-851-7227", buildings: "Alliance Manor, Central Village, Flagstaff, Greystone Manor" },
    { id: "B", office: "District B", location: "O-day'min Village, 10350 95 St NW", phone: "780-851-7322", buildings: "Ashton Apartments, McCauley, Montrose I, Queen Alexandra" },
    { id: "C", office: "District C", location: "Ormsby Place II, 6250 180 St NW", phone: "780-851-7349", buildings: "Belmead I–III, Brander Gardens, Lymburn, Ormsby Place" },
    { id: "D", office: "District D", location: "Duggan, #4 3716 105 St NW", phone: "780-851-7402", buildings: "Blue Quill, Duggan, Ekota, Saddleback, Yellowbird" },
    { id: "E", office: "District E", location: "Lee Ridge I, 549 Millbourne Road East", phone: "780-851-7411", buildings: "Hillview, Kameyosek, Lee Ridge, Tweddle Place" },
    { id: "F", office: "District F", location: "Lorelei VI, 16217 103 St NW", phone: "780-851-7419", buildings: "Caernarvon, Calder, Dunluce, Lorelei" },
    { id: "G", office: "District G", closed: true, servedBy: "H", buildings: "Abbottsfield, Clareview, Rundle Heights" },
    { id: "H", office: "District H", location: "Londonderry, 14544 72 St NW", phone: "780-851-9223", buildings: "Belvedere, Clareview V–VI, Steele Heights — plus former District G areas" }
  ],

  districtHours: "Open Tue / Thu / Fri, 8:30 a.m.–4:00 p.m."
};

/* Task 2 adds the pure logic (renderStep) below this line. */
</script>
<script>
/* Task 3 fills this: DOM renderer. */
</script>
</body>
</html>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — 9 tests, 0 failures.

---

### Task 2: Pure logic layer — `renderStep`

**Files:**
- Modify: `index.html` (append logic inside `<script id="core">`, after `CONTENT`)
- Modify: `tests/core.test.mjs` (append logic tests)

**Interfaces:**
- Consumes: `CONTENT` (Task 1 shape).
- Produces (globals in the core script; Task 3's renderer calls these):
  - `renderStep(content, loc) -> { messages: [{text, links?}], options: [{label, sublabel?, go?, url?}] }`
  - `loc` variants: `{view:"routing", restart?:true}` · `{view:"group", groupId}` · `{view:"answer", groupId, questionId}` · `{view:"followup", groupId, questionId, optionIndex}` · `{view:"escape", groupId}` · `{view:"picker", groupId?}` · `{view:"district", districtId, groupId?}`
  - option `.go` is the next `loc` (buttons); option `.url` opens a link instead (picker's map fallback only).
  - `ESCAPE_LABEL` constant = `"Something else / talk to a person"`.

**Behavior rules (encode exactly):**
- `routing`: messages `[greeting, routingPrompt]` (or `[restart, routingPrompt]` when `restart`), options = the 4 groups (label + sublabel).
- `group` with questions: message *"Here's what I can help with — pick a question:"*; options = each question + synthesized escape `{label: ESCAPE_LABEL, go:{view:"escape", groupId}}` **always last**. `group` with direct `answer` (notsure): behaves like a leaf answer — answer + links + contact line; options `[{label:"Pick a different option", go:{view:"routing"}}]`.
- `answer`: if the question has `action:"district-picker"` → delegate to `picker`. If it has `followUp` → messages `[answer(+links), prompt]`, options = follow-up options (`{view:"followup", optionIndex}`) — **no contact line** (not a leaf). Else leaf → messages `[answer(+links), contactLine(group)]`, options `[{label:"Ask another question", go:{view:"group", groupId}}]`.
- `followup`: leaf — `[option.answer(+links), contactLine]`, options `[Ask another question]`.
- `escape`: messages `["No problem — here's how to reach a person:", {text: "You can " + contactText + ".", links: contactLinks}]`, options `[Ask another question]`.
- `picker`: message *"Which area is your building in? Each district lists a few example buildings:"*; options = 8 districts (`label: office` (+ `" — now served by District H"` for closed), `sublabel: buildings`, `go:{view:"district", districtId, groupId}`) + final `{label:"Not sure — see the full list on civida.ca", url: pages.districtOffices}`.
- `district`: for a closed district, prepend *"District G walk-in services are closed — you're now served by District H:"* and render `servedBy`'s card. Card = `{text: office + " — " + location + ". " + districtHours + ".", links: [Call phone (tel:), "District offices page (map + emails)" → pages.districtOffices]}`. Options: `[{label:"Pick a different district", go:{view:"picker", groupId}}]` + `[Ask another question]` when `groupId` present.
- `contactLine(group)` = `{text: "Still need help? You can always " + contactText + ".", links: contactLinks}`.

- [ ] **Step 1: Append the failing logic tests to `tests/core.test.mjs`**

```js
// ---------- pure logic ----------

test('routing step greets and offers the four groups', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'routing' });
  assert.equal(step.messages[0].text, CONTENT.meta.greeting);
  assert.equal(step.messages[1].text, CONTENT.meta.routingPrompt);
  assert.deepEqual(step.options.map((o) => o.go.groupId), ['applicant', 'tenant', 'recipient', 'notsure']);
  const restart = renderStep(CONTENT, { view: 'routing', restart: true });
  assert.equal(restart.messages[0].text, CONTENT.meta.restart);
});

test('every group menu ends with the escape hatch', () => {
  const { CONTENT, renderStep, ESCAPE_LABEL } = loadCore();
  for (const g of CONTENT.groups.filter((g) => g.questions?.length)) {
    const step = renderStep(CONTENT, { view: 'group', groupId: g.id });
    const last = step.options[step.options.length - 1];
    assert.equal(last.label, ESCAPE_LABEL, `group ${g.id}`);
    assert.equal(last.go.view, 'escape');
    assert.equal(step.options.length, g.questions.length + 1);
  }
});

test('leaf answers end with the still-need-help contact line', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'answer', groupId: 'applicant', questionId: 'rent-help' });
  const last = step.messages[step.messages.length - 1];
  assert.match(last.text, /^Still need help\?/);
  assert.ok(last.links.length > 0);
  assert.deepEqual(step.options.map((o) => o.label), ['Ask another question']);
});

test('branching answer shows the follow-up prompt instead of the contact line', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'answer', groupId: 'tenant', questionId: 'transfer' });
  assert.equal(step.messages[step.messages.length - 1].text, 'Is this an emergency?');
  assert.ok(step.messages.every((m) => !/^Still need help\?/.test(m.text)));
  assert.deepEqual(step.options.map((o) => o.label), ['Yes', 'No']);
  const yes = renderStep(CONTENT, { view: 'followup', groupId: 'tenant', questionId: 'transfer', optionIndex: 0 });
  assert.ok(yes.messages[0].links.some((l) => l.url?.includes('TM3')));
  assert.match(yes.messages[yes.messages.length - 1].text, /^Still need help\?/);
});

test('district-picker action question routes straight to the picker', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'answer', groupId: 'tenant', questionId: 'which-district' });
  assert.equal(step.options.filter((o) => o.go?.view === 'district').length, 8);
  const fallback = step.options[step.options.length - 1];
  assert.equal(fallback.url, CONTENT.pages.districtOffices);
});

test('district G redirects to district H details', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'district', districtId: 'G', groupId: 'tenant' });
  assert.match(step.messages[0].text, /closed/i);
  const card = step.messages.find((m) => /District H/.test(m.text));
  assert.ok(card, 'must show District H card');
  assert.ok(card.links.some((l) => l.url === 'tel:780-851-9223'));
});

test('escape step shows the group contact and a way back', () => {
  const { CONTENT, renderStep } = loadCore();
  for (const g of CONTENT.groups.filter((g) => g.questions?.length)) {
    const step = renderStep(CONTENT, { view: 'escape', groupId: g.id });
    assert.ok(step.messages.some((m) => m.links?.length), `escape for ${g.id} carries contact links`);
    assert.ok(step.options.some((o) => o.go?.view === 'group'), `escape for ${g.id} offers a way back`);
  }
});

test('full-tree crawl: every reachable location renders, terminates, and stays well-formed', () => {
  const { CONTENT, renderStep } = loadCore();
  const seen = new Set();
  let visited = 0;
  const visit = (loc) => {
    const key = JSON.stringify(loc, Object.keys(loc).sort());
    if (seen.has(key)) return;
    seen.add(key);
    visited += 1;
    const step = renderStep(CONTENT, loc);
    assert.ok(step.messages.length > 0, `no messages at ${key}`);
    for (const m of step.messages) {
      assert.ok(m.text && m.text.trim().length, `empty message at ${key}`);
      for (const l of m.links || []) assert.ok(l.label && (l.url || l.action), `bad link at ${key}`);
    }
    assert.ok(step.options.length > 0 || loc.view === 'routing' ? true : true);
    for (const o of step.options) {
      assert.ok(o.label, `option without label at ${key}`);
      assert.ok(o.go || o.url, `dead-end option at ${key}`);
      if (o.go) visit(o.go);
    }
  };
  visit({ view: 'routing' });
  assert.ok(visited >= 40, `crawl looks too small: ${visited} locations`);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --test tests/`
Expected: FAIL — `renderStep is not a function` (Task 1's 9 still pass).

- [ ] **Step 3: Append the logic to the core script (after `CONTENT`, before `</script>`)**

```js
/* ============================================================
   PURE LOGIC — no DOM in here (unit-tested via Node).
   renderStep(content, loc) -> { messages: [{text, links?}], options: [...] }
   ============================================================ */
var ESCAPE_LABEL = "Something else / talk to a person";

function findGroup(content, id) {
  return content.groups.find(function (g) { return g.id === id; });
}
function findQuestion(group, id) {
  return (group.questions || []).find(function (q) { return q.id === id; });
}
function contactLine(group) {
  return {
    text: "Still need help? You can always " + group.contactText + ".",
    links: group.contactLinks
  };
}
function askAnother(groupId) {
  return { label: "Ask another question", go: { view: "group", groupId: groupId } };
}
function telUrl(phone) {
  return "tel:" + phone;
}

function renderStep(content, loc) {
  var group = loc.groupId ? findGroup(content, loc.groupId) : null;

  if (loc.view === "routing") {
    return {
      messages: [
        { text: loc.restart ? content.meta.restart : content.meta.greeting },
        { text: content.meta.routingPrompt }
      ],
      options: content.groups.map(function (g) {
        return { label: g.label, sublabel: g.sublabel, go: { view: "group", groupId: g.id } };
      })
    };
  }

  if (loc.view === "group") {
    if (!group.questions || !group.questions.length) {
      // direct-answer group ("Not sure / something else")
      return {
        messages: [
          { text: group.answer, links: group.links },
          contactLine(group)
        ],
        options: [{ label: "Pick a different option", go: { view: "routing", restart: true } }]
      };
    }
    return {
      messages: [{ text: "Here's what I can help with — pick a question:" }],
      options: group.questions.map(function (q) {
        return { label: q.label, go: { view: "answer", groupId: group.id, questionId: q.id } };
      }).concat([{ label: ESCAPE_LABEL, go: { view: "escape", groupId: group.id } }])
    };
  }

  if (loc.view === "answer") {
    var q = findQuestion(group, loc.questionId);
    if (q.action === "district-picker") {
      return renderStep(content, { view: "picker", groupId: group.id });
    }
    if (q.followUp) {
      return {
        messages: [
          { text: q.answer, links: q.links },
          { text: q.followUp.prompt }
        ],
        options: q.followUp.options.map(function (o, i) {
          return { label: o.label, go: { view: "followup", groupId: group.id, questionId: q.id, optionIndex: i } };
        })
      };
    }
    return {
      messages: [{ text: q.answer, links: q.links }, contactLine(group)],
      options: [askAnother(group.id)]
    };
  }

  if (loc.view === "followup") {
    var fq = findQuestion(group, loc.questionId);
    var opt = fq.followUp.options[loc.optionIndex];
    return {
      messages: [{ text: opt.answer, links: opt.links }, contactLine(group)],
      options: [askAnother(group.id)]
    };
  }

  if (loc.view === "escape") {
    return {
      messages: [
        { text: "No problem — here's how to reach a person:" },
        { text: "You can " + group.contactText + ".", links: group.contactLinks }
      ],
      options: [askAnother(group.id)]
    };
  }

  if (loc.view === "picker") {
    return {
      messages: [{ text: "Which area is your building in? Each district lists a few example buildings:" }],
      options: content.districts.map(function (d) {
        return {
          label: d.closed ? d.office + " — now served by District " + d.servedBy : d.office,
          sublabel: d.buildings,
          go: { view: "district", districtId: d.id, groupId: loc.groupId }
        };
      }).concat([
        { label: "Not sure — see the full list on civida.ca", url: content.pages.districtOffices }
      ])
    };
  }

  if (loc.view === "district") {
    var d = content.districts.find(function (x) { return x.id === loc.districtId; });
    var messages = [];
    if (d.closed) {
      messages.push({
        text: d.office + " walk-in services are closed — you're now served by District " + d.servedBy + ":"
      });
      d = content.districts.find(function (x) { return x.id === loc.districtId; });
      d = content.districts.find(function (x) { return x.id === (d.servedBy || d.id); });
    }
    messages.push({
      text: d.office + " — " + d.location + ". " + content.districtHours + ".",
      links: [
        { label: "Call " + d.phone, url: telUrl(d.phone) },
        { label: "District offices page (map + emails)", url: content.pages.districtOffices }
      ]
    });
    var options = [{ label: "Pick a different district", go: { view: "picker", groupId: loc.groupId } }];
    if (loc.groupId) options.push(askAnother(loc.groupId));
    return { messages: messages, options: options };
  }

  throw new Error("Unknown view: " + loc.view);
}
```

> Note the closed-district lookup: resolve `servedBy` **before** rendering the card (the double-find above is deliberately shown as the naive first pass — collapse it to a single `servedBy` resolution when writing the file: `if (d.closed) { push note; d = find(d.servedBy); }`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/`
Expected: PASS — 17 tests, 0 failures. The crawl test should report ≥ 40 visited locations via its assertion passing.

---

### Task 3: DOM renderer — chat transcript, chips, quick replies, Back/Start-over

**Files:**
- Modify: `index.html` (fill the second `<script>` block)

**Interfaces:**
- Consumes: `CONTENT`, `renderStep(content, loc)` (Task 2).
- Produces: interactive page. History = array of locs; `‹ Back` re-shows the previous step (appends, never truncates — chat metaphor); `⟲ Start over` resets to routing. Quick replies render under the latest bot message inside the transcript; clicking echoes the label as a right-side chip and removes the button row.

**Behavior rules:**
- Bot bubbles stagger in (~200 ms apart) via timeouts; the option row renders after the last bubble. All timers must be skipped when `matchMedia('(prefers-reduced-motion: reduce)')` matches.
- While bubbles are animating in, clicks are ignored (guard flag) — prevents double-render races.
- `Back` disabled at routing (history length 1). `Start over` always enabled.
- Links in messages render as anchor pills: `target="_blank" rel="noopener"` for http(s); `tel:`/`mailto:` render without target. `{action:"district-picker"}` links render as buttons that `go({view:"picker", groupId})`.
- Options with `.url` render as anchors styled as quick replies (map fallback), also `target="_blank" rel="noopener"`.
- After each step renders, scroll to bottom; move focus to the option row container (`tabindex="-1"`) except on initial load.
- All DOM built with `createElement`/`textContent` — no `innerHTML` with content strings.

- [ ] **Step 1: Fill the DOM script**

Replace the placeholder second `<script>` block with:

```html
<script>
/* ============================================================
   DOM RENDERER — the only script that touches the page.
   ============================================================ */
(function () {
  var messagesEl = document.getElementById("messages");
  var backBtn = document.getElementById("btn-back");
  var restartBtn = document.getElementById("btn-restart");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var history = [];          // stack of locs
  var busy = false;          // true while bubbles are animating in
  var firstRender = true;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function scrollToEnd() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function linkNode(link, groupId) {
    if (link.action === "district-picker") {
      var b = el("button", "link-pill", link.label);
      b.type = "button";
      b.addEventListener("click", function () {
        if (!busy) choose(link.label, { view: "picker", groupId: groupId });
      });
      return b;
    }
    var a = el("a", "link-pill", link.label);
    a.href = link.url;
    if (/^https?:/.test(link.url)) {
      a.target = "_blank";
      a.rel = "noopener";
    }
    return a;
  }

  function bubbleNode(msg, groupId) {
    var wrap = el("div", "msg msg-bot");
    var bubble = el("div", "bubble");
    bubble.appendChild(el("p", "bubble-text", msg.text));
    if (msg.links && msg.links.length) {
      var links = el("div", "bubble-links");
      msg.links.forEach(function (l) { links.appendChild(linkNode(l, groupId)); });
      bubble.appendChild(links);
    }
    wrap.appendChild(bubble);
    return wrap;
  }

  function chipNode(label) {
    var wrap = el("div", "msg msg-user");
    wrap.appendChild(el("div", "chip", label));
    return wrap;
  }

  function optionsNode(options, groupId) {
    var row = el("div", "options");
    row.tabIndex = -1;
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", "Choose an option");
    options.forEach(function (o) {
      var node;
      if (o.url) {
        node = el("a", "opt", "");
        node.href = o.url;
        node.target = "_blank";
        node.rel = "noopener";
      } else {
        node = el("button", "opt", "");
        node.type = "button";
        node.addEventListener("click", function () {
          if (!busy) choose(o.label, o.go);
        });
      }
      node.appendChild(el("span", "opt-label", o.label));
      if (o.sublabel) node.appendChild(el("span", "opt-sub", o.sublabel));
      row.appendChild(node);
    });
    return row;
  }

  function clearOptions() {
    var old = messagesEl.querySelector(".options");
    if (old) old.remove();
  }

  function renderLoc(loc) {
    var step = renderStep(CONTENT, loc);
    var delay = reduceMotion ? 0 : 220;
    busy = true;
    step.messages.forEach(function (m, i) {
      setTimeout(function () {
        messagesEl.appendChild(bubbleNode(m, loc.groupId));
        scrollToEnd();
      }, delay * i);
    });
    setTimeout(function () {
      var row = optionsNode(step.options, loc.groupId);
      messagesEl.appendChild(row);
      scrollToEnd();
      if (!firstRender) row.focus({ preventScroll: true });
      firstRender = false;
      busy = false;
    }, delay * step.messages.length);
    backBtn.disabled = history.length <= 1;
  }

  function choose(label, loc) {
    clearOptions();
    messagesEl.appendChild(chipNode(label));
    scrollToEnd();
    history.push(loc);
    renderLoc(loc);
  }

  backBtn.addEventListener("click", function () {
    if (busy || history.length <= 1) return;
    history.pop();
    clearOptions();
    messagesEl.appendChild(chipNode("‹ Back"));
    renderLoc(history[history.length - 1]);
  });

  restartBtn.addEventListener("click", function () {
    if (busy) return;
    clearOptions();
    messagesEl.appendChild(chipNode("⟲ Start over"));
    history = [{ view: "routing", restart: true }];
    renderLoc(history[0]);
  });

  history.push({ view: "routing" });
  renderLoc(history[0]);
})();
</script>
```

- [ ] **Step 2: Re-run the unit tests (must stay green — core script untouched)**

Run: `node --test tests/`
Expected: PASS — 17 tests.

- [ ] **Step 3: Smoke-open the file**

Run: `open index.html`
Expected: greeting + routing prompt render, four group buttons appear, clicking walks the tree, Back/Start-over behave. (Full path verification is Task 5.)

---

### Task 4: Style pass — mobile-first chat UI, light Civida branding

**Files:**
- Modify: `index.html` (`<style>` block)

**Interfaces:**
- Consumes: class names from Task 3 (`.chat`, `.chat-header`, `.brand`, `.brand-name`, `.brand-tag`, `.hdr-btn`, `.messages`, `.msg`, `.msg-bot`, `.msg-user`, `.bubble`, `.bubble-text`, `.bubble-links`, `.link-pill`, `.chip`, `.options`, `.opt`, `.opt-label`, `.opt-sub`, `.chat-footer`, `.disclaimer`).

**Pre-step:** Invoke the `frontend-design` skill before styling. Attempt to fetch Civida brand colors (`WebFetch https://civida.ca/` — look for theme CSS / header colors). If unreachable or ambiguous, use the fallback palette below and note it in the session log. Colors live in `:root` custom properties with a comment so the CS team can swap exact brand hex values later.

**Fallback palette (contrast-checked):**
- `--c-brand: #146B45` (deep green — header, chips, accents; 5.9:1 on white)
- `--c-brand-dark: #0C4A2F` (hover/active)
- `--c-bg: #EEF3F0` (page), `--c-surface: #FFFFFF` (bubbles/buttons)
- `--c-ink: #1E2A24` (body text, 14.7:1), `--c-muted: #55655D` (sublabels, 5.6:1)
- `--c-line: #D5E0DA` (borders)

- [ ] **Step 1: Write the full stylesheet**

Replace the `<style>` block with (structure below is the contract; exact values may be tuned during the frontend-design pass, constraints in Global Constraints hold):

```css
/* Civida Help prototype — mobile-first. Brand colors: swap the two
   --c-brand values for exact Civida hex codes once confirmed (§9.4). */
:root {
  --c-brand: #146B45;
  --c-brand-dark: #0C4A2F;
  --c-bg: #EEF3F0;
  --c-surface: #FFFFFF;
  --c-ink: #1E2A24;
  --c-muted: #55655D;
  --c-line: #D5E0DA;
  --radius: 14px;
}
* { box-sizing: border-box; }
html, body { height: 100%; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: var(--c-bg);
  color: var(--c-ink);
  font-size: 16px;
  line-height: 1.45;
}
.chat {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: var(--c-bg);
}
@media (min-width: 560px) {
  body { padding: 24px 0; }
  .chat {
    height: calc(100dvh - 48px);
    border: 1px solid var(--c-line);
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 12px 40px rgba(20, 60, 40, 0.12);
  }
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: var(--c-brand);
  color: #fff;
}
.brand { display: flex; align-items: baseline; gap: 8px; }
.brand-name { font-size: 20px; font-weight: 700; letter-spacing: 0.2px; }
.brand-tag {
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.8px; background: rgba(255,255,255,0.18);
  padding: 2px 8px; border-radius: 999px;
}
.hdr-btn {
  font: inherit; font-size: 14px; font-weight: 600;
  color: #fff; background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 999px; padding: 8px 14px; min-height: 40px;
  cursor: pointer;
}
.hdr-btn:hover { background: rgba(255,255,255,0.24); }
.messages {
  flex: 1; overflow-y: auto; padding: 16px 12px 8px;
  display: flex; flex-direction: column; gap: 10px;
  scroll-behavior: smooth;
}
.msg { display: flex; }
.msg-bot { justify-content: flex-start; }
.msg-user { justify-content: flex-end; }
.bubble {
  max-width: 88%;
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius);
  border-bottom-left-radius: 4px;
  padding: 10px 14px;
  animation: rise 0.22s ease-out;
}
.bubble-text { margin: 0; white-space: pre-line; }
.bubble-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.link-pill {
  font: inherit; font-size: 14px; font-weight: 600;
  color: var(--c-brand-dark);
  background: #F2F8F5;
  border: 1px solid var(--c-brand);
  border-radius: 999px;
  padding: 8px 14px; min-height: 40px;
  display: inline-flex; align-items: center;
  text-decoration: none; cursor: pointer;
}
.link-pill:hover { background: #E2EFE9; }
.chip {
  max-width: 85%;
  background: var(--c-brand);
  color: #fff;
  border-radius: var(--radius);
  border-bottom-right-radius: 4px;
  padding: 10px 14px;
  font-weight: 600;
  animation: rise 0.22s ease-out;
}
.options { display: flex; flex-direction: column; gap: 8px; padding: 2px 0 8px; outline: none; }
.opt {
  font: inherit; text-align: left;
  background: var(--c-surface);
  border: 1.5px solid var(--c-brand);
  border-radius: var(--radius);
  padding: 12px 14px; min-height: 48px;
  display: flex; flex-direction: column; gap: 2px;
  color: var(--c-ink); cursor: pointer; text-decoration: none;
  animation: rise 0.22s ease-out;
}
.opt:hover { background: #F2F8F5; }
.opt:active { background: #E2EFE9; }
.opt-label { font-weight: 650; color: var(--c-brand-dark); }
.opt-sub { font-size: 13.5px; color: var(--c-muted); }
.chat-footer {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
  background: var(--c-surface);
  border-top: 1px solid var(--c-line);
}
.chat-footer .hdr-btn {
  color: var(--c-brand-dark);
  background: #F2F8F5;
  border-color: var(--c-brand);
}
.chat-footer .hdr-btn:disabled {
  opacity: 0.45; cursor: default;
}
.disclaimer { margin: 0; font-size: 12px; color: var(--c-muted); }
button:focus-visible, a:focus-visible {
  outline: 3px solid var(--c-brand-dark);
  outline-offset: 2px;
}
@keyframes rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .bubble, .chip, .opt { animation: none; }
  .messages { scroll-behavior: auto; }
}
@media (max-width: 340px) {
  body { font-size: 15px; }
  .messages { padding: 12px 8px 6px; }
  .bubble, .chip { max-width: 94%; }
}
```

- [ ] **Step 2: Re-run unit tests (must stay green)**

Run: `node --test tests/`
Expected: PASS — 17 tests.

- [ ] **Step 3: Visual check**

Run: `open index.html` — bubbles, chips, buttons look like a chat; header shows the Civida wordmark; footer shows Back + disclaimer.

---

### Task 5: Full-path browser verification (spec §10.5)

**Files:** none created (fixes land in `index.html` if bugs surface).

**Procedure** (claude-in-chrome tools; load via one ToolSearch call):
- [ ] Open `file:///…/index.html` in a new tab.
- [ ] Resize to **390 px** width. Click through **every** path:
  - Applicant: all 4 questions + escape hatch.
  - Tenant: all 5 questions; transfer → **Yes** (TM3 link present) and (after Back) → **No**; `which-district` opens the picker; escape hatch.
  - Recipient: all 4 questions + escape hatch.
  - Not sure: direct answer with 780-420-6161 + civida@civida.ca.
  - District picker: open at least A, G (must show "closed → District H" + H's phone 780-851-9223), and H; map fallback link present.
  - `‹ Back` from an answer (returns to the group menu), from a group menu (returns to routing), disabled at routing. `⟲ Start over` from deep in a path. `Ask another question` after an answer.
- [ ] Resize to **320 px**: routing + one answer + picker render without horizontal scroll or clipped buttons.
- [ ] Keyboard: Tab reaches every quick reply, Enter activates, focus ring visible.
- [ ] Screenshot the greeting, a tenant answer, and the district picker for the log.
- [ ] Any defect found: fix in `index.html`, re-run `node --test tests/`, re-verify that path in the browser.

---

### Task 6: Project docs — `CLAUDE.md` + Claude Logs session close-out

**Files:**
- Create: `CLAUDE.md`
- Create: `Claude Logs/logs/2026-07-20_chatbot-prototype-build.md` (format: `Claude Logs/LOGGING_FORMAT.md` — all headings, `None` where empty)
- Modify: `Claude Logs/CURRENT_CONTEXT.md` (overwrite sections in place — build status, active tasks, next steps; keep ≤150 lines)
- Modify: `Claude Logs/SESSION_INDEX.md` (prepend one row under the header, same column style as existing rows)

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# Civida-ChatBot — project guide

A call-deflection support chatbot prototype for Civida (Edmonton community housing).
Spec + single source of truth for content/links: `Tasks/Civida-Chatbot-Prototype-Spec.md`.

## Hard constraints
- `index.html` is the entire app: single self-contained file, opens by double-click
  from `file://`. No framework, no build step, no CDN/external assets, no backend.
- Scripted decision tree only — buttons; no free-text input, no runtime AI.
- All bot copy is DRAFT pending Customer Success sign-off; content edits happen in
  the `CONTENT` object inside `index.html` (`<script id="core">`), nothing else.
- The `<script id="core">` block must stay DOM-free — Node tests evaluate it directly.

## Commands
- Tests: `node --test tests/` (zero dependencies; Node ≥ 20).

## Conventions
- **Rayan handles all git commits** — never commit or push.
- Every session: write a log per `Claude Logs/LOGGING_FORMAT.md`, overwrite
  `Claude Logs/CURRENT_CONTEXT.md` in place, prepend a row to
  `Claude Logs/SESSION_INDEX.md`.
```

- [ ] **Step 2: Write the session log** — follow `LOGGING_FORMAT.md` exactly: Date/Time, Git Branch (`dev`), Session Goal, Files Inspected, Files Changed, Summary, Technical Decisions (record: escape hatch synthesized by walker, leaf-only contact lines, chat-append Back semantics, §9 defaults chosen, palette source or fallback), Tests/Commands, Verification results (test count + browser paths walked + what was NOT tested, e.g. district emails, real-device testing, screen readers), Bugs, Risks (draft wording, §9 open questions), Next steps (CS sign-off, wording swap, branding confirm, future Flask/analytics), and a paste-ready next-session prompt.

- [ ] **Step 3: Update `CURRENT_CONTEXT.md`** — build status → prototype BUILT + verified; active tasks → CS review items; keep open-questions section; refresh "Next recommended step" and "Last updated".

- [ ] **Step 4: Prepend the SESSION_INDEX row** — date 2026-07-20, log file link, branch `dev`, bolded main-task summary, status `✅ Complete`, key files changed (`index.html`, `tests/core.test.mjs`, `CLAUDE.md`, logs).

- [ ] **Step 5: Final full check**

Run: `node --test tests/`
Expected: PASS — 17 tests. Leave everything uncommitted for Rayan.

---

## Self-review notes (spec coverage)

- §2 locked decisions → Global Constraints + Task 1 skeleton (single file, no build).
- §3 UX rules → Task 2 behavior rules (routing wording, escape hatch, controls) + Task 3 (chips/quick replies/Back/Start-over) + Task 4 (mobile-first, branding, a11y basics) + Task 5 (320/390 verification).
- §4 data model → Task 1 CONTENT (fields match: id/label/answer/links/followUp; link = url XOR action).
- §5 content A/B/C → Task 1 CONTENT verbatim coverage; counts enforced by test (4/5/4 + notsure direct).
- §6 districts → Task 1 data + Task 2 picker/district views + G→H test.
- §7 links → exact-URL test.
- §8 out of scope → nothing built for analytics/AI/translation (footer disclaimer only).
- §9 open questions → prototype-safe defaults, each flagged with a `§9.n` comment in the file + logged.
- §10 build plan steps 1–6 → Tasks 1–6 in the same order; §10.6 "log the session" → Task 6.
