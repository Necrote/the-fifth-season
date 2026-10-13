import type { GameState, PuzzleId } from '../game/types';
import type { SoundCue } from './score';

const discoveries: Record<PuzzleId, SoundCue> = { gate: 'latch', seasons: 'drawer', calendar: 'key', cipher: 'paper', photo: 'cabinet', clocks: 'bell', postal: 'stamp', final: 'latch' };
const differs = (a: unknown, b: unknown) => JSON.stringify(a) !== JSON.stringify(b);

export function gameSound(previous: GameState, next: GameState): SoundCue | null {
  if (previous.startedAt !== next.startedAt) return null;
  for (const id of Object.keys(discoveries) as PuzzleId[]) if (!previous.solved[id] && next.solved[id]) return discoveries[id];
  if (!previous.evidenceEnvelopeOpened && next.evidenceEnvelopeOpened) return 'reveal';
  if (!previous.witnessesSolved && next.witnessesSolved) return 'latch';
  if (!previous.lensRevealed && next.lensRevealed) return 'paper';
  if (!previous.partnerPhraseAccepted && next.partnerPhraseAccepted) return 'latch';
  if (!previous.postal.routed && next.postal.routed) return 'paper';
  if (previous.cipherShift !== next.cipherShift || previous.finalCipherShift !== next.finalCipherShift || differs(previous.clocks, next.clocks) || differs(previous.postal, next.postal)) return 'tick';
  if (differs(previous.calendarSlots, next.calendarSlots) || differs(previous.seasonOrder, next.seasonOrder)) return 'click';
  if (differs(previous.overlaySelections, next.overlaySelections)) return 'click';
  if (previous.activeRoom !== next.activeRoom || differs(previous.hintLevels, next.hintLevels) || previous.lensHintLevel !== next.lensHintLevel) return 'paper';
  return null;
}
