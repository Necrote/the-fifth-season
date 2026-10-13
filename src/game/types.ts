export const puzzleIds = ['gate', 'seasons', 'calendar', 'cipher', 'photo', 'clocks', 'postal', 'final'] as const;
export type PuzzleId = (typeof puzzleIds)[number];

export const roomIds = ['gate', 'gallery', 'calendar', 'cipherDesk', 'memoryCabinet', 'clockTower', 'postalArchive', 'finalGallery', 'reveal'] as const;
export type RoomId = (typeof roomIds)[number];
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface ClockState {
  nyDate: string;
  nyTime: string;
  nyPeriod: 'AM' | 'PM';
  mumDate: string;
  mumTime: string;
  mumPeriod: 'AM' | 'PM';
}

export interface GameState {
  schemaVersion: 1;
  startedAt: number;
  elapsedMs: number;
  activeRoom: RoomId;
  solved: Record<PuzzleId, boolean>;
  inventory: string[];
  seasonOrder: (Season | null)[];
  galleryLayout: Season[];
  witnessAnswers: string[];
  witnessesSolved: boolean;
  lensRevealed: boolean;
  lensHintLevel: number;
  calendarSlots: (Season | null)[];
  overlaySelections: Partial<Record<Season, string>>;
  cipherShift: number;
  cipherInput: string;
  finalCipherShift: number;
  postal: { recipient: string; sender: string; routed: boolean; code: string };
  clocks: ClockState;
  hintLevels: Partial<Record<PuzzleId, number>>;
  partnerPhraseAccepted: boolean;
  evidenceEnvelopeOpened: boolean;
  completedAt?: number;
}

export interface ValidationResult {
  ok: boolean;
  feedback: string;
  unlocks: string[];
}
