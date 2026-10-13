import { expect, test } from '@playwright/test';

type AudioProbe = { contexts: AudioContext[]; sources: number };

test('sound is gesture-gated, independently adjustable, persistent and safe to mute', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit has no Web Audio; run this audio check on Linux/macOS or a real iPhone.');
  await page.addInitScript(() => {
    const probe: AudioProbe = { contexts: [], sources: 0 };
    (window as unknown as { audioProbe: AudioProbe }).audioProbe = probe;
    const Original = window.AudioContext;
    window.AudioContext = class extends Original {
      constructor() { super(); probe.contexts.push(this); }
      createOscillator() { probe.sources++; return super.createOscillator(); }
    };
  });
  await page.goto('./');
  expect(await page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources)).toBeGreaterThan(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.contexts[0]?.state)).toBe('suspended');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.contexts[0]?.state)).toBe('running');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Sound settings' });
  await expect(panel).toBeVisible();
  await page.getByRole('slider', { name: /Music volume/ }).fill('0');
  await page.getByRole('slider', { name: /Sound effects volume/ }).fill('42');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('the-fifth-season:audio:v1')!).effects)).toBe(0.42);
  const count = await page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources);
  await page.getByRole('button', { name: 'Preview sounds' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources)).toBeGreaterThan(count);
  await panel.getByRole('button', { name: 'Mute all audio', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview sounds' })).toBeDisabled();
  await page.getByRole('button', { name: 'Close sound settings' }).click();
  await expect(page.getByRole('button', { name: 'Sound', exact: true })).toBeFocused();
  const mutedCount = await page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources);
  await page.getByLabel('Seven-character keypad').fill('FREEDOM');
  await page.getByRole('button', { name: 'Try the lock' }).click();
  await expect(page.getByText('The case has been reopened.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources)).toBe(mutedCount);
  await page.reload();
  await page.getByRole('button', { name: /Continue case/ }).click();
  expect(await page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.contexts.length)).toBe(0);
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(page.getByRole('slider', { name: /Music volume/ })).toHaveValue('0');
  await expect(page.getByRole('slider', { name: /Sound effects volume/ })).toHaveValue('42');
  await panel.getByRole('button', { name: 'Unmute all audio', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.contexts[0]?.state)).toBe('running');
  await page.getByRole('button', { name: 'Preview sounds' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { audioProbe: AudioProbe }).audioProbe.sources)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close sound settings' }).click();
  expect(requests.some((url) => /\.(mp3|wav|ogg)(\?|$)/.test(url))).toBe(false);
  const bounds = await page.locator('.topbar').evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.client + 1);
});

test('all synthesized effects and both music themes render audible, non-clipping waveforms', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit' && process.platform === 'win32', 'Windows WebKit has no OfflineAudioContext.');
  await page.goto('./');
  const waveforms = await page.evaluate(async () => {
    const scorePath = '/src/audio/score.ts'; const synthPath = '/src/audio/synthesis.ts';
    const { SOUND_CUES, musicBeat } = await import(scorePath);
    const { synthesize } = await import(synthPath);
    const scores = { ...SOUND_CUES, mystery: musicBeat('mystery', 0), themeReveal: musicBeat('reveal', 0) };
    const results: { name: string; peak: number; energy: number }[] = [];
    for (const [name, voices] of Object.entries(scores)) {
      const context = new OfflineAudioContext(1, 44100 * 8, 44100);
      synthesize(context, context.destination, voices, 0);
      const buffer = await context.startRendering();
      const samples = buffer.getChannelData(0);
      let peak = 0; let energy = 0;
      for (const sample of samples) { peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
      results.push({ name, peak, energy });
    }
    return results;
  });
  expect(waveforms).toHaveLength(23);
  for (const waveform of waveforms) {
    expect(waveform.energy, waveform.name).toBeGreaterThan(0.01);
    expect(waveform.peak, waveform.name).toBeLessThan(0.95);
  }
});

test('the case remains playable if Web Audio is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: undefined });
    Object.defineProperty(window, 'webkitAudioContext', { value: undefined });
  });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  await page.getByLabel('Seven-character keypad').fill('FREEDOM');
  await page.getByRole('button', { name: 'Try the lock' }).click();
  await expect(page.getByText('The case has been reopened.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sound is unavailable' })).toBeVisible();
  expect(errors).toEqual([]);
});
