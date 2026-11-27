import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const template = readFileSync(path.join(root, 'templates/gtm-bootstrap.html'), 'utf8');
const pattern = /<!-- Google Tag Manager -->[\s\S]*?<!-- End Google Tag Manager -->/;
const bootstrap = template.match(/<script>([\s\S]*?)<\/script>/)[1];
const key = 'vision-altitude-consent-v1';
const lifetime = 180 * 24 * 60 * 60 * 1000;
const now = 1800000000000;
const saved = (analytics, expiresAt = now + lifetime) => ({ version: 1, analytics, expiresAt });
let checks = 0;

function harness(value, { blocked = false, hidden = false, paint = true } = {}) {
  const storage = new Map(value === undefined ? [] : [[key, JSON.stringify(value)]]);
  const scripts = [], cookiesCleared = [], frames = [];
  const events = new Map();
  let observer;
  class Clock extends Date { static now() { return now; } }
  class Observer {
    static supportedEntryTypes = ['paint'];
    constructor(callback) { observer = callback; }
    observe() {}
    disconnect() {}
  }
  const listen = (name, callback) => events.set(name, [...(events.get(name) || []), callback]);
  const window = {
    dataLayer: [{ event: 'existing' }],
    PerformanceObserver: paint ? Observer : undefined,
    addEventListener: listen,
    dispatchEvent: (event) => { for (const callback of events.get(event.type) || []) callback(event); }
  };
  const document = {
    visibilityState: hidden ? 'hidden' : 'visible',
    addEventListener: listen,
    removeEventListener: (name, callback) => events.set(name, (events.get(name) || []).filter(fn => fn !== callback)),
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) },
    get cookie() { return '_ga=123; _ga_J17B9YFL5K=456; necessary=keep'; },
    set cookie(value) { cookiesCleared.push(value); }
  };
  const localStorage = {
    getItem: name => { if (blocked) throw Error('Blocked'); return storage.get(name) ?? null; },
    setItem: (name, value) => { if (blocked) throw Error('Blocked'); storage.set(name, value); }
  };
  vm.runInNewContext(bootstrap, {
    window, document, localStorage, Date: Clock, PerformanceObserver: Observer,
    CustomEvent: class { constructor(type) { this.type = type; } },
    location: { hostname: 'www.visionaltitude.ca', pathname: '/contact/confirmation/' },
    requestAnimationFrame: callback => frames.push(callback)
  });
  return {
    window, scripts, storage, cookiesCleared, api: window.visionAltitudeConsent,
    paint: () => observer?.({ getEntries: () => [{ name: 'first-contentful-paint' }] }),
    frame: () => { while (frames.length) frames.shift()(); },
    event: (name, event = {}) => { for (const callback of [...(events.get(name) || [])]) callback(event); }
  };
}

function check(name, run) {
  run();
  checks++;
  console.log('PASS ' + name);
}

check('No consent: deny all and do not load GTM on paint, key, pointer or hidden page', () => {
  for (const options of [{}, { hidden: true }, { paint: false }]) {
    const h = harness(undefined, options);
    h.paint(); h.frame(); h.event('pointerdown'); h.event('keydown'); h.event('visibilitychange');
    assert.equal(h.scripts.length, 0);
    assert.ok(!h.window.dataLayer.some(item => item[0] === 'js'));
    assert.equal(h.api.getChoice(), null);
    assert.equal(h.window['ga-disable-G-J17B9YFL5K'], true);
    const consent = h.window.dataLayer.filter(item => item[0] === 'consent');
    assert.equal(consent[0][1], 'default');
    for (const item of consent) assert.equal(item[2].analytics_storage, 'denied');
  }
});

check('Accept: update consent before one GTM load; advertising remains denied', () => {
  const h = harness();
  assert.equal(h.api.setAnalytics(true), true);
  h.api.setAnalytics(true); h.paint(); h.event('pointerdown');
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].async, true);
  assert.equal(h.scripts[0].src, 'https://www.googletagmanager.com/gtm.js?id=GTM-548SC7SH');
  assert.equal(h.window['ga-disable-G-J17B9YFL5K'], false);
  const entries = h.window.dataLayer;
  const start = entries.findIndex(item => item.event === 'gtm.js');
  const initialization = entries.findIndex(item => item[0] === 'js');
  assert.equal(entries[initialization - 1][2].analytics_storage, 'granted');
  assert.ok(initialization < start);
  for (const item of entries.filter(item => item[0] === 'consent')) {
    for (const name of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(item[2][name], 'denied');
  }
  assert.equal(entries.filter(item => item.event === 'gtm.js').length, 1);
  assert.equal(entries.filter(item => item[0] === 'js').length, 1);
  assert.ok(!entries.some(item => item[0] === 'event' && item[1] === 'page_view'));
  assert.equal(JSON.parse(h.storage.get(key)).expiresAt, now + lifetime);
});

check('Refuse: choice saved, no GTM and only analytics cookies cleared', () => {
  const h = harness();
  h.api.setAnalytics(false); h.paint(); h.event('pointerdown');
  assert.equal(h.scripts.length, 0);
  assert.equal(JSON.parse(h.storage.get(key)).analytics, false);
  assert.ok(h.cookiesCleared.some(cookie => cookie.startsWith('_ga=;')));
  assert.ok(h.cookiesCleared.some(cookie => cookie.startsWith('_ga_J17B9YFL5K=;')));
  assert.ok(!h.cookiesCleared.some(cookie => cookie.startsWith('necessary=')));
});

check('Restore acceptance before GTM; keep first-paint scheduling', () => {
  for (const options of [{}, { hidden: true }, { paint: false }]) {
    const h = harness(saved(true), options);
    if (!options.hidden) assert.equal(h.scripts.length, 0);
    h.paint(); h.frame(); h.event('keydown');
    assert.equal(h.scripts.length, 1);
    const initialization = h.window.dataLayer.findIndex(item => item[0] === 'js');
    assert.equal(h.window.dataLayer[initialization - 1][2].analytics_storage, 'granted');
    assert.equal(h.window['ga-disable-G-J17B9YFL5K'], false);
  }
  const h = harness(saved(false)); h.paint();
  assert.equal(h.scripts.length, 0);
});

check('Revoke and reaccept without a duplicate container or page-view event', () => {
  const h = harness(saved(true)); h.paint();
  h.api.setAnalytics(false);
  assert.equal(h.window['ga-disable-G-J17B9YFL5K'], true);
  assert.equal(h.window.dataLayer.at(-1)[2].analytics_storage, 'denied');
  h.api.setAnalytics(true);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.window['ga-disable-G-J17B9YFL5K'], false);
});

check('Expired, malformed, wrong-version and future-dated consent fail closed', () => {
  for (const choice of [null, {}, saved(true, now), saved(true, now + lifetime + 1),
    { ...saved(true), version: 2 }, { ...saved(true), analytics: 'true' }]) {
    const h = harness(choice); h.paint();
    assert.equal(h.api.getChoice(), null);
    assert.equal(h.scripts.length, 0);
  }
});

check('Blocked storage honors current choice without silently persisting it', () => {
  const h = harness(undefined, { blocked: true });
  assert.equal(h.api.setAnalytics(true), false);
  assert.equal(h.scripts.length, 1);
  h.api.setAnalytics(false);
  assert.equal(h.window['ga-disable-G-J17B9YFL5K'], true);
  assert.equal(h.api.setAnalytics('true'), false);
  assert.equal(h.api.getChoice().analytics, false);
});

check('Cross-tab changes, storage clearing and bfcache restore synchronize consent', () => {
  const h = harness(saved(true)); h.paint();
  h.storage.set(key, JSON.stringify(saved(false)));
  h.event('storage', { key });
  assert.equal(h.api.getChoice().analytics, false);
  assert.equal(h.window['ga-disable-G-J17B9YFL5K'], true);
  h.storage.clear(); h.event('storage', { key: null });
  assert.equal(h.api.getChoice(), null);
  h.storage.set(key, JSON.stringify(saved(true))); h.event('pageshow');
  assert.equal(h.api.getChoice().analytics, true);
  assert.equal(h.scripts.length, 1);
});

check('Every tracked page has the same single-container bootstrap and valid banner assets', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
    .split('\0').filter(file => file.endsWith('.html') && !/^(templates|artifacts|\.edge-check|node_modules)\//.test(file));
  let tracked = 0;
  for (const file of files) {
    const html = readFileSync(path.join(root, file), 'utf8');
    if (file === 'prototype-partenariat-securi-terre/index.html') {
      assert.ok(!html.includes('GTM-'));
      assert.ok(!html.includes('assets/consent.'));
      continue;
    }
    assert.equal(html.match(pattern)?.[0].replace(/\r\n/g, '\n'), template.match(pattern)[0].replace(/\r\n/g, '\n'), file);
    assert.deepEqual(html.match(/GTM-[A-Z0-9]+/g), ['GTM-548SC7SH'], file);
    for (const extension of ['js', 'css']) {
      const links = [...html.matchAll(new RegExp('(?:href|src)="([^"?]*assets/consent\\.' + extension + ')\\?[^" ]+"', 'g'))];
      assert.equal(links.length, 1, file);
      assert.ok(existsSync(path.resolve(root, path.dirname(file), links[0][1])), file);
    }
    tracked++;
  }
  assert.equal(tracked, 93);
});

console.log(`\n${checks} consent checks passed. No external requests sent.`);
