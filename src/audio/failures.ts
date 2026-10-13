import type { PuzzleId } from '../game/types';
import type { SoundCue } from './score';

export const FAILURE_CUES: Record<PuzzleId, SoundCue> = {
  gate: 'failLock', seasons: 'failLens', calendar: 'failCalendar', cipher: 'failCipher',
  photo: 'failCabinet', clocks: 'failClocks', postal: 'failPostal', final: 'failFinal',
};
