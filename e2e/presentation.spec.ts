import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/game/state';
import { ROOM_LABELS, UNLOCK_SEQUENCE } from '../src/game/puzzles';

async function inspectBorders(page: Page) {
  const issues = await page.locator('.evidence-card, .discovered-evidence, .hint-panel, .reference-card, .inspected-object, .warden-note, .partner-interstitial, .dual-lock, .clock-fallback, .postal-tickets > div:not(.routing-slot)').evaluateAll((cards) => cards.flatMap((card) => {
    if (!card.getClientRects().length) return [];
    const style = getComputedStyle(card); if (style.borderImageSource === 'none') return [];
    const bounds = card.getBoundingClientRect();
    const inner = { left: bounds.left + parseFloat(style.borderLeftWidth), right: bounds.right - parseFloat(style.borderRightWidth), top: bounds.top + parseFloat(style.borderTopWidth), bottom: bounds.bottom - parseFloat(style.borderBottomWidth) };
    const problems: string[] = [];
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = walker.currentNode;
      if (!text.textContent?.trim() || text.parentElement?.closest('.sr-only, option, button:disabled')) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.width && rect.height && (rect.left < inner.left - 3 || rect.right > inner.right + 3 || rect.top < inner.top - 3 || rect.bottom > inner.bottom + 3)) problems.push(`${card.className}: ${text.textContent?.trim()}`);
      }
    }
    for (const control of card.querySelectorAll('input, button, select, img')) {
      if (!control.getClientRects().length) continue;
      const rect = control.getBoundingClientRect();
      if (rect.left < inner.left - 3 || rect.right > inner.right + 3 || rect.top < inner.top - 3 || rect.bottom > inner.bottom + 3) problems.push(`${card.className}: ${control.outerHTML.slice(0, 100)}`);
    }
    return problems;
  }));
  expect(issues).toEqual([]);
}

test('illustrated card borders stay clear of text and controls at narrow widths and larger text', async ({ page }) => {
  test.setTimeout(60000);
  const state = createInitialState();
  for (const puzzle of Object.keys(state.solved) as (keyof typeof state.solved)[]) state.solved[puzzle] = true;
  state.witnessesSolved = true; state.lensRevealed = true; state.partnerPhraseAccepted = true;
  state.witnessAnswers = [...state.galleryLayout]; state.completedAt = Date.now();
  await page.addInitScript((saved) => {
    localStorage.setItem('the-fifth-season:v1', JSON.stringify(saved));
    localStorage.setItem('the-fifth-season:audio:v1', JSON.stringify({ muted: true, music: 1, effects: 1 }));
  }, state);
  await page.goto('./'); await page.getByRole('button', { name: /Continue case/ }).click();
  for (const [width, fontSize] of [[320, '16px'], [390, '16px'], [320, '32px'], [844, '16px']]) {
    await page.setViewportSize({ width: Number(width), height: 812 });
    await page.evaluate((size) => { document.documentElement.style.fontSize = String(size); }, fontSize);
    for (const room of UNLOCK_SEQUENCE.slice(0, -1)) {
      await page.getByRole('navigation').getByRole('button', { name: new RegExp(ROOM_LABELS[room]) }).click();
      await page.locator('.main-content details:not([open]):not(.emergency-skip)').evaluateAll((elements) => { for (const element of elements) element.setAttribute('open', ''); });
      await inspectBorders(page);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
  await page.getByRole('button', { name: /High contrast/ }).click();
  await expect(page.locator('.warden-note')).toHaveCSS('border-image-source', 'none');
});

test('new cases start both wheels at 17 and both sound sliders at 100%', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Sound', exact: true }).click();
  await expect(page.getByRole('slider', { name: /Music volume/ })).toHaveValue('100');
  await expect(page.getByRole('slider', { name: /Sound effects volume/ })).toHaveValue('100');
  await page.getByRole('button', { name: 'Close sound settings' }).click();
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('the-fifth-season:v1')!));
  expect(saved.cipherShift).toBe(17); expect(saved.finalCipherShift).toBe(17);
  const artwork = page.getByRole('img', { name: 'An Art Nouveau iron gate with a brass CASE REOPENED plaque', exact: true });
  await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test('certificate preview and exported PNG give You Escaped the larger type', async ({ page }) => {
  const state = createInitialState();
  for (const puzzle of Object.keys(state.solved) as (keyof typeof state.solved)[]) state.solved[puzzle] = true;
  state.activeRoom = 'reveal'; state.completedAt = Date.now();
  await page.addInitScript((saved) => {
    localStorage.setItem('the-fifth-season:v1', JSON.stringify(saved));
    const calls: { text: string; font: string }[] = [];
    (window as unknown as { certificateText: typeof calls }).certificateText = calls;
    const drawText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      calls.push({ text, font: this.font });
      if (maxWidth === undefined) drawText.call(this, text, x, y); else drawText.call(this, text, x, y, maxWidth);
    };
  }, state);
  await page.goto('./'); await page.getByRole('button', { name: /Continue case/ }).click();
  await page.getByText('Preview certificate', { exact: true }).click();
  const sizes = await page.locator('.certificate-preview').evaluate((certificate) => ({
    escape: parseFloat(getComputedStyle(certificate.querySelector('span')!).fontSize), birthday: parseFloat(getComputedStyle(certificate.querySelector('strong')!).fontSize),
  }));
  expect(sizes.escape).toBeGreaterThan(sizes.birthday);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save certificate PNG', exact: true }).click(); await download;
  const calls = await page.evaluate(() => (window as unknown as { certificateText: { text: string; font: string }[] }).certificateText);
  expect(calls).toContainEqual({ text: 'You Escaped!', font: '58px Georgia' });
  expect(calls).toContainEqual({ text: 'Happy Birthday!', font: '30px Georgia' });
});
