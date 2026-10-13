import { expect, test, type Page } from '@playwright/test';
import { createInitialState } from '../src/game/state';
import type { GameState, PuzzleId, RoomId } from '../src/game/types';

type Probe = { contexts: AudioContext[]; sources: number; cues: string[] };
const sequence: PuzzleId[] = ['gate', 'seasons', 'calendar', 'cipher', 'photo', 'clocks', 'postal', 'final'];
const descriptions = ['She holds the first flowers', 'She stands amid wheat and poppies', 'She carries a basket of fruit', 'She shelters under snow-covered boughs'];
type Attempt = { name: string; puzzle: PuzzleId; room: RoomId; cue: string; button: string; prepare?: (state: GameState) => void; input?: (page: Page) => Promise<void> };
const attempts: Attempt[] = [
  { name: 'gate lock', puzzle: 'gate', room: 'gate', cue: 'failLock', button: 'Try the lock', input: async (page) => { await page.getByLabel('Seven-character keypad').fill('WRONG'); } },
  { name: 'witness names', puzzle: 'seasons', room: 'gallery', cue: 'failWitness', button: 'Return the names', input: async (page) => { await page.getByLabel(`Name for ${descriptions[0]}`, { exact: true }).fill('Unknown'); } },
  { name: 'lens combination', puzzle: 'seasons', room: 'gallery', cue: 'failLens', button: 'Turn the four catches', prepare: (state) => { state.witnessesSolved = true; state.lensRevealed = true; state.witnessAnswers = [...state.galleryLayout]; state.seasonOrder = [...state.galleryLayout]; } },
  { name: 'calendar catches', puzzle: 'calendar', room: 'calendar', cue: 'failCalendar', button: 'Set the calendar' },
  { name: 'cipher gears', puzzle: 'cipher', room: 'cipherDesk', cue: 'failCipher', button: 'Open the note', input: async (page) => { await page.getByLabel('Submit decoded word').fill('WRONG'); } },
  { name: 'cabinet latches', puzzle: 'photo', room: 'memoryCabinet', cue: 'failCabinet', button: 'Turn both latches', input: async (page) => { await page.getByLabel('Date key').fill('99'); await page.getByLabel('Decoded word').fill('WRONG'); } },
  { name: 'discordant clocks', puzzle: 'clocks', room: 'clockTower', cue: 'failClocks', button: 'Synchronize clocks' },
  { name: 'postal sorting lever', puzzle: 'postal', room: 'postalArchive', cue: 'failPostal', button: 'Pull the sorting lever' },
  { name: 'postal stamp', puzzle: 'postal', room: 'postalArchive', cue: 'failPostal', button: 'Stamp archive number', prepare: (state) => { state.postal = { recipient: '11101', sender: '400050', routed: true, code: '99' }; } },
  { name: 'partner key', puzzle: 'final', room: 'finalGallery', cue: 'failFinal', button: 'Turn the first key', input: async (page) => { await page.getByLabel('Sender-held challenge phrase').fill('WRONG'); } },
  { name: 'final cipher lock', puzzle: 'final', room: 'finalGallery', cue: 'failFinal', button: 'Open the fifth frame', prepare: (state) => { state.partnerPhraseAccepted = true; }, input: async (page) => { await page.getByLabel('Final decoded word').fill('WRONG'); } },
];

for (const attempt of attempts) test(`${attempt.name} plays its themed failure effect without advancing`, async ({ page, browserName }) => {
  const nativeAudio = !(browserName === 'webkit' && process.platform === 'win32');
  const state = createInitialState(); state.activeRoom = attempt.room;
  for (const puzzle of sequence.slice(0, sequence.indexOf(attempt.puzzle))) state.solved[puzzle] = true;
  state.inventory = ['Brass Key · 26']; attempt.prepare?.(state);
  await page.addInitScript((saved) => {
    localStorage.setItem('the-fifth-season:v1', JSON.stringify(saved));
    localStorage.setItem('the-fifth-season:audio:v1', JSON.stringify({ muted: false, music: 0, effects: 0.9 }));
    const probe: Probe = { contexts: [], sources: 0, cues: [] };
    (window as unknown as { failureProbe: Probe }).failureProbe = probe;
    const Original = window.AudioContext;
    if (Original) window.AudioContext = class extends Original {
      constructor() { super(); probe.contexts.push(this); }
      createOscillator() { probe.sources++; return super.createOscillator(); }
      createBufferSource() { probe.sources++; return super.createBufferSource(); }
    };
  }, state);
  await page.goto('./');
  await page.evaluate(async () => {
    const path = '/src/audio/engine.ts'; const { GameAudio } = await import(path);
    const original = GameAudio.prototype.play;
    GameAudio.prototype.play = function (cue: string) {
      (window as unknown as { failureProbe: Probe }).failureProbe.cues.push(cue);
      return original.call(this, cue);
    };
  });
  await page.getByRole('button', { name: /Continue case/ }).click();
  if (nativeAudio) await expect.poll(() => page.evaluate(() => (window as unknown as { failureProbe: Probe }).failureProbe.contexts[0]?.state)).toBe('running');
  await attempt.input?.(page);
  const before = await page.evaluate(() => (window as unknown as { failureProbe: Probe }).failureProbe.sources);
  await page.getByRole('button', { name: attempt.button, exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { failureProbe: Probe }).failureProbe.cues)).toContain(attempt.cue);
  if (nativeAudio) await expect.poll(() => page.evaluate(() => (window as unknown as { failureProbe: Probe }).failureProbe.sources)).toBeGreaterThan(before);
  await expect(page.locator('.main-content [role=status]').filter({ hasText: /refuses|lack|remains shut|Check|not the one|cabinet needs|not yet|reversed|stamp needs|missing direction|lock waits/i })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('the-fifth-season:v1')!));
  expect(saved.activeRoom).toBe(attempt.room); expect(saved.solved[attempt.puzzle]).toBe(false);
});
