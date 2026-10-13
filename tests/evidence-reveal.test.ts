import { describe, expect, it } from 'vitest';
import { createInitialState, gameReducer, loadState } from '../src/game/state';

describe('final evidence envelope', () => {
  it('opens only after completion, only in the ending, and only once', () => {
    const initial = createInitialState();
    expect(gameReducer(initial, { type: 'OPEN_EVIDENCE_ENVELOPE' })).toBe(initial);
    const complete = { ...initial, activeRoom: 'reveal' as const, solved: { ...initial.solved, final: true } };
    const elsewhere = { ...complete, activeRoom: 'gallery' as const };
    expect(gameReducer(elsewhere, { type: 'OPEN_EVIDENCE_ENVELOPE' })).toBe(elsewhere);
    const opened = gameReducer(complete, { type: 'OPEN_EVIDENCE_ENVELOPE' });
    expect(opened.evidenceEnvelopeOpened).toBe(true);
    expect(gameReducer(opened, { type: 'OPEN_EVIDENCE_ENVELOPE' })).toBe(opened);
    expect(loadState({ getItem: () => JSON.stringify(opened) })?.evidenceEnvelopeOpened).toBe(true);
    expect(gameReducer(opened, { type: 'RESET' }).evidenceEnvelopeOpened).toBe(false);
  });
  it('adds a closed envelope to older completed saves without clearing the case', () => {
    const old = { ...createInitialState(), activeRoom: 'reveal', solved: { ...createInitialState().solved, final: true }, completedAt: 123456, evidenceEnvelopeOpened: undefined };
    const loaded = loadState({ getItem: () => JSON.stringify(old) });
    expect(loaded?.evidenceEnvelopeOpened).toBe(false); expect(loaded?.completedAt).toBe(123456);
    expect(loaded?.solved.final).toBe(true);
  });
});
