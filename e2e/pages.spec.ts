import { expect, test } from '@playwright/test';
import { readdir } from 'node:fs/promises';

test('the built Pages bundle starts audio only on interaction and recovers after returning', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit lacks Web Audio; this runs in Linux CI.');
  await page.addInitScript(() => {
    const probe: { contexts: AudioContext[]; sources: number } = { contexts: [], sources: 0 };
    (window as unknown as { pagesAudio: typeof probe }).pagesAudio = probe;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor() { super(); probe.contexts.push(this); }
      createOscillator() { probe.sources++; return super.createOscillator(); }
    };
  });
  await page.goto('./');
  expect(await page.evaluate(() => (window as unknown as { pagesAudio: { contexts: AudioContext[] } }).pagesAudio.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { pagesAudio: { sources: number } }).pagesAudio.sources)).toBeGreaterThan(0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect.poll(() => page.evaluate(() => (window as unknown as { pagesAudio: { contexts: AudioContext[] } }).pagesAudio.contexts[0].state)).toBe('suspended');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { pagesAudio: { contexts: AudioContext[] } }).pagesAudio.contexts[0].state)).toBe('running');
  await page.getByRole('slider', { name: /Music volume/ }).fill('0');
  const before = await page.evaluate(() => (window as unknown as { pagesAudio: { sources: number } }).pagesAudio.sources);
  await page.getByRole('button', { name: 'Preview sounds' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { pagesAudio: { sources: number } }).pagesAudio.sources)).toBeGreaterThan(before);
});

test('Pages serves all local assets at the repository prefix and never masks missing paths', async ({ page, request, baseURL }) => {
  const errors: string[] = []; const failed: string[] = []; const offsite: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  page.on('request', (req) => { if (new URL(req.url()).origin !== new URL(baseURL!).origin) offsite.push(req.url()); });
  const response = await page.goto('./?qr=postcard');
  expect(response!.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'The Fifth Season', exact: true })).toBeVisible();
  const scripts = await page.locator('script[src]').evaluateAll((elements) => elements.map((element) => element.getAttribute('src')!));
  expect(scripts.length).toBeGreaterThan(0); expect(scripts.every((path) => path.startsWith('/the-fifth-season/assets/'))).toBe(true);
  expect((await request.get(`${baseURL}.nojekyll`)).status()).toBe(200);
  for (const folder of ['images/seasons', 'images/props']) for (const file of await readdir(`public/${folder}`)) {
    const asset = await request.get(`${baseURL}${folder}/${file}`);
    expect(asset.status(), file).toBe(200); expect(asset.headers()['content-type'], file).toMatch(/^image\//);
    expect((await asset.body()).length, file).toBeGreaterThan(0);
  }
  for (const wrong of ['/images/props/artist-lens.webp', '/src/main.tsx', '/the-fifth-season/unknown-room', '/the-fifth-season/missing.webp']) {
    expect((await request.get(new URL(wrong, baseURL).href)).status(), wrong).toBe(404);
  }
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await page.getByLabel('Seven-character keypad').fill('FREEDOM');
  await page.getByRole('button', { name: 'Try the lock' }).click();
  await page.getByRole('button', { name: /Enter Seasonal Gallery/ }).click();
  await page.reload(); await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(page.getByRole('heading', { name: 'Seasonal Gallery', exact: true })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/the-fifth-season/');
  expect(failed).toEqual([]); expect(offsite).toEqual([]); expect(errors).toEqual([]);
});
