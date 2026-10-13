import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/game/state';
import { ROOM_LABELS, UNLOCK_SEQUENCE } from '../src/game/puzzles';
import type { GameState, RoomId } from '../src/game/types';

function fixture(room: RoomId): GameState {
  const state = createInitialState();
  for (const puzzle of Object.keys(state.solved) as (keyof GameState['solved'])[]) state.solved[puzzle] = true;
  state.activeRoom = room; state.witnessesSolved = true; state.lensRevealed = true;
  state.witnessAnswers = [...state.galleryLayout]; state.seasonOrder = [...state.galleryLayout];
  state.inventory = ['Case File', 'Brass Key · 26', 'Sealed Photograph', 'Timestamp Strip', 'Archive Code · 23'];
  state.partnerPhraseAccepted = true; state.completedAt = Date.now();
  return state;
}
async function resume(page: Page, state: GameState) {
  await page.addInitScript((saved) => {
    localStorage.setItem('the-fifth-season:v1', JSON.stringify(saved));
    localStorage.setItem('the-fifth-season:audio:v1', JSON.stringify({ muted: true, music: .2, effects: .9 }));
  }, state);
  await page.goto('./');
  await page.getByRole('button', { name: /Continue case/ }).tap();
}
async function assertFits(page: Page) {
  const overflow = await page.locator('.main-content button, .main-content input, .main-content select, .main-content summary, .main-content img').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length).flatMap((element) => {
    const box = element.getBoundingClientRect();
    return box.left < -1 || box.right > document.documentElement.clientWidth + 1 ? [element.outerHTML.slice(0, 180)] : [];
  }));
  expect(overflow).toEqual([]);
  const fonts = await page.locator('input:not([type=range]):not([type=radio]), select').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length).map((element) => parseFloat(getComputedStyle(element).fontSize)));
  expect(fonts.every((size) => size >= 16)).toBe(true);
  const targets = await page.locator('.topbar button, .main-content button').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length).filter((element) => element.getBoundingClientRect().height < 43.9).map((element) => element.outerHTML.slice(0, 180)));
  expect(targets).toEqual([]);
}

test('the introduction advances despite the elapsed-time ticker', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('the-fifth-season:audio:v1', JSON.stringify({ muted: true, music: .2, effects: .9 })));
  await page.clock.install();
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin a new case' }).tap();
  await expect(page.locator('.story-intro')).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByText('FOUR WITNESSES', { exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByText('ONE MISSING FRAME', { exact: true })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.getByRole('heading', { name: 'The Warden’s Gate' })).toBeVisible();
});

test('all nine rooms fit and remain navigable by touch in portrait and landscape', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await resume(page, fixture('gate'));
  await expect(page.locator('meta[name=viewport]')).toHaveAttribute('content', /viewport-fit=cover/);
  const portrait = page.viewportSize()!;
  for (const viewport of [portrait, { width: portrait.height, height: portrait.width }]) {
    await page.setViewportSize(viewport);
    for (const room of UNLOCK_SEQUENCE) {
      const button = page.getByRole('navigation', { name: 'Unlocked rooms' }).getByRole('button', { name: new RegExp(ROOM_LABELS[room].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
      await button.tap();
      await expect(button).toHaveAttribute('aria-current', 'step');
      await assertFits(page);
      await expect.poll(() => page.locator('.room-nav').evaluate((nav) => {
        const box = nav.getBoundingClientRect(); const active = nav.querySelector('[aria-current]')!.getBoundingClientRect();
        return active.left >= box.left - 1 && active.right <= box.right + 1;
      })).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});

test('lens and calendar catches are selectable with actual touch taps', async ({ page }) => {
  await resume(page, fixture('gallery'));
  for (const group of await page.getByRole('radiogroup').all()) {
    const choices = group.getByRole('radio');
    for (const choice of await choices.all()) {
      const box = await choice.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44);
      await choice.tap(); await expect(choice).toBeChecked();
      await expect(group.locator('[aria-checked=true]')).toHaveCount(1);
    }
  }
  await page.getByRole('navigation').getByRole('button', { name: /Four-Day Calendar/ }).tap();
  for (const [index, season] of ['spring', 'summer', 'autumn', 'winter'].entries()) {
    await page.locator('.plaque-rack').getByRole('button', { name: season, exact: true }).tap();
    await page.getByRole('button', { name: `Interval ${24 + index} to ${25 + index}`, exact: true }).tap();
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('the-fifth-season:v1')!));
  expect(saved.calendarSlots).toEqual(['spring', 'summer', 'autumn', 'winter']);
});

test('both clocks accept dates, colon-capable text entry and touch hand controls', async ({ page }) => {
  const state = fixture('clockTower'); state.solved.clocks = false; state.solved.postal = false; state.solved.final = false;
  await resume(page, state);
  const cities = page.locator('.city-clock');
  for (const [index, value] of ['11:15', '8:45'].entries()) {
    await cities.nth(index).getByLabel('Date', { exact: true }).fill('2025-10-26');
    await cities.nth(index).getByLabel('Local time').fill(value);
    await expect(cities.nth(index).getByLabel('Local time')).toHaveAttribute('inputmode', 'text');
    await cities.nth(index).getByLabel('Period').selectOption(index ? 'PM' : 'AM');
    await cities.nth(index).getByRole('button', { name: 'Minute +', exact: true }).tap();
    await cities.nth(index).getByRole('button', { name: 'Minute −', exact: true }).tap();
  }
  await assertFits(page);
  await page.getByRole('button', { name: 'Synchronize clocks' }).tap();
  await expect(page.getByRole('button', { name: /Enter Postal Archive/ })).toBeVisible();
});

test('cipher shift controls work by touch and the wheel survives pointer cancellation', async ({ page }) => {
  await resume(page, fixture('finalGallery'));
  await page.getByRole('button', { name: 'Decrease cipher shift' }).tap();
  await expect(page.getByRole('slider', { name: 'Shift', exact: true })).toHaveValue('16');
  await page.getByRole('button', { name: 'Increase cipher shift' }).tap();
  await expect(page.getByRole('slider', { name: 'Shift', exact: true })).toHaveValue('17');
  await page.getByRole('slider', { name: 'Shift', exact: true }).fill('23');
  await expect(page.locator('.output-strip strong')).toHaveText('TOGETHER');
  // A real contact starts capture; synthetic moves test geometry and cancellation,
  // not an iOS OS-level swipe or virtual keyboard.
  const wheel = page.locator('.cipher-wheel'); await wheel.scrollIntoViewIfNeeded();
  await wheel.evaluate((element) => {
    document.addEventListener('pointerdown', (event) => {
      const touch = event as PointerEvent;
      if (touch.pointerType !== 'touch') return;
      const bounds = element.getBoundingClientRect();
      element.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: touch.pointerId, pointerType: 'touch', clientX: bounds.left + bounds.width / 2, clientY: bounds.bottom }));
      element.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: touch.pointerId, pointerType: 'touch' }));
    }, { once: true });
  });
  const bounds = (await wheel.boundingBox())!;
  await page.touchscreen.tap(bounds.x + bounds.width - 15, bounds.y + bounds.height / 2);
  await expect(page.getByRole('slider', { name: 'Shift', exact: true })).not.toHaveValue('23');
  await page.getByRole('button', { name: 'Increase cipher shift' }).tap();
});

test('portrait and sound dialogs stay usable after rotation', async ({ page }) => {
  await resume(page, fixture('finalGallery'));
  for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole('button', { name: 'Inspect spring portrait' }).tap();
    const portrait = page.getByRole('dialog', { name: 'spring portrait', exact: true });
    await expect(portrait).toBeVisible();
    const box = (await portrait.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0); expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await portrait.getByRole('button', { name: 'Close portrait' }).tap();
    await page.getByRole('button', { name: 'Sound', exact: true }).tap();
    const sound = page.getByRole('dialog', { name: 'Sound settings' });
    await sound.getByRole('button', { name: 'Close sound settings' }).tap();
    await expect(sound).not.toBeVisible();
  }
});

test('blocked storage does not crash gameplay and reports session-only progress', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Blocked', 'SecurityError'); } }); });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin a new case' }).tap();
  await page.getByRole('button', { name: 'Skip introduction' }).tap();
  await page.getByLabel('Seven-character keypad').fill('FREEDOM');
  await page.getByRole('button', { name: 'Try the lock' }).tap();
  await page.getByRole('button', { name: /Enter Seasonal Gallery/ }).tap();
  await page.getByRole('button', { name: 'Reveal hint 1' }).tap();
  await page.getByRole('button', { name: /High contrast/ }).tap();
  await expect(page.getByRole('contentinfo')).toContainText('Storage unavailable');
  expect(errors).toEqual([]);
});

test('prepared certificate supports an explicit share gesture, cancellation and a persistent PNG fallback', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', { value: async (data: ShareData) => {
      const probe = window as unknown as { shared: { name: string; type: string; size: number }[] };
      const file = data.files![0]; probe.shared ??= []; probe.shared.push({ name: file.name, type: file.type, size: file.size });
      if (probe.shared.length === 1) throw new DOMException('Cancelled', 'AbortError');
    } });
  });
  await resume(page, fixture('reveal'));
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save certificate PNG', exact: true }).tap();
  await downloaded;
  const share = page.getByRole('button', { name: 'Share or save image', exact: true });
  await share.tap(); await expect(page.locator('.certificate-panel [role=status]')).toHaveCount(0);
  await share.tap();
  const shares = await page.evaluate(() => (window as unknown as { shared: { name: string; type: string; size: number }[] }).shared);
  expect(shares).toHaveLength(2); expect(shares[0].name).toBe('the-fifth-season-certificate.png'); expect(shares[0].type).toBe('image/png'); expect(shares[0].size).toBeGreaterThan(100000);
  const popupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: 'Open PNG', exact: true }).tap();
  const popup = await popupPromise;
  await expect.poll(() => popup.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1800);
  await popup.close();
  await expect(page.getByRole('link', { name: 'Download PNG', exact: true })).toHaveAttribute('href', /^blob:/);
});
