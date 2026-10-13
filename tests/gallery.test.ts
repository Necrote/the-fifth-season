import { describe, expect, it } from 'vitest';
import { numberedAnchors } from '../src/components/ArtistLens';
import { PUZZLE_DEFINITIONS, SEASONS } from '../src/game/puzzles';
import { createInitialState, gameReducer, loadState } from '../src/game/state';

function openedGallery() {
  return gameReducer(gameReducer(createInitialState(1000), { type: 'SOLVE', puzzle: 'gate' }), { type: 'NAVIGATE', room: 'gallery' });
}

describe('staged gallery lock', () => {
  it('locks the lens until correct names are explicitly confirmed', () => {
    const initial = openedGallery();
    expect(gameReducer(initial, { type: 'REVEAL_LENS' })).toBe(initial);
    expect(gameReducer(initial, { type: 'SELECT_OVERLAY', season: 'spring', anchor: 'spring-bouquet' })).toBe(initial);
    expect(gameReducer(initial, { type: 'CONFIRM_WITNESSES' })).toBe(initial);
    const typed = gameReducer(initial, { type: 'SET_WITNESS_ANSWERS', answers: initial.galleryLayout.map((name) => name.toUpperCase()) });
    expect(typed.witnessesSolved).toBe(false);
    const confirmed = gameReducer(typed, { type: 'CONFIRM_WITNESSES' });
    expect(confirmed.witnessesSolved).toBe(true); expect(confirmed.lensRevealed).toBe(false);
    expect(confirmed.solved.seasons).toBe(false); expect(confirmed.inventory).toContain("Artist's Lens");
    expect(gameReducer(confirmed, { type: 'CONFIRM_WITNESSES' })).toBe(confirmed);
    const revealed = gameReducer(confirmed, { type: 'REVEAL_LENS' });
    expect(revealed.lensRevealed).toBe(true);
    expect(gameReducer(revealed, { type: 'SELECT_OVERLAY', season: 'spring', anchor: 'spring-bouquet' }).overlaySelections.spring).toBe('spring-bouquet');
  });
  it('replaces the selected location instead of selecting several in one portrait', () => {
    let state = openedGallery();
    state = gameReducer(state, { type: 'SET_WITNESS_ANSWERS', answers: [...state.galleryLayout] });
    state = gameReducer(gameReducer(state, { type: 'CONFIRM_WITNESSES' }), { type: 'REVEAL_LENS' });
    state = gameReducer(state, { type: 'SELECT_OVERLAY', season: 'winter', anchor: 'winter-bough' });
    state = gameReducer(state, { type: 'SELECT_OVERLAY', season: 'winter', anchor: 'winter-cloak' });
    expect(state.overlaySelections).toEqual({ winter: 'winter-cloak' });
  });
  it('saves the names, lens visibility, independent hints and partial combination', () => {
    let state = openedGallery();
    state = gameReducer(state, { type: 'SET_WITNESS_ANSWERS', answers: [...state.galleryLayout] });
    state = gameReducer(gameReducer(state, { type: 'CONFIRM_WITNESSES' }), { type: 'REVEAL_LENS' });
    state = gameReducer(state, { type: 'REQUEST_LENS_HINT' });
    state = gameReducer(state, { type: 'SELECT_OVERLAY', season: 'winter', anchor: 'winter-cloak' });
    expect(loadState({ getItem: () => JSON.stringify(state) })).toEqual(state);
    expect(state.hintLevels.seasons ?? 0).toBe(0); expect(state.lensHintLevel).toBe(1);
  });
  it('migrates completed plaque-based cases without relocking the lens', () => {
    const old = { ...openedGallery(), witnessAnswers: undefined, witnessesSolved: undefined, lensRevealed: undefined, lensHintLevel: undefined, seasonOrder: [...SEASONS], galleryLayout: undefined, solved: { ...openedGallery().solved, seasons: true } };
    const restored = loadState({ getItem: () => JSON.stringify(old) });
    expect(restored?.witnessesSolved).toBe(true); expect(restored?.lensRevealed).toBe(true);
    expect(restored?.witnessAnswers).toEqual(restored?.galleryLayout); expect(restored?.lensHintLevel).toBe(0);
  });
});

describe('continuous location numbers', () => {
  it('numbers all sixteen distinct locations in current portrait order, retaining calibrated IDs', () => {
    const layout = ['autumn', 'spring', 'summer', 'winter'] as const;
    const locations = numberedAnchors(layout);
    expect(locations.map((anchor) => anchor.number)).toEqual(Array.from({ length: 16 }, (_, index) => index + 1));
    expect(locations.slice(0, 4).every((anchor) => anchor.season === 'autumn')).toBe(true);
    expect(locations.slice(12).every((anchor) => anchor.season === 'winter')).toBe(true);
    for (const season of SEASONS) expect(locations.some((anchor) => anchor.id === PUZZLE_DEFINITIONS.seasons.anchors[season])).toBe(true);
    expect(locations.find((anchor) => anchor.id === 'winter-bough')).toMatchObject({ x: 51, y: 12 });
  });
});
