const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '.edge-check', 'consent-20261127');
const key = 'vision-altitude-consent-v1';
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((request, response) => {
  const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let file = path.resolve(root, '.' + requested);
  if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { response.writeHead(404).end(); return; }
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  let browser;
  const results = [];
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ channel: process.env.TEST_BROWSER_CHANNEL || 'msedge', headless: true });
    async function setup(viewport, blockedStorage = false) {
      const context = await browser.newContext({ viewport });
      const gtm = [], errors = [];
      await context.route('**/*', route => {
        const url = route.request().url();
        if (url.startsWith(origin + '/')) return route.continue();
        if (url.startsWith('https://www.googletagmanager.com/gtm.js?')) {
          gtm.push(url);
          return route.fulfill({ contentType: 'text/javascript', body: 'window.__mockContainerLoaded = true;' });
        }
        return route.abort();
      });
      if (blockedStorage) await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      return { context, page, gtm, errors };
    }

    for (const [name, width, height] of [['mobile-small', 320, 740], ['mobile', 390, 844], ['tablet', 768, 1024], ['desktop', 1440, 900]]) {
      const { context, page, gtm, errors } = await setup({ width, height });
      await page.goto(origin + '/', { waitUntil: 'load' });
      const banner = page.locator('[data-consent-banner]');
      await banner.waitFor({ state: 'visible' });
      await page.waitForTimeout(200);
      assert.equal(gtm.length, 0, name + ' no tracking before consent');
      const geometry = await banner.evaluate(element => {
        const box = element.getBoundingClientRect();
        const buttons = [...element.querySelectorAll('button:not([hidden])')].map(button => {
          const rect = button.getBoundingClientRect(), style = getComputedStyle(button);
          return { x: rect.x, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, background: style.backgroundColor, color: style.color };
        });
        return { x: box.x, right: box.right, bottom: box.bottom, height: box.height, buttons,
          text: getComputedStyle(element.querySelector('p')).color, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(geometry.x >= 0 && geometry.right <= width + 1 && geometry.bottom <= height + 1, name);
      assert.equal(geometry.overflow, false, name + ' no horizontal overflow');
      assert.equal(geometry.text, 'rgb(20, 20, 20)');
      for (const button of geometry.buttons) {
        assert.ok(button.x >= 0 && button.right <= width && button.bottom <= height && button.height >= 44, name);
      }
      assert.equal(geometry.buttons[0].width, geometry.buttons[1].width, name + ' equal choice size');
      assert.equal(geometry.buttons[0].background, geometry.buttons[1].background, name + ' equal choice contrast');
      await page.screenshot({ path: path.join(output, name + '.png') });
      await page.locator('[data-consent-reject]').click();
      await banner.waitFor({ state: 'hidden' });
      assert.equal(gtm.length, 0);
      await page.goto(origin + '/contact/', { waitUntil: 'load' });
      await page.locator('[data-consent-settings]').waitFor();
      assert.equal(await page.locator('[data-consent-banner]').isVisible(), false);
      assert.equal(gtm.length, 0);
      await page.locator('[data-consent-settings]').click();
      await page.locator('[data-consent-cancel]').click();
      assert.equal(await page.locator('[data-consent-banner]').isVisible(), false);
      await page.locator('[data-consent-settings]').click();
      await page.locator('[data-consent-accept]').click();
      await page.waitForFunction(() => window.__mockContainerLoaded === true);
      assert.deepEqual(gtm, ['https://www.googletagmanager.com/gtm.js?id=GTM-548SC7SH']);
      const state = await page.evaluate(key => ({
        saved: JSON.parse(localStorage.getItem(key)), disabled: window['ga-disable-G-J17B9YFL5K'],
        updates: window.dataLayer.filter(entry => entry[0] === 'consent').map(entry => [entry[1], entry[2].analytics_storage]),
        scripts: [...document.scripts].filter(script => script.src.includes('googletagmanager.com/gtm.js')).length
      }), key);
      assert.equal(state.saved.analytics, true);
      assert.equal(state.disabled, false);
      assert.equal(state.scripts, 1);
      assert.deepEqual(state.updates.at(-1), ['update', 'granted']);
      await page.goto(origin + '/etudes-de-cas/', { waitUntil: 'load' });
      await page.waitForFunction(() => window.__mockContainerLoaded === true);
      assert.equal(gtm.length, 2, 'one container request per accepted page');
      assert.equal(await page.locator('[data-consent-banner]').isVisible(), false);
      await context.addCookies([
        { name: '_ga', value: 'test', url: origin + '/' },
        { name: '_ga_J17B9YFL5K', value: 'test', url: origin + '/' },
        { name: 'necessary', value: 'keep', url: origin + '/' }
      ]);
      await page.locator('[data-consent-settings]').click();
      await page.locator('[data-consent-reject]').click();
      const cookies = await context.cookies();
      assert.ok(!cookies.some(cookie => cookie.name.startsWith('_ga')));
      assert.ok(cookies.some(cookie => cookie.name === 'necessary'));
      assert.equal(await page.evaluate(() => window['ga-disable-G-J17B9YFL5K']), true);
      assert.deepEqual(errors, [], name + ' runtime errors');
      results.push({ name, geometry, scenarios: 'first visit, refuse, navigate, reopen, cancel, accept, restore, revoke', externalAnalytics: 'mocked' });
      await context.close();
    }

    const blocked = await setup({ width: 390, height: 844 }, true);
    await blocked.page.goto(origin + '/cookies/', { waitUntil: 'load' });
    await blocked.page.locator('[data-consent-accept]').click();
    await blocked.page.waitForFunction(() => window.__mockContainerLoaded === true);
    assert.ok((await blocked.page.locator('.va-consent-status').textContent()).includes('ne permet pas'));
    await blocked.page.reload({ waitUntil: 'load' });
    assert.equal(await blocked.page.locator('[data-consent-banner]').isVisible(), true);
    assert.equal(blocked.gtm.length, 1, 'blocked storage must not restore acceptance');
    await blocked.context.close();

    const interaction = await setup({ width: 390, height: 844 });
    await interaction.page.goto(origin + '/contact/', { waitUntil: 'load' });
    const nameInput = interaction.page.locator('[data-contact-form] input[name="nom"]');
    await nameInput.fill('Essai local sans envoi');
    const accept = interaction.page.locator('[data-consent-accept]');
    await accept.focus();
    await interaction.page.keyboard.press('Tab');
    assert.equal(await interaction.page.locator('[data-consent-reject]').evaluate(button => document.activeElement === button), true);
    assert.equal(await interaction.page.locator('[data-consent-reject]').evaluate(button => getComputedStyle(button).outlineStyle), 'solid');
    await interaction.page.keyboard.press('Enter');
    await interaction.page.locator('[data-consent-settings]').click();
    await interaction.page.keyboard.press('Escape');
    assert.equal(await interaction.page.locator('[data-consent-settings]').evaluate(button => document.activeElement === button), true);
    await interaction.page.locator('[data-consent-settings]').click();
    await accept.click();
    const otherTab = await interaction.context.newPage();
    await otherTab.goto(origin + '/cookies/', { waitUntil: 'load' });
    await otherTab.waitForFunction(() => window.__mockContainerLoaded === true);
    await otherTab.locator('[data-consent-settings]').click();
    await otherTab.locator('[data-consent-reject]').click();
    await interaction.page.waitForFunction(() => window['ga-disable-G-J17B9YFL5K'] === true);
    assert.equal(await nameInput.inputValue(), 'Essai local sans envoi');
    assert.deepEqual(interaction.errors, []);
    await interaction.context.close();

    const additional = await setup({ width: 1440, height: 900 });
    for (const url of ['/offre-services/', '/contact/confirmation/', '/photographie-aerienne/laval/', '/politique-de-confidentialite/']) {
      await additional.page.goto(origin + url, { waitUntil: 'load' });
      assert.equal(await additional.page.locator('[data-consent-banner]').isVisible(), true, url);
      assert.equal(await additional.page.locator('[data-consent-settings]').count(), 1, url);
    }
    await additional.page.goto(origin + '/prototype-partenariat-securi-terre/', { waitUntil: 'load' });
    assert.equal(await additional.page.locator('[data-consent-banner]').count(), 0);
    assert.equal(additional.gtm.length, 0);
    assert.deepEqual(additional.errors, []);
    await additional.context.close();
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify({ viewportsPassed: results.length, blockedStorage: 'passed', keyboard: 'passed', crossTabRevocation: 'passed', contactFieldsPreserved: true, extraPages: 5, screenshots: output, realAnalyticsRequests: 0 }));
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
