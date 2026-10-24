'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/contact');
const fixture = { name: 'Example & Test 👋', email: 'test@example.com', business: 'Example Business', service: 'Website Design & Development', details: 'A multilingual website with enquiries.' };
const confirmation = '<!doctype html><div class="freebirdFormviewerViewResponseConfirmContentContainer"><div class="vHW8K">Your response has been recorded.</div></div>';
let sequence = 0;

async function request(overrides = {}) {
  const headers = {};
  const req = { method: 'POST', headers: { host: 'example.test', origin: 'https://example.test', 'content-type': 'application/json', 'x-forwarded-for': `contact-${++sequence}` }, body: { ...fixture }, ...overrides };
  const res = { statusCode: 200, setHeader(name, value) { headers[name.toLowerCase()] = value; }, end(value) { this.body = JSON.parse(value); } };
  await handler(req, res);
  return { status: res.statusCode, body: res.body, headers };
}

test('maps all five fields and confirms only a recognized recorded-response page', async t => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sent = { url, options };
    return { ok: true, url, text: async () => confirmation };
  });
  const result = await request();
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(new URL(sent.url).hostname, 'docs.google.com');
  assert.equal(new URL(sent.url).searchParams.get('hl'), 'en');
  assert.equal(sent.options.method, 'POST');
  assert.equal(sent.options.headers['Content-Type'], 'application/x-www-form-urlencoded');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(sent.options.body)), {
    'entry.772884676': fixture.name, 'entry.92953162': fixture.email,
    'entry.257858045': fixture.business, 'entry.2086671607': fixture.service, 'entry.942640608': fixture.details
  });
  assert.ok(sent.options.signal instanceof AbortSignal);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.ok(!JSON.stringify(result).includes('test@example.com'));
});

test('accepts and relays the four published Other solutions enquiries', async t => {
  let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    sent = new URLSearchParams(options.body);
    return { ok: true, text: async () => confirmation };
  });
  for (const service of ['Website redesigns', 'Landing pages', 'Booking integrations', 'Business dashboards']) {
    const result = await request({ body: { ...fixture, service } });
    assert.equal(result.status, 200);
    assert.equal(sent.get('entry.2086671607'), service);
  }
});

test('allows an empty optional business field', async t => {
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => confirmation }));
  assert.equal((await request({ body: { ...fixture, business: '' } })).body.ok, true);
  const { business, ...withoutBusiness } = fixture;
  assert.equal((await request({ body: withoutBusiness })).body.ok, true);
});

test('rejects invalid requests before contacting Google', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Must not send'); });
  assert.equal((await request({ method: 'GET' })).status, 405);
  assert.equal((await request({ headers: { host: 'example.test', origin: 'https://other.test', 'content-type': 'application/json' } })).status, 403);
  assert.equal((await request({ headers: { 'content-type': 'text/plain' } })).status, 415);
  for (const body of [null, [], {}, { ...fixture, email: 'invalid' }, { ...fixture, name: '  ' }, { ...fixture, service: 'Invented option' }, { ...fixture, details: 'x'.repeat(5001) }]) {
    assert.equal((await request({ body })).status, 400);
  }
  assert.equal((await request({ body: '{bad JSON' })).status, 400);
  assert.equal((await request({ body: 'x'.repeat(32_769) })).status, 413);
  assert.equal(upstream.mock.callCount(), 0);
});

test('does not treat HTTP 200 validation, sign-in, closure, or script strings as success', async t => {
  let html;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => html }));
  for (const page of [
    '<html><body>Please complete this required question</body></html>',
    '<script>const text="Your response has been recorded.";</script>',
    '<div class="vHW8K">This form is no longer accepting responses. Your response has been recorded.</div>',
    '<form action="https://docs.google.com/forms/d/id/formResponse"><textarea>Your response has been recorded.</textarea></form><div class="vHW8K">Your response has been recorded.</div>',
    '<div class="vHW8K">Sign in to continue. Your response has been recorded.</div>',
    '<div class="vHW8K">An unrecognized custom confirmation message.</div>'
  ]) {
    html = page;
    const result = await request();
    assert.equal(result.status, 502);
    assert.notEqual(result.body.ok, true);
    assert.ok(!JSON.stringify(result).includes('<'));
  }
});

test('does not report success after an auth redirect or failed upstream response', async t => {
  let mode = 'auth';
  t.mock.method(globalThis, 'fetch', async () => ({ ok: mode !== 'error', url: mode === 'auth' ? 'https://accounts.google.com/ServiceLogin' : 'https://docs.google.com/forms/d/id/formResponse', text: async () => confirmation }));
  assert.equal((await request()).status, 502);
  mode = 'error';
  assert.equal((await request()).status, 502);
});

test('timeouts stay unconfirmed and are never retried automatically', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timed out', 'TimeoutError'); });
  const result = await request();
  assert.equal(result.status, 502);
  assert.match(result.body.error, /couldn’t confirm/);
  assert.equal(upstream.mock.callCount(), 1);
});

test('limits repeated submissions before another response is sent', async t => {
  const upstream = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, text: async () => confirmation }));
  const headers = { host: 'example.test', origin: 'https://example.test', 'content-type': 'application/json', 'x-forwarded-for': 'contact-limit-fixture' };
  for (let i = 0; i < 5; i++) assert.equal((await request({ headers })).status, 200);
  const limited = await request({ headers });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers['retry-after']) > 0);
  assert.equal(upstream.mock.callCount(), 5);
});
