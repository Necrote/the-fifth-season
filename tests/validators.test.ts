import { describe, expect, it } from 'vitest';
import { caesarDecode, caesarEncode, deriveArchiveCode, validatePartnerPhrase, validatePuzzle, witnessNamesMatch } from '../src/game/validators';
import { createInitialState } from '../src/game/state';
import { PUZZLE_DEFINITIONS } from '../src/game/puzzles';

describe('canonical puzzle validators', () => {
  it('accepts FREEDOM case-insensitively with surrounding whitespace', () => {
    expect(validatePuzzle('gate', '  FreeDom  ').ok).toBe(true);
    expect(validatePuzzle('gate', 'prison').ok).toBe(false);
  });
  it('requires natural season order and all named artwork anchors', () => {
    expect(validatePuzzle('seasons', { order: ['spring', 'summer', 'autumn', 'winter'], selections: { spring: 'spring-bouquet', summer: 'summer-wheat', autumn: 'autumn-fruit', winter: 'winter-bough' } }).ok).toBe(true);
  });
  it('maps the four intervals in season order', () => {
    expect(validatePuzzle('calendar', ['spring', 'summer', 'autumn', 'winter']).ok).toBe(true);
  });
  it('verifies both cipher strings and direction', () => {
    expect(caesarEncode('PHOTO', 4)).toBe('TLSXS');
    expect(caesarDecode('TLSXS', 4)).toBe('PHOTO');
    expect(caesarEncode('TOGETHER', 4)).toBe('XSKIXLIV');
    expect(caesarDecode('XSKIXLIV', 4)).toBe('TOGETHER');
    expect(caesarEncode('TOGETHER', 23)).toBe('QLDBQEBO');
    expect(caesarDecode(PUZZLE_DEFINITIONS.final.ciphertext, 23)).toBe('TOGETHER');
    expect(validatePuzzle('cipher', { shift: 4, decoded: 'photo' }).ok).toBe(true);
  });
  it('requires the calendar key to open the photo cabinet', () => {
    const state = createInitialState();
    expect(validatePuzzle('photo', { dateKey: '26', wordKey: 'PHOTO' }, state).ok).toBe(false);
    state.inventory.push('Brass Key · 26');
    expect(validatePuzzle('photo', { dateKey: '26', wordKey: 'PHOTO' }, state).ok).toBe(true);
  });
  it('derives 23 from distinct postal-code digits', () => {
    expect(deriveArchiveCode('11101', '400050')).toBe('23');
    expect(validatePuzzle('postal', { recipient: '11101', sender: '400050', code: '23' }).ok).toBe(true);
    expect(validatePuzzle('postal', { recipient: '11101', sender: '400050', code: '' }).ok).toBe(false);
  });
  it('validates the sender-held phrase', () => {
    expect(validatePartnerPhrase(' same   team ')).toBe(true);
    expect(validatePartnerPhrase('together')).toBe(false);
  });
  it('matches each shuffled witness independently of position', () => {
    const state = createInitialState();
    state.galleryLayout = ['winter', 'spring', 'autumn', 'summer'];
    state.witnessesSolved = true;
    const selections = PUZZLE_DEFINITIONS.seasons.anchors;
    expect(validatePuzzle('seasons', { order: state.galleryLayout, selections }, state).ok).toBe(true);
    expect(validatePuzzle('seasons', { order: ['spring', 'summer', 'autumn', 'winter'], selections }, state).ok).toBe(false);
  });
  it('requires archive shift 23 and accepts the saved partner half of the lock', () => {
    const state = createInitialState();
    expect(validatePuzzle('final', { decoded: 'TOGETHER', shift: 23 }, state).ok).toBe(false);
    state.partnerPhraseAccepted = true;
    expect(validatePuzzle('final', { decoded: 'TOGETHER', shift: 4 }, state).ok).toBe(false);
    expect(validatePuzzle('final', { decoded: 'TOGETHER', shift: 23 }, state).ok).toBe(true);
  });
  it('accepts typed painting names and full printed titles without supplying options', () => {
    const layout = ['winter', 'spring', 'autumn', 'summer'] as const;
    expect(witnessNamesMatch([' Winter ', 'SPRING', 'The Seasons: Autumn / 1900', 'summer'], layout)).toBe(true);
    expect(witnessNamesMatch(['Spring', 'Winter', 'Autumn', 'Summer'], layout)).toBe(false);
    expect(witnessNamesMatch(['winter', 'spring'], layout)).toBe(false);
  });
  it('requires the unnamed witnesses before accepting the full lens combination', () => {
    const state = createInitialState(); const answer = { order: state.galleryLayout, selections: PUZZLE_DEFINITIONS.seasons.anchors };
    expect(validatePuzzle('seasons', answer, state).ok).toBe(false);
    state.witnessesSolved = true;
    expect(validatePuzzle('seasons', answer, state).ok).toBe(true);
    expect(validatePuzzle('seasons', { ...answer, selections: { ...answer.selections, winter: 'winter-cloak' } }, state).ok).toBe(false);
  });
});
