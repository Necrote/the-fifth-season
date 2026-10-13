import { NEXT_ROOM, PUZZLE_DEFINITIONS, ROOM_PUZZLES, SOLVE_UNLOCKS, UNLOCK_SEQUENCE, shuffleSeasons, SEASONS } from './puzzles';
import type { GameState, PuzzleId, RoomId, Season } from './types';
import { witnessNamesMatch } from './validators';

export const STORAGE_KEY = 'the-fifth-season:v1';
const emptySolved = (): GameState['solved'] => ({ gate: false, seasons: false, calendar: false, cipher: false, photo: false, clocks: false, postal: false, final: false });

export function createInitialState(now = Date.now()): GameState {
  return {
    schemaVersion: 1, startedAt: now, elapsedMs: 0, activeRoom: 'gate', solved: emptySolved(), inventory: [],
    seasonOrder: [null, null, null, null], overlaySelections: {}, cipherShift: 0, cipherInput: '',
    galleryLayout: shuffleSeasons(), calendarSlots: [null, null, null, null], finalCipherShift: 0,
    witnessAnswers: ['', '', '', ''], witnessesSolved: false, lensRevealed: false, lensHintLevel: 0,
    postal: { recipient: '', sender: '', routed: false, code: '' },
    clocks: { nyDate: '', nyTime: '12:00', nyPeriod: 'AM', mumDate: '', mumTime: '12:00', mumPeriod: 'AM' },
    hintLevels: {}, partnerPhraseAccepted: false, evidenceEnvelopeOpened: false,
  };
}

export type GameAction =
  | { type: 'NAVIGATE'; room: RoomId } | { type: 'SOLVE'; puzzle: PuzzleId; at?: number }
  | { type: 'SET_SEASON_ORDER'; order: (Season | null)[] } | { type: 'SELECT_OVERLAY'; season: Season; anchor: string }
  | { type: 'SET_CIPHER'; shift?: number; input?: string } | { type: 'SET_CLOCKS'; clocks: GameState['clocks'] }
  | { type: 'SET_CALENDAR'; slots: GameState['calendarSlots'] }
  | { type: 'SET_FINAL_SHIFT'; shift: number }
  | { type: 'SET_WITNESS_ANSWERS'; answers: string[] } | { type: 'CONFIRM_WITNESSES' }
  | { type: 'REVEAL_LENS' } | { type: 'REQUEST_LENS_HINT' }
  | { type: 'SET_POSTAL'; postal: GameState['postal'] }
  | { type: 'REQUEST_HINT'; puzzle: PuzzleId } | { type: 'ACCEPT_PARTNER_PHRASE' }
  | { type: 'OPEN_EVIDENCE_ENVELOPE' }
  | { type: 'TICK'; now: number } | { type: 'RESET'; now?: number };

const unique = (values: string[]) => [...new Set(values)];
export function getUnlockedRooms(state: GameState): RoomId[] {
  const rooms: RoomId[] = ['gate'];
  for (let i = 0; i < UNLOCK_SEQUENCE.length - 1; i += 1) {
    const puzzle = ROOM_PUZZLES[UNLOCK_SEQUENCE[i]];
    if (puzzle && state.solved[puzzle]) rooms.push(UNLOCK_SEQUENCE[i + 1]); else break;
  }
  return rooms;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NAVIGATE': return getUnlockedRooms(state).includes(action.room) ? { ...state, activeRoom: action.room } : state;
    case 'SOLVE': { if (state.solved[action.puzzle]) return state;
      const at = action.at ?? Date.now(); const completed = action.puzzle === 'final';
      const completedRoom = UNLOCK_SEQUENCE.find((room) => ROOM_PUZZLES[room] === action.puzzle)!;
      if (!getUnlockedRooms(state).includes(completedRoom)) return state;
      return { ...state, solved: { ...state.solved, [action.puzzle]: true }, inventory: unique([...state.inventory, ...SOLVE_UNLOCKS[action.puzzle]]), activeRoom: completed ? NEXT_ROOM[action.puzzle] : state.activeRoom, elapsedMs: Math.max(state.elapsedMs, at - state.startedAt), ...(completed ? { completedAt: at } : {}), ...(action.puzzle === 'seasons' ? { witnessesSolved: true, lensRevealed: true, witnessAnswers: [...state.galleryLayout], seasonOrder: [...state.galleryLayout] } : {}) };
    }
    case 'SET_SEASON_ORDER': return { ...state, seasonOrder: action.order };
    case 'SELECT_OVERLAY': return state.witnessesSolved && state.lensRevealed ? { ...state, overlaySelections: { ...state.overlaySelections, [action.season]: action.anchor } } : state;
    case 'SET_WITNESS_ANSWERS': return state.witnessesSolved ? state : { ...state, witnessAnswers: action.answers };
    case 'CONFIRM_WITNESSES': return state.witnessesSolved || !getUnlockedRooms(state).includes('gallery') || !witnessNamesMatch(state.witnessAnswers, state.galleryLayout) ? state : { ...state, witnessesSolved: true, seasonOrder: [...state.galleryLayout], inventory: unique([...state.inventory, "Artist's Lens"]) };
    case 'REVEAL_LENS': return state.witnessesSolved ? { ...state, lensRevealed: true } : state;
    case 'REQUEST_LENS_HINT': return state.witnessesSolved ? { ...state, lensHintLevel: Math.min(state.lensHintLevel + 1, PUZZLE_DEFINITIONS.seasons.lensHints.length) } : state;
    case 'SET_CIPHER': return { ...state, cipherShift: action.shift ?? state.cipherShift, cipherInput: action.input ?? state.cipherInput };
    case 'SET_CALENDAR': return { ...state, calendarSlots: action.slots };
    case 'SET_FINAL_SHIFT': return { ...state, finalCipherShift: action.shift };
    case 'SET_POSTAL': return { ...state, postal: action.postal };
    case 'SET_CLOCKS': return { ...state, clocks: action.clocks };
    case 'REQUEST_HINT': { const max = action.puzzle === 'final' && !state.partnerPhraseAccepted ? 2 : PUZZLE_DEFINITIONS[action.puzzle].hints.length;
      return { ...state, hintLevels: { ...state.hintLevels, [action.puzzle]: Math.min((state.hintLevels[action.puzzle] ?? 0) + 1, max) } };
    }
    case 'ACCEPT_PARTNER_PHRASE': return { ...state, partnerPhraseAccepted: true };
    case 'OPEN_EVIDENCE_ENVELOPE': return state.solved.final && state.activeRoom === 'reveal' && !state.evidenceEnvelopeOpened ? { ...state, evidenceEnvelopeOpened: true } : state;
    case 'TICK': return state.completedAt ? state : { ...state, elapsedMs: Math.max(state.elapsedMs, action.now - state.startedAt) };
    case 'RESET': return createInitialState(action.now);
  }
}

export function saveState(state: GameState, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function loadState(storage?: Pick<Storage, 'getItem'>): GameState | null {
  try {
    const raw = (storage ?? localStorage).getItem(STORAGE_KEY); if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (parsed.schemaVersion !== 1 || !parsed.solved || !parsed.activeRoom) return null;
    const state = { ...createInitialState(parsed.startedAt), ...parsed } as GameState;
    // Older saves indexed season labels chronologically. Keep existing progress usable.
    if (!parsed.galleryLayout) {
      state.galleryLayout = shuffleSeasons();
      state.seasonOrder = state.galleryLayout.map((season) => parsed.seasonOrder?.[SEASONS.indexOf(season)] ?? null);
    }
    state.inventory = state.inventory.map((item) => item === 'Escape Photo' ? 'Sealed Photograph' : item);
    // Preserve names and completed galleries from the earlier plaque-based version.
    if (parsed.witnessAnswers === undefined) state.witnessAnswers = state.seasonOrder.map((season) => season ?? '');
    if (parsed.witnessesSolved === undefined) state.witnessesSolved = state.solved.seasons || witnessNamesMatch(state.witnessAnswers, state.galleryLayout);
    if (parsed.lensRevealed === undefined) state.lensRevealed = state.witnessesSolved;
    return state;
  } catch { return null; }
}
