const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const origin = 'https://visionaltitude.ca';
const key = 'vision-altitude-consent-v1';
const measurementId = 'G-J17B9YFL5K';

// Load the published Google runtime, but intercept every measurement request.
// Site documents and banner assets come from the local checkout, not production.
(async () => {
  const browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'msedge', headless: true });
  const hits = [], containers = [], errors = [];
  try {
    const context = await browser.newContext();
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if ((url.hostname.endsWith('google-analytics.com') || url.hostname.endsWith('analytics.google.com')) && url.pathname.includes('collect')) {
        const lines = request.postData()?.split(/\r?\n/).filter(Boolean) || [''];
        for (const line of lines) {
          const parameters = new URLSearchParams(url.search);
          for (const [key, value] of new URLSearchParams(line)) parameters.set(key, value);
          hits.push({ event: parameters.get('en'), consent: parameters.get('gcs'), measurementId: parameters.get('tid') });
        }
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
      }
      if (url.origin === origin) {
        const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        const contentType = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ status: 200, contentType, body: fs.readFileSync(file) });
      }
      if (url.hostname === 'www.googletagmanager.com' && (url.pathname === '/gtm.js' || url.pathname === '/gtag/js')) {
        if (url.pathname === '/gtm.js') containers.push(url.searchParams.get('id'));
        return route.continue();
      }
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/', { waitUntil: 'load' });
    await page.locator('[data-consent-reject]').click();
    await page.waitForTimeout(1000);
    assert.equal(hits.length, 0, 'No collection before acceptance or after refusal');
    assert.equal(containers.length, 0);
    await page.locator('[data-consent-settings]').evaluate(button => button.click());
    await page.locator('[data-consent-banner]').waitFor({ state: 'visible' });
    await page.locator('[data-consent-accept]').click();
    await page.waitForTimeout(7000);
    const accepted = [...hits];
    assert.equal(accepted.filter(hit => hit.event === 'page_view').length, 1, 'Exactly one initial page_view');
    assert.ok(accepted.every(hit => hit.measurementId === measurementId && hit.consent === 'G101'), JSON.stringify(accepted));
    assert.ok((await context.cookies()).some(cookie => cookie.name === '_ga'));
    hits.length = 0;
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(7000);
    const restored = [...hits];
    assert.equal(restored.filter(hit => hit.event === 'page_view').length, 1, 'Exactly one restored-consent page_view');
    assert.ok(restored.every(hit => hit.measurementId === measurementId && hit.consent === 'G101'), JSON.stringify(restored));
    assert.deepEqual(containers, ['GTM-548SC7SH', 'GTM-548SC7SH']);
    await page.locator('[data-consent-settings]').evaluate(button => button.click());
    await page.locator('[data-consent-reject]').click();
    assert.equal(await page.evaluate(id => window['ga-disable-' + id], measurementId), true);
    assert.ok(!(await context.cookies()).some(cookie => cookie.name.startsWith('_ga')));
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).analytics, key), false);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ accepted, restored, containers, refusal: 'passed', realMeasurementRequestsSent: 0 }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
