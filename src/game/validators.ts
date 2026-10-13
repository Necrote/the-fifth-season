import { PUZZLE_DEFINITIONS, SEASONS, SOLVE_UNLOCKS } from './puzzles';
import type { ClockState, GameState, PuzzleId, Season, ValidationResult } from './types';

export const normalizeAnswer = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();

export function witnessNamesMatch(answers: readonly string[], layout: readonly Season[]): boolean {
  const paintingName = (answer: string) => normalizeAnswer(answer).replace(/^THE SEASONS\s*[:·–-]?\s*/, '').replace(/\s*\/\s*1900$/, '');
  return answers.length === layout.length && layout.every((season, index) => paintingName(answers[index]) === season.toUpperCase());
}

export function caesarEncode(value: string, shift: number): string {
  const normalizedShift = ((shift % 26) + 26) % 26;
  return value.toUpperCase().replace(/[A-Z]/g, (letter) =>
    String.fromCharCode(((letter.charCodeAt(0) - 65 + normalizedShift) % 26) + 65));
}
export const caesarDecode = (value: string, shift: number) => caesarEncode(value, -shift);
export const distinctDigitCount = (value: string) => new Set(value.split('')).size;
export const deriveArchiveCode = (recipient: string, sender: string) => `${distinctDigitCount(recipient)}${distinctDigitCount(sender)}`;
export const postalRouteMatches = (recipient: string, sender: string) => recipient.trim() === PUZZLE_DEFINITIONS.postal.recipient && sender.trim() === PUZZLE_DEFINITIONS.postal.sender;

export function clockAnswersMatch(clocks: ClockState): boolean {
  const expected = PUZZLE_DEFINITIONS.clocks;
  return clocks.nyDate === expected.nyDate && clocks.nyTime.replace(/^0/, '') === expected.nyTime && clocks.nyPeriod === expected.nyPeriod
    && clocks.mumDate === expected.mumDate && clocks.mumTime.replace(/^0/, '') === expected.mumTime && clocks.mumPeriod === expected.mumPeriod;
}

export function convertNewYorkToMumbai(date: string, time24: string): { date: string; time: string } {
  const instant = new Date(`${date}T${time24}:00-04:00`);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function result(ok: boolean, success: string, failure: string, id: PuzzleId): ValidationResult {
  return { ok, feedback: ok ? success : failure, unlocks: ok ? [...SOLVE_UNLOCKS[id]] : [] };
}

export type PuzzleAnswers = {
  gate: string;
  seasons: { order: (Season | null)[]; selections: Partial<Record<Season, string>> };
  calendar: (Season | null)[];
  cipher: { shift: number; decoded: string };
  photo: { dateKey: string; wordKey: string };
  clocks: ClockState;
  postal: { recipient: string; sender: string; code?: string };
  final: { phrase?: string; decoded: string; shift: number };
};

export function validatePuzzle<K extends PuzzleId>(id: K, answer: PuzzleAnswers[K], state?: GameState): ValidationResult {
  switch (id) {
    case 'gate':
      return result(normalizeAnswer(answer as string) === 'FREEDOM', 'The gate unlatches.', 'The lock refuses the word. Check the seven beginnings.', id);
    case 'seasons': { const value = answer as PuzzleAnswers['seasons'];
      const ordered = (state?.galleryLayout ?? SEASONS).every((season, index) => value.order[index] === season);
      const selected = SEASONS.every((season) => value.selections[season] === PUZZLE_DEFINITIONS.seasons.anchors[season]);
      return result(ordered && selected && (!state || state.witnessesSolved), 'The four catches turn. The drawer opens.', 'The drawer remains shut. The witnesses have not all been heard.', id);
    }
    case 'calendar': { const value = answer as PuzzleAnswers['calendar'];
      return result(SEASONS.every((season, index) => value[index] === season), 'The center seam illuminates OCT 26.', 'Four passages separate the birthdays. Check their order.', id);
    }
    case 'cipher': { const value = answer as PuzzleAnswers['cipher'];
      return result(value.shift === 4 && normalizeAnswer(value.decoded) === 'PHOTO', 'The note reads PHOTO. The cabinet answers.', 'The wheel is close, but the submitted word is not the one on the note.', id);
    }
    case 'photo': { const value = answer as PuzzleAnswers['photo'];
      const hasKey = !state || state.inventory.includes('Brass Key · 26');
      return result(hasKey && normalizeAnswer(value.dateKey) === '26' && normalizeAnswer(value.wordKey) === 'PHOTO', 'Both latches turn. The evidence is returned.', 'The cabinet needs the calendar key and the word from the cipher desk.', id);
    }
    case 'clocks': return result(clockAnswersMatch(answer as ClockState), 'The hands chime together. The Postal Archive opens.', 'These dials do not yet show the same instant.', id);
    case 'postal': { const value = answer as PuzzleAnswers['postal'];
      const recipient = value.recipient.trim(); const sender = value.sender.trim();
      const routed = postalRouteMatches(recipient, sender);
      return result(routed && value.code?.trim() === '23' && deriveArchiveCode(recipient, sender) === '23', 'The machine stamps archive number 23.', routed ? 'The archive stamp needs the number hidden in the two tickets.' : 'The route is reversed or incomplete.', id);
    }
    case 'final': { const value = answer as PuzzleAnswers['final'];
      const phraseOk = state?.partnerPhraseAccepted || normalizeAnswer(value.phrase ?? '') === PUZZLE_DEFINITIONS.final.phrase;
      const wordOk = normalizeAnswer(value.decoded) === PUZZLE_DEFINITIONS.final.answer;
      return result(Boolean(phraseOk && wordOk && value.shift === PUZZLE_DEFINITIONS.final.shift), 'Both halves turn. The fifth frame opens.', phraseOk ? 'The lock waits for its turning number and the final word.' : 'The other prisoner still holds the missing direction.', id);
    }
  }
}

export const validatePartnerPhrase = (phrase: string) => normalizeAnswer(phrase) === PUZZLE_DEFINITIONS.final.phrase;
