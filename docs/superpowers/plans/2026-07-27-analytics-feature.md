# Civida Chatbot — Analytics Feature Plan

**Status:** Draft for Ray's review · **Date:** 2026-07-27 · **Owner:** Ray
**Phase:** Design. No code written yet.
**Supersedes:** spec §8 line 1 ("Analytics / logging — deferred") and CURRENT_CONTEXT
"No analytics (no backend)".

---

## 0. TL;DR — the recommendation

Build **one WordPress plugin** (`civida-chatbot`) that does two jobs: it embeds the bot
*and* it collects the analytics. One artifact to install, no CORS, no third party, data
never leaves Civida's own server.

The chatbot source gets split into modules with a ~40-line build script that emits
**both** the double-clickable `index.html` prototype (analytics no-op) and the plugin's
assets (analytics live). Same source, two targets, no copy-paste drift.

Ship it in five phases; **Phase 1 adds the full event schema + thumbs to `index.html`
alone**, so the whole measurement design gets validated by clicking through a local file
before a single line of PHP exists.

Two things are decided outside this doc and block everything: **who can install a plugin
on civida.ca**, and **is Civida a public body under POPA**. Details in §9.

---

## 1. What we're actually measuring

Ray picked two priorities: **deflection rate / dead-ends** and **link clicks + district
demand**. Plus **👍/👎 on every answer**. Everything below serves those.

The honest framing, and this matters when the number is presented to the CS manager:
**a chatbot cannot measure calls deflected.** It can only measure sessions that ended
looking like they didn't need a phone call. So define the metrics in tiers and label
them accurately:

| Metric | Definition | Confidence |
|---|---|---|
| **Engaged sessions** | sessions where a group was selected | Measured |
| **Resolution rate** | `outcome = answered` ÷ engaged sessions | Measured |
| **Leakage rate** | sessions with an `escape_click` or a `tel:`/`mailto:` click ÷ engaged | Measured |
| **Answer helpfulness** | 👍 ÷ (👍 + 👎), per `question_id` | Measured (opt-in sample) |
| **Dead-end score** | per question: (👎 rate + escape-after-view rate + back-after-view rate) | Measured |
| **Estimated calls deflected** | engaged × resolution rate × **k** | **Estimated — k is not knowable from the bot** |

`k` = the share of bot users who would otherwise have phoned. Get it one of two ways:

1. **Call-volume baseline.** Ask the CS team to log call counts by category for 2–4
   weeks *before* launch. Compare after. This is the only credible version.
2. **Exit question.** A single "Would you have called us instead?" on session end.
   Cheap, self-reported, better than nothing.

**Do this before Phase 5 launches, not after.** If the baseline isn't captured first,
the deflection claim is unprovable forever and the whole payoff metric is soft. This is
the single highest-value, lowest-effort item in the plan and it needs the CS manager's
cooperation, not ours.

**Sample-size honesty.** A municipal-scale site may only produce a few hundred bot
sessions a month at first. Per-question feedback will take *months* to reach
significance. The dashboard must therefore show **counts alongside every rate** and
**suppress percentages where n < 20** — otherwise someone will rewrite an answer
because 1 of 2 people gave it a thumbs-down.

---

## 2. Architecture decision — where the data lands

civida.ca is WordPress (custom `civida` theme, AIOSEO). No Google Analytics, GTM,
Matomo, or Hotjar was visible in the homepage markup, and no cookie-consent banner.
Read that as: **there is no existing analytics pipeline to piggyback on, and no consent
mechanism to inherit.** That pushes hard toward self-hosted and non-identifying.

| Option | Verdict |
|---|---|
| **Custom WP plugin + custom table** | ✅ **Recommended.** First-party, no third party, no consent banner needed, arbitrary funnel queries, dashboard lives where the CS manager already logs in. Cost: it's real PHP work (~1 week). |
| GA4 / GTM | ❌ Data leaves Canada; a public body sending client behaviour to Google needs a conversation we'd rather not need. Also: ~15–30% ad-blocker loss, 500-distinct-event and parameter-cardinality limits fight a decision tree, and funnel exploration for an 8-node tree is painful. Nothing to piggyback on anyway. |
| Matomo / Plausible (self-host) | ⚠️ Fine privacy-wise, but they're page-view engines. You'd still write custom event plumbing *and* a custom report to answer "which answer dead-ends." Extra infra for no gain. |
| Burst Statistics / Koko Analytics | ⚠️ Same shape as above — good cookieless WP analytics plugins, wrong data model for a decision tree. Reasonable **fallback** if plugin-development time gets cut. |
| Flask backend (spec §8's plan) | ⚠️ Right call *later*, when the AI free-text layer lands and there's a real service to host. Today it means new infra, new hosting, CORS, and a second deployment target for zero extra capability. |

**Decision: WP plugin now, with a transport-agnostic event contract** so the day Flask
arrives, the client changes one config value (`endpoint`) and the schema still fits.
That was the fourth option offered and it's the one that costs nothing to preserve.

### Ad-blocker naming note (real, not paranoia)

EasyList and friends block on **path and filename patterns**, not just domains. A
first-party endpoint at `/wp-json/civida-bot/v1/events` served by `bot-ui.js` sails
through. The same code at `/analytics/track` in `tracking.js` gets eaten for a chunk of
users. **Do not use the words `analytics`, `track`, `telemetry`, `collect`, or `pixel`
in any public URL path or asset filename.** Internal PHP class names are free to be
honest.

---

## 3. Architecture decision — how the bot gets onto WordPress

Ray asked for advice here. Three options, ranked:

### A. Ship the bot inside the plugin (recommended)

`[civida_chatbot]` shortcode + a matching block. The plugin enqueues `bot.css` /
`bot-ui.js` and loads content from `content/content.json`.

- ✅ One install. Same-origin POST — no CORS, no `postMessage` bridge.
- ✅ Bot inherits page width and responds properly on mobile; no iframe height hacks.
- ✅ CS team edits `content.json` (or, later, a small admin editor) instead of HTML.
- ✅ Analytics and bot version-locked together — no schema drift between them.
- ⚠️ Requires the refactor in §4 and plugin-install access on civida.ca.

### B. iframe a static file

- ✅ Zero refactor. `index.html` ships as-is.
- ❌ Cross-origin events need `postMessage` to a parent script, or a CORS'd endpoint —
  either way, more moving parts than option A, not fewer.
- ❌ iframe auto-height on mobile is a perennial nuisance; the bot won't feel native.
- ❌ Links opening from inside an iframe hit `X-Frame-Options` / target quirks.

### C. Paste into a Custom HTML block

- ✅ Nothing to install.
- ❌ Every content edit is a re-paste by whoever has page access. CS can't own it.
- ❌ No version control on what's actually live. Rules itself out for anything but a demo.

**Also worth doing under A:** a **floating launcher bubble** (bottom-right, site-wide,
via a setting) rather than only inline embeds. That's how people expect to find a
support bot, and it multiplies sample size — which §1 says we badly need. Suggest
launching inline-only on 2–3 pages first (Contact Us, Tenant Resources, Apply Now),
then going site-wide once the answers have the CS manager's sign-off.

---

## 4. Source refactor — and the constraint it breaks

`CLAUDE.md` currently says: *single self-contained file, no build step.* Option A needs
the same JS in two places (the `file://` prototype and the plugin), and hand-maintaining
both guarantees drift.

**Proposal:** split the source, add a ~40-line zero-dependency build script.

```
src/
  content.js      the CONTENT object — the only file CS content edits touch
  core.js         renderStep + helpers. DOM-FREE (unchanged rule, still vm-tested)
  events.js       event queue + track(). DOM-FREE. No-ops when endpoint unset
  ui.js           DOM renderer + analytics call sites + thumbs widget
  styles.css
build.mjs         node build.mjs  →  emits both targets
  → index.html                    everything inlined, endpoint = null, still double-clicks
  → wp-plugin/civida-chatbot/assets/{bot.css, bot-ui.js} + content/content.json
tests/
  core.test.mjs       existing 17 tests, unchanged (still vm-evaluates core.js)
  events.test.mjs     new — queue, batching, dedupe, outcome computation, no-op path
```

What this preserves:

- **`index.html` still opens by double-click with no server.** Build output, not source.
- **`core.js` stays DOM-free** — the `node:vm` test approach is untouched.
- **`events.js` is DOM-free too**, deliberately, so it's vm-testable the same way. It
  takes a transport function; tests inject a fake one.
- Zero dependencies. `node build.mjs` is string concatenation, not a bundler.

What it costs: `CLAUDE.md`'s "no build step" line becomes "no build step for the
prototype; `node build.mjs` regenerates it." **This needs Ray's explicit sign-off — it's
the one hard constraint this plan touches.**

**Fallback if that's a no:** keep `index.html` hand-authored, and have the plugin read
and rewrite it at activation (strip the `<html>` wrapper, inject the endpoint). Uglier,
but it keeps the constraint literally intact.

---

## 5. Event schema — the contract

This is the part that's expensive to change later, because changing it orphans historical
data. Worth an hour of scrutiny now.

Envelope, one per event:

```json
{
  "v": 1,
  "sid": "9f2c1e84-…",
  "seq": 7,
  "t": 1753670400123,
  "name": "question_view",
  "props": { "group_id": "tenant", "question_id": "transfer" }
}
```

- `sid` — `crypto.randomUUID()`, held in **`sessionStorage`**. Per-tab, dies when the tab
  closes. Not a cookie, not cross-session, not cross-site. Wrapped in `try/catch` with an
  in-memory fallback (some browsers block storage on `file://`).
- `seq` — monotonic per session. With a `UNIQUE(sid, seq)` index it makes the endpoint
  **idempotent**: a retried batch can't double-count.

### Event vocabulary (closed set — anything else is dropped server-side)

| `name` | Fires when | `props` |
|---|---|---|
| `session_start` | first render | `device`, `lang`, `entry_path`, `reduced_motion` |
| `group_select` | group chosen | `group_id` |
| `question_view` | an answer step renders | `group_id`, `question_id` |
| `followup_select` | follow-up branch chosen | `group_id`, `question_id`, `option_index` |
| `link_click` | any link pill or option link opened | `group_id`, `question_id?`, `url`, `link_label`, `link_kind` |
| `picker_open` | district picker shown | `group_id?`, `origin` |
| `district_select` | a district card chosen | `district_id`, `served_by?` |
| `escape_click` | "Something else / talk to a person" | `group_id`, `from_view` |
| `feedback` | 👍 / 👎 tapped | `group_id`, `question_id`, `option_index?`, `value` |
| `back` | ‹ Back | `from_view`, `to_view` |
| `restart` | ⟲ Start over | `from_view`, `depth` |
| `session_end` | `visibilitychange → hidden` | `duration_ms`, `steps`, `deepest_view`, `outcome` |

`link_kind` ∈ `form_pdf` · `portal` · `page` · `tel` · `mailto` — derived from the URL at
send time. This is what makes "link clicks + district demand" a one-query report instead
of a string-matching exercise.

`outcome`, computed client-side at session end:

- `answered` — reached ≥1 answer, no escape, no `tel:`/`mailto:` click
- `answered_then_contact` — reached an answer, *then* went to a human (partial deflection)
- `contact_only` — went straight to a human
- `abandoned` — engaged but never reached an answer
- `bounced` — `session_start` only, no group selected

### Transport

Batch in memory; flush every 5 s, on `visibilitychange → hidden`, and at 20 queued
events. Use `navigator.sendBeacon` (survives unload — critical for `session_end`), with
`fetch(..., {keepalive: true})` as fallback. Cap: 50 events / 32 KB per request. On
failure, retry once with backoff, then drop — **analytics must never block or break the
UI.** Wrap every call site in `try/catch`.

### What is deliberately never collected

No free text (the bot has none by design — that's a real privacy advantage worth
naming), no name/email/address/file number, no IP stored, no full user-agent, no
referrer query strings, no cookie, no cross-site identifier, no third-party beacon.

---

## 6. Server side

### Tables

```sql
{prefix}civida_bot_sessions
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  sid          CHAR(36) NOT NULL UNIQUE
  started_at   DATETIME NOT NULL
  ended_at     DATETIME NULL
  duration_ms  INT UNSIGNED NULL
  device       VARCHAR(12)          -- mobile | tablet | desktop
  entry_path   VARCHAR(191)
  group_id     VARCHAR(32) NULL     -- first group selected
  outcome      VARCHAR(24) NULL
  steps        SMALLINT UNSIGNED DEFAULT 0
  KEY (started_at), KEY (outcome), KEY (group_id)

{prefix}civida_bot_events
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY
  sid          CHAR(36) NOT NULL
  seq          SMALLINT UNSIGNED NOT NULL
  occurred_at  DATETIME NOT NULL
  name         VARCHAR(24) NOT NULL
  group_id     VARCHAR(32) NULL
  question_id  VARCHAR(48) NULL
  district_id  VARCHAR(4)  NULL
  value        VARCHAR(191) NULL    -- link url | option label | up/down
  meta         JSON NULL            -- overflow only; never PII
  UNIQUE KEY sid_seq (sid, seq)
  KEY (occurred_at), KEY (name), KEY (group_id, question_id)

{prefix}civida_bot_daily            -- rollup, written by cron
  day, group_id, question_id, metric, count
```

Promoting `group_id` / `question_id` / `district_id` out of JSON into real columns is
what keeps every dashboard query a plain indexed `GROUP BY` instead of JSON extraction.
Worth the denormalization.

### Endpoint

`POST /wp-json/civida-bot/v1/events`, body `{ v, sid, events: [...] }`.

`permission_callback` returns `true` (visitors are logged out and pages are cached, so
nonces are unreliable here). **The security model is strict allowlist validation, not
authentication:**

- `sid` must match the UUID v4 regex, else 400
- `name` must be in the §5 vocabulary, else the event is **dropped, not stored**
- `group_id` / `question_id` / `district_id` must exist in the loaded `content.json`
- `url` must be `http(s)`/`tel`/`mailto` **and** appear in the content's link set
- everything is length-capped and `sanitize_text_field`'d
- `$wpdb->insert()` with prepared statements throughout

Net effect: a hostile poster can at most insert rows that look like ordinary usage. They
cannot inject arbitrary strings, XSS the dashboard, or invent question IDs.

Rate limit via transient keyed on `hash('sha256', daily_salt . remote_addr)` — **the
salted hash is stored, never the IP**, and the salt rotates daily so yesterday's hashes
are uncorrelatable. 120 events/min, 600/hour.

Drop known-crawler user agents. Drop sessions with zero interaction events.

**Ops note:** exclude the route from page cache and CDN (WP Rocket, Cloudflare, LiteSpeed
all cache aggressively by path), and allowlist it in any WAF — `/wp-json` POSTs are a
common false positive.

### Retention

Daily cron: roll raw events older than 90 days into `civida_bot_daily`, then delete the
raw rows. Default retention 400 days on the rollup, configurable. `uninstall.php` drops
the tables cleanly.

---

## 7. The dashboard

`wp-admin → Civida Chatbot → Reports`. Server-rendered from aggregate queries; Chart.js
**bundled locally**, no CDN — consistent with the project's no-external-assets rule.

**Access:** a custom capability `civida_view_bot_reports`, granted to a "Customer
Success" role. The CS manager logs in and reads reports without being handed an admin
account.

**Layout, in priority order (matching Ray's two picks):**

1. **Header cards** — engaged sessions · resolution rate · leakage rate · 👍 rate ·
   median steps to answer. Each shows the raw count under the percentage.
2. **Funnel** — opened → group selected → answer reached → feedback given, with drop-off
   at each stage. This *is* the dead-end view.
3. **Question performance table** — the CS manager's rewrite queue. Columns: question ·
   views · 👍 · 👎 · escaped-after · backed-out-after · **dead-end score**, sorted worst
   first. Rates hidden where n < 20.
4. **Link clicks** — label · URL · kind · count, grouped by `link_kind`. Answers "are
   people actually opening the HS1 form, or just reading about it?"
5. **District demand** — picks per district, with District G→H redirects called out
   separately. Feeds a real operational question about where walk-in demand sits.
6. **Trend** — sessions/day, resolution rate/week.
7. **CSV export** per table, plus a date-range picker (7 / 30 / 90 / custom).

---

## 8. Privacy posture (Alberta)

Alberta replaced FOIP's privacy half with the **Protection of Privacy Act (POPA)**, in
force **11 June 2025**; access moved to the **Access to Information Act (ATIA)**. POPA
sets the rules a **public body** must follow to collect, use, and disclose personal
information, and adds provisions on creating non-personal data and on breach
notification.

**Open item:** housing management bodies under the *Alberta Housing Act* were listed as
FOIP public bodies. Whether Civida is a public body under POPA needs confirming with
Civida — **ask, don't assume.** If yes, expect a Privacy Impact Assessment obligation.

The design answer is to make the question mostly moot: **collect no personal information
at all.** The bot has no free-text input, no login, no cookie, a tab-scoped random ID, no
stored IP, no stored user agent, no third party, and all data resting on Civida's own
server. That is about as clean a posture as a web analytics feature can have.

**Deliverables for this section, produced in Phase 4:**

- A one-page **data inventory** — every field collected, why, retention, who can see it.
  This is 80% of a PIA and makes the privacy review fast.
- Two sentences for the site privacy policy.
- Sign-off from whoever owns privacy at Civida **before** Phase 5 goes live.

Cookieless and non-identifying very likely means no consent banner is required — but
that's a call for Civida's counsel, not for us. Note it and hand it over.

---

## 9. The two real blockers

Everything above is tractable engineering. These aren't, and they're worth resolving
before Phase 2 starts:

1. **Who can install a plugin on civida.ca?** Many organizations of this size use an
   external web agency with sole deploy access, and "we'd like to install a custom
   plugin" can take weeks or get refused outright. **Ask early.** Also ask whether a
   **staging site** exists — developing a WP plugin against production is not an option.
   If the answer is no plugin installs: fall back to §3-B (iframe on a subdomain we
   control) or to GTM-based events if marketing has GTM.
2. **Is Civida a public body under POPA?** Determines whether a PIA is required, which
   determines the launch timeline more than any code does.

---

## 10. Phased build order

| Phase | Work | Est. |
|---|---|---|
| **0 — Decide** | Answer §9's two questions. Confirm plugin-install path + staging. Get Ray's sign-off on the §4 build-step change. Ask CS to start the call-volume baseline. | ½ day (mostly waiting on others) |
| **1 — Instrument the prototype** | §4 source split + `build.mjs`. Add `events.js`, all §5 call sites, and the 👍/👎 widget to `index.html` with `endpoint = null` so it still no-ops and double-clicks. Add a debug mode that prints the event tape on screen. Extend the test suite. | 1 day |
| **2 — Plugin skeleton** | Tables, REST endpoint, validation, rate limit, shortcode + block, asset enqueue, `content.json` loading. Built against local WP (wp-env / LocalWP). | 2–3 days |
| **3 — Dashboard** | Aggregate queries, admin page, charts, tables, CSV, capability + CS role. | 2–3 days |
| **4 — Ops + privacy** | Cron rollup/prune, settings page, `uninstall.php`, data inventory memo, CS-team README. | 1 day |
| **5 — Pilot** | Launch inline on 2–3 pages. Baseline already running. Two weeks of data, then review with the CS manager. | 2 weeks elapsed |

**Phase 1 is the one that earns its keep early.** It validates the entire event schema by
clicking through a local file, before any PHP exists — and it's shippable to the CS
manager alongside the wording review she already owes us. If she signs off on the
questions *and* we've watched the event tape fire correctly for every path, Phases 2–4
become mechanical.

---

## 11. Testing

- `tests/core.test.mjs` — existing 17 tests, unchanged.
- `tests/events.test.mjs` — new: queue batching, flush triggers, `UNIQUE(sid,seq)` dedupe,
  `outcome` computation for all five cases, `link_kind` derivation, and the **no-endpoint
  no-op path**.
- **Regression test that matters most:** `renderStep` output must be byte-identical with
  analytics on and off. Analytics observes; it never influences what the user sees.
- Manual QA checklist: every path at 390 px and 320 px (as before), plus — beacon fires on
  tab close, thumbs disable after tap, `sessionStorage`-blocked browsers still work,
  ad-blocker-enabled browser still records.
- PHP: a WP-CLI smoke script that POSTs a synthetic session and asserts the row counts.
  Full PHPUnit is overkill for this surface.

---

## 12. Product notes worth keeping

- **On 👎, don't just say "thanks."** Immediately surface the escape hatch: *"Sorry about
  that — here's how to reach a person."* It converts a failure into a save, and it makes
  the thumbs-down feel useful rather than ignored. Good product, good measurement.
- **Thumbs go below the contact line**, small, so they never compete with the actual
  links. One tap, no follow-up form — no free text keeps both the DOM-free rule and the
  POPA posture clean.
- Buttons disable after tap (`aria-pressed`), state remembered per question so the bot
  doesn't re-ask on a repeat view.
- The bot's **`escape_click` rate by group** is quietly the most interesting number in the
  whole system: it's the closest thing to "questions the bot should have but doesn't."
  Worth its own line on the dashboard even though it isn't a headline metric.

---

## 13. Open questions for Ray

1. Sign off on the §4 build step, or take the §4 fallback?
2. Floating launcher site-wide, or inline embeds only to start?
3. Add the "would you have called?" exit question (§1), or rely on the CS call baseline
   alone?
4. Does the CS manager get a wp-admin login, or does she want a monthly PDF/CSV instead?
5. Retention: 90 days raw / 400 days rollup — right, or does Civida have a records
   schedule that dictates it?

---

*Researched 2026-07-27. WordPress current release 7.1; min supported PHP 7.4, recommended
8.3 — target PHP 8.1+ and test on 8.3. civida.ca stack observed from the live homepage.*
