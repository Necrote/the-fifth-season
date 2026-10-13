import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer, getUnlockedRooms, loadState, saveState, STORAGE_KEY } from '../src/game/state';
import { SEASONS, shuffleSeasons } from '../src/game/puzzles';

describe('game progression and persistence', () => {
  it('continues in memory when reading or writing storage is blocked', () => {
    const blocked = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(loadState(blocked)).toBeNull();
    expect(saveState(createInitialState(), blocked)).toBe(false);
    expect(saveState(createInitialState(), { setItem: () => {} })).toBe(true);
  });
  it('unlocks rooms idempotently and preserves inventory', () => {
    let state = createInitialState(1000);
    state = gameReducer(state, { type: 'SOLVE', puzzle: 'gate', at: 2000 });
    const once = state;
    state = gameReducer(state, { type: 'SOLVE', puzzle: 'gate', at: 3000 });
    expect(state).toBe(once);
    expect(state.inventory.filter((item) => item === 'Case File')).toHaveLength(1);
    expect(getUnlockedRooms(state)).toEqual(['gate', 'gallery']);
  });
  it('round-trips saved progress', () => {
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    const progressed = gameReducer(createInitialState(1000), { type: 'SOLVE', puzzle: 'gate', at: 2000 });
    saveState(progressed, storage);
    expect(loadState(storage)?.activeRoom).toBe('gate');
    expect(loadState(storage)?.inventory).toContain('Case File');
  });
  it('never starts with chronological portraits and preserves the arrangement on reload', () => {
    for (const random of [() => 0, () => .5, () => .99]) {
      const layout = shuffleSeasons(random);
      expect([...layout].sort()).toEqual([...SEASONS].sort());
      expect(layout).not.toEqual(SEASONS);
    }
    const state = createInitialState();
    const storage = { getItem: () => JSON.stringify(state) };
    expect(loadState(storage)?.galleryLayout).toEqual(state.galleryLayout);
    expect(state.calendarSlots).toEqual([null, null, null, null]);
  });
  it('shows newly recovered evidence before navigating, including the archive ticket', () => {
    let state = createInitialState(1000);
    const steps = ['gate', 'seasons', 'calendar', 'cipher', 'photo', 'clocks', 'postal'] as const;
    const rooms = ['gate', 'gallery', 'calendar', 'cipherDesk', 'memoryCabinet', 'clockTower', 'postalArchive', 'finalGallery'] as const;
    for (let index = 0; index < steps.length; index += 1) {
      state = gameReducer(state, { type: 'SOLVE', puzzle: steps[index], at: 2000 });
      expect(state.activeRoom).toBe(rooms[index]);
      expect(getUnlockedRooms(state)).toContain(rooms[index + 1]);
      if (steps[index] === 'photo') expect(state.inventory).toContain('Sealed Photograph');
      if (steps[index] === 'postal') expect(state.inventory).toContain('Archive Code · 23');
      state = gameReducer(state, { type: 'NAVIGATE', room: rooms[index + 1] });
    }
  });
  it('retains routing tickets and final wheel progress after saving', () => {
    const state = createInitialState();
    state.postal = { recipient: '11101', sender: '400050', routed: true, code: '23' };
    state.partnerPhraseAccepted = true;
    state.finalCipherShift = 23;
    const restored = loadState({ getItem: () => JSON.stringify(state) });
    expect(restored?.postal).toEqual(state.postal);
    expect(restored?.partnerPhraseAccepted).toBe(true);
    expect(restored?.finalCipherShift).toBe(23);
  });
  it('migrates earlier saves without exposing the photograph or resetting progress', () => {
    const old = { ...createInitialState(), galleryLayout: undefined, seasonOrder: ['spring', 'summer', 'autumn', 'winter'], inventory: ['Escape Photo'] };
    const restored = loadState({ getItem: (key) => key === STORAGE_KEY ? JSON.stringify(old) : null });
    expect(restored?.galleryLayout).not.toEqual(SEASONS);
    expect(restored?.seasonOrder).toEqual(restored?.galleryLayout);
    expect(restored?.inventory).toEqual(['Sealed Photograph']);
  });
});
