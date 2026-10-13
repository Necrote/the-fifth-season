import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function begin(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Begin a new case' }).click();
  await page.getByRole('button', { name: 'Skip introduction' }).click();
}

async function enter(page: Page, room: string) {
  await page.getByRole('button', { name: `Enter ${room}`, exact: false }).click();
}

async function assertNoClipping(page: Page, selector: string) {
  const bounds = await page.locator(selector).evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    const room = element.closest('.room-body')!.getBoundingClientRect();
    return box.left >= room.left - 1 && box.right <= room.right + 1;
  }));
  expect(bounds.length).toBeGreaterThan(0);
  expect(bounds.every(Boolean)).toBe(true);
}

test('solves the complete case with deliberate discoveries and the archive wheel', async ({ page }, testInfo) => {
  test.setTimeout(60000);
  await begin(page);
  await page.getByLabel('Seven-character keypad').fill('FreeDom');
  await page.getByRole('button', { name: 'Try the lock' }).click();
  await expect(page.getByRole('heading', { name: 'The Warden’s Gate' })).toBeVisible();
  await expect(page.getByText('BIRTHDAY A', { exact: true })).toHaveCount(0);
  await expect(page.getByText('BIRTHDAY B', { exact: true })).toHaveCount(0);
  await enter(page, 'Seasonal Gallery');

  const order = ['spring', 'summer', 'autumn', 'winter'];
  const descriptions = ['She holds the first flowers', 'She stands amid wheat and poppies', 'She carries a basket of fruit', 'She shelters under snow-covered boughs'];
  const unnamed = page.locator('.unnamed-witnesses');
  await expect(unnamed.locator('img, select, .season-plaque')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'The artist’s lens', exact: true })).toHaveCount(0);
  await expect(page.locator('.lens-grid')).toHaveCount(0);
  const displayed = await page.locator('.witness-testimony blockquote').allTextContents();
  expect(displayed).not.toEqual(descriptions);
  for (let index = 0; index < order.length; index++) {
    await page.getByLabel(`Name for ${descriptions[index]}`, { exact: true }).fill(order[index].toUpperCase());
  }
  await expect(page.locator('.lens-grid')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return the names' }).click();
  await expect(page.getByText('The names settle into place. A hidden compartment opens.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Examine the artist’s lens' })).toBeVisible();
  await expect(page.locator('.lens-grid')).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: /Continue case/ }).click();
  await page.getByRole('button', { name: 'Examine the artist’s lens' }).click();
  await expect(page.locator('.lens-grid img')).toHaveCount(4);
  const numbers = await page.locator('.lens-grid button[role=radio]').allTextContents();
  expect(numbers).toEqual(Array.from({ length: 16 }, (_, index) => String(index + 1)));
  await expect(page.getByText('The trees bear winter’s weight.', { exact: true })).toHaveCount(0);
  const features = ['Flowers cradled in her arms', 'Wheat beside the lower figure', 'Basket of yellow fruit in her left hand', 'Snow-laden boughs above her'];
  for (const feature of features) await page.getByRole('radio', { name: new RegExp(`Lens location .*: ${feature}`) }).click();
  const fit = await page.locator('.artwork-viewport').evaluateAll((elements) => elements.every((element) => element.scrollHeight <= element.clientHeight + 1));
  expect(fit).toBe(true);
  await page.getByRole('button', { name: 'Turn the four catches' }).click();
  await expect(page.getByRole('heading', { name: 'Four season tiles recovered' })).toBeVisible();
  await expect(page.getByText('SEED', { exact: true })).toHaveCount(0);
  await enter(page, 'Four-Day Calendar');

  const intervalSelects = page.locator('.calendar-fallback select');
  for (let index = 0; index < 4; index += 1) await expect(intervalSelects.nth(index)).toHaveValue('');
  for (let index = 0; index < order.length; index += 1) {
    await page.locator('.plaque-rack').getByRole('button', { name: order[index], exact: true }).click();
    await page.getByRole('button', { name: `Interval ${24 + index} to ${25 + index}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Set the calendar' }).click();
  await expect(page.getByRole('img', { name: 'An ornate brass key engraved 26' })).toBeVisible();
  await enter(page, 'Cipher Desk');

  await expect(page.locator('.main-content .case-dates')).toHaveCount(0);
  await page.getByRole('slider', { name: 'Shift' }).fill('4');
  await page.getByLabel('Submit decoded word').fill('PHOTO');
  await page.getByRole('button', { name: 'Open the note' }).click();
  await enter(page, 'Memory Cabinet');

  await page.getByLabel('Date key').fill('26');
  await page.getByLabel('Decoded word').fill('PHOTO');
  await page.getByRole('button', { name: 'Turn both latches' }).click();
  await expect(page.getByRole('heading', { name: 'Memory Cabinet' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Prison Break · Evidence 1026/ })).toBeVisible();
  await expect(page.locator('.main-content')).not.toContainText('11:15');
  await expect(page.locator('.inventory')).not.toContainText('11:15');
  await page.getByRole('button', { name: 'Reveal hint 1' }).click();
  await expect(page.getByText(/Find the photograph from your last Prison Break escape/)).toBeVisible();
  await expect(page.locator('img[src*="escape-photo"]')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(page.locator('.sealed-memory')).toBeVisible();
  await enter(page, 'Twin Clocks');
  await expect(page.locator('.main-content')).not.toContainText('11101');
  await expect(page.locator('.main-content')).not.toContainText('400050');

  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill('2025-10-26'); await dates.nth(1).fill('2025-10-26');
  await page.getByLabel('Local time').nth(0).fill('11:15'); await page.getByLabel('Local time').nth(1).fill('8:45');
  await page.getByLabel('Period').nth(0).selectOption('AM'); await page.getByLabel('Period').nth(1).selectOption('PM');
  await page.getByRole('button', { name: 'Synchronize clocks' }).click();
  await enter(page, 'Postal Archive');

  await page.locator('.routing-slot').nth(0).getByText('Text entry', { exact: true }).click();
  await page.locator('.routing-slot').nth(1).getByText('Text entry', { exact: true }).click();
  await assertNoClipping(page, '.routing-slot input');
  await page.getByLabel('RECIPIENT · DESTINATION', { exact: true }).fill('11101');
  await page.getByLabel('SENDER · ORIGIN', { exact: true }).fill('400050');
  await page.getByRole('button', { name: 'Pull the sorting lever' }).click();
  for (let step = 0; step < 2; step += 1) await page.getByRole('button', { name: 'Archive number digit 1 increase', exact: true }).click();
  for (let step = 0; step < 3; step += 1) await page.getByRole('button', { name: 'Archive number digit 2 increase', exact: true }).click();
  await page.getByRole('button', { name: 'Stamp archive number' }).click();
  await expect(page.getByRole('heading', { name: 'Postal Archive' })).toBeVisible();
  await expect(page.locator('.archive-stamp .evidence-number')).toHaveText('23');
  await page.reload();
  await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(page.locator('.archive-stamp .evidence-number')).toHaveText('23');
  await expect(page.locator('.postal-tickets').getByText('1 1 1 0 1', { exact: true })).toBeVisible();
  await enter(page, 'Final Gallery');

  await expect(page.getByText('QLDBQEBO', { exact: true })).toHaveCount(0);
  await expect(page.locator('.final-frames img')).toHaveCount(4);
  const fullPortraits = await page.locator('.final-frames img').evaluateAll((images) => images.every((image) => getComputedStyle(image).objectFit === 'contain'));
  expect(fullPortraits).toBe(true);
  await page.getByRole('button', { name: 'Inspect spring portrait' }).click();
  await expect(page.getByRole('dialog', { name: 'spring portrait', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close portrait' }).click();
  await expect(page.locator('.etched-archive')).toHaveCount(0);
  await page.getByLabel('Sender-held challenge phrase').fill('SAME TEAM');
  await page.getByRole('button', { name: 'Turn the first key' }).click();
  await page.getByRole('button', { name: 'Increase cipher shift' }).click();
  await expect(page.getByRole('slider', { name: 'Shift' })).toHaveValue('18');
  await page.getByRole('slider', { name: 'Shift' }).fill('23');
  await expect(page.locator('.output-strip strong')).toHaveText('TOGETHER');
  await page.reload();
  await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(page.getByRole('slider', { name: 'Shift' })).toHaveValue('23');
  await page.getByLabel('Final decoded word').fill('TOGETHER');
  await page.getByRole('button', { name: 'Open the fifth frame' }).click();

  await expect(page.getByRole('heading', { name: 'The Fifth Season' })).toBeVisible();
  await expect(page.getByText('8 / 8')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Happy Birthday!', exact: true })).toBeVisible();
  const revealPhoto = page.getByRole('img', { name: /Three friends celebrating their escape/ });
  await expect(revealPhoto).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the evidence envelope', exact: true }).click();
  await expect(revealPhoto).toBeVisible();
  await expect.poll(() => revealPhoto.evaluate((image: HTMLImageElement) => image.complete && image.naturalHeight > image.naturalWidth)).toBe(true);
  await expect(revealPhoto).toHaveAttribute('src', /warden-evidence-photo\.webp$/);
  await page.reload(); await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(revealPhoto).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open the evidence envelope', exact: true })).toHaveCount(0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save certificate PNG', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('the-fifth-season-certificate.png');
  const destination = testInfo.outputPath('certificate.png');
  await download.saveAs(destination);
  const png = await readFile(destination);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(1800); expect(png.readUInt32BE(20)).toBe(1200);
  expect(png.length).toBeGreaterThan(100000);

});

test('gallery radio controls allow one choice per portrait and validate only the full combination', async ({ page }) => {
  await begin(page);
  await page.getByLabel('Seven-character keypad').fill('FREEDOM');
  await page.getByRole('button', { name: 'Try the lock' }).click();
  await enter(page, 'Seasonal Gallery');
  await page.getByRole('button', { name: 'Return the names' }).click();
  await expect(page.getByText('One or more witnesses still lack their name.', { exact: true })).toBeVisible();
  await expect(page.locator('.lens-grid')).toHaveCount(0);
  const descriptions = ['She holds the first flowers', 'She stands amid wheat and poppies', 'She carries a basket of fruit', 'She shelters under snow-covered boughs'];
  for (const [index, name] of ['spring', 'summer', 'autumn', 'winter'].entries()) await page.getByLabel(`Name for ${descriptions[index]}`, { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Return the names' }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Examine the artist’s lens' }).focus();
  await page.keyboard.press('Enter');
  const group = page.getByRole('radiogroup', { name: 'Portrait 1 lens locations' });
  await group.getByRole('radio').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio').nth(1)).toBeChecked();
  await page.keyboard.press('ArrowRight');
  await expect(group.getByRole('radio').nth(2)).toBeChecked();
  await expect(group.locator('[aria-checked=true]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Turn the four catches' }).click();
  await expect(page.getByText('The drawer remains shut. The witnesses have not all been heard.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Enter Four-Day Calendar/ })).toHaveCount(0);
  await page.reload(); await page.getByRole('button', { name: /Continue case/ }).click();
  await expect(page.getByRole('radiogroup', { name: 'Portrait 1 lens locations' }).getByRole('radio').nth(2)).toBeChecked();
  await assertNoClipping(page, '.witness-testimony');
  await assertNoClipping(page, '.lens-portrait');
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});
