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

// Values built inside the vm context carry that realm's prototypes, which
// strict deepEqual rejects. JSON-cloning rehomes them before comparison.
const deep = (actual, expected, msg) =>
  assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, msg);

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
  deep(CONTENT.groups.map((g) => g.id), ['applicant', 'tenant', 'recipient', 'notsure']);
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
  deep(CONTENT.contacts, {
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
  deep(counts, { applicant: 4, tenant: 5, recipient: 4, notsure: 0 });
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
  deep(CONTENT.districts.map((d) => d.id), ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
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
  deep(transfer.followUp.options.map((o) => o.label), ['Yes', 'No']);
  const yes = transfer.followUp.options[0];
  assert.ok(
    yes.links.some((l) => l.url?.includes('TM3-Emergency-Transfer-2024.pdf')),
    'Yes branch must link the TM3 PDF'
  );
});

// ---------- pure logic ----------

test('routing step greets and offers the four groups', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'routing' });
  assert.equal(step.messages[0].text, CONTENT.meta.greeting);
  assert.equal(step.messages[1].text, CONTENT.meta.routingPrompt);
  deep(step.options.map((o) => o.go.groupId), ['applicant', 'tenant', 'recipient', 'notsure']);
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
  deep(step.options.map((o) => o.label), ['Ask another question']);
});

test('branching answer shows the follow-up prompt instead of the contact line', () => {
  const { CONTENT, renderStep } = loadCore();
  const step = renderStep(CONTENT, { view: 'answer', groupId: 'tenant', questionId: 'transfer' });
  assert.equal(step.messages[step.messages.length - 1].text, 'Is this an emergency?');
  assert.ok(step.messages.every((m) => !/^Still need help\?/.test(m.text)));
  deep(step.options.map((o) => o.label), ['Yes', 'No']);
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
  const card = step.messages.find((m) => /^District H — /.test(m.text));
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
    assert.ok(step.options.length > 0, `dead-end step (no options) at ${key}`);
    for (const o of step.options) {
      assert.ok(o.label, `option without label at ${key}`);
      assert.ok(o.go || o.url, `option that goes nowhere at ${key}`);
      if (o.go) visit(o.go);
    }
  };
  visit({ view: 'routing' });
  // 33 distinct locations are reachable from routing (2 routing variants,
  // 4 group views, 13 answers, 2 follow-ups, 3 escapes, 8 districts, 1 picker)
  assert.ok(visited >= 30, `crawl looks too small: ${visited} locations`);
});
