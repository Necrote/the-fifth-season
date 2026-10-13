import type { PuzzleId, RoomId, Season } from './types';

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function shuffleSeasons(random = Math.random): Season[] {
  const shuffled = [...SEASONS];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  // Each new case starts out of chronological order, even if the shuffle lands there.
  if (shuffled.every((season, index) => season === SEASONS[index])) shuffled.push(shuffled.shift()!);
  return shuffled;
}

export const ROOM_LABELS: Record<RoomId, string> = {
  gate: "Warden's Gate",
  gallery: 'Seasonal Gallery',
  calendar: 'Four-Day Calendar',
  cipherDesk: 'Cipher Desk',
  memoryCabinet: 'Memory Cabinet',
  clockTower: 'Twin Clocks',
  postalArchive: 'Postal Archive',
  finalGallery: 'Final Gallery',
  reveal: 'The Fifth Season',
};

export const ROOM_PUZZLES: Partial<Record<RoomId, PuzzleId>> = {
  gate: 'gate', gallery: 'seasons', calendar: 'calendar', cipherDesk: 'cipher',
  memoryCabinet: 'photo', clockTower: 'clocks', postalArchive: 'postal', finalGallery: 'final',
};

export const PUZZLE_DEFINITIONS = {
  gate: {
    answer: 'FREEDOM',
    hints: ['The invitation begins seven times.', 'Look at the start of each line on Spring/Summer.', 'Read the first letters downward.'],
  },
  seasons: {
    answer: 'SEED',
    order: SEASONS,
    anchors: { spring: 'spring-bouquet', summer: 'summer-wheat', autumn: 'autumn-fruit', winter: 'winter-bough' },
    letters: { spring: 'S', summer: 'E', autumn: 'E', winter: 'D' },
    descriptions: {
      spring: 'She holds the first flowers', summer: 'She stands amid wheat and poppies',
      autumn: 'She carries a basket of fruit', winter: 'She shelters under snow-covered boughs',
    },
    targets: {
      spring: 'Bouquet cradled in her arms—not plants at her feet',
      summer: 'Wheat stalks surrounding the lower figure—not flowers in her arms',
      autumn: 'Basket of yellow fruit in her left hand',
      winter: 'Snow-laden tree boughs above and around her—not the cloak',
    },
    hints: [
      'The witnesses remember something that arrived by post.',
      'Look at the illustrated faces of both postcards.',
      'The printed painting names are Spring, Summer, Autumn and Winter. Match each name to its description.',
    ],
    lensHints: [
      'The glass remembers what each witness said.',
      'The descriptions above point to features in the paintings. Choose one location in each portrait, then try the drawer.',
      'Spring: bouquet in her arms. Summer: wheat below her. Autumn: fruit basket. Winter: snow-laden boughs above her.',
    ],
  },
  calendar: {
    answer: SEASONS,
    hints: ['There are four spaces, not five dates.', 'Start with Spring, end with Winter.', 'Summer ends and Autumn begins at October 26.'],
  },
  cipher: {
    shift: 4, ciphertext: 'TLSXS', answer: 'PHOTO',
    hints: ['The wheel turns by the distance between two beginnings.', 'The prisoners’ birthdays are October 24 and October 28. Subtract the earlier day from the later one.', '28 − 24 = 4. Set shift 4 and read TLSXS backward to recover PHOTO.'],
  },
  photo: {
    dateKey: '26', wordKey: 'PHOTO',
    hints: ['The cabinet has two latches: one wants a date, one wants a word.', 'The calendar provided the brass key tagged 26.', 'The cipher desk decoded PHOTO.'],
  },
  clocks: {
    nyDate: '2025-10-26', nyTime: '11:15', nyPeriod: 'AM',
    mumDate: '2025-10-26', mumTime: '8:45', mumPeriod: 'PM',
    hints: ['The paper lost what a photograph kept. Find the photograph from your last Prison Break escape.', 'Open that photograph’s information on your phone. Its capture date and New York local time belong on the New York clock—not the file’s modified date.', 'On October 26, 2025, Mumbai was 9 hours 30 minutes ahead of New York. Add that difference, checking AM/PM and the date.'],
  },
  postal: {
    recipient: '11101', sender: '400050', archiveCode: '23',
    hints: ['The package itself has the routing information.', 'Destination = five digits; origin = six.', 'Count unique digit values, not the number of digits.'],
  },
  final: {
    phrase: 'SAME TEAM', shift: 23, ciphertext: 'QLDBQEBO', answer: 'TOGETHER',
    hints: ['You cannot finish this one alone.', 'Call the other prisoner.', 'The archive stamped 23. Set the wheel to 23 and read backward.'],
  },
} as const;

export const UNLOCK_SEQUENCE: RoomId[] = ['gate', 'gallery', 'calendar', 'cipherDesk', 'memoryCabinet', 'clockTower', 'postalArchive', 'finalGallery', 'reveal'];
export const SOLVE_UNLOCKS: Record<PuzzleId, string[]> = {
  gate: ['Case File', 'Seasonal Gallery'], seasons: ["Artist's Lens", 'Four Season Tiles', 'Four-Day Calendar'],
  calendar: ['Brass Key · 26', 'Cipher Desk'], cipher: ['Cipher Wheel', 'Memory Cabinet'],
  photo: ['Sealed Photograph', 'Timestamp Strip', 'Twin Clocks'], clocks: ['Postal Archive'],
  postal: ['Archive Code · 23', 'Final Gallery'], final: ['The Fifth Season'],
};
export const NEXT_ROOM: Record<PuzzleId, RoomId> = {
  gate: 'gallery', seasons: 'calendar', calendar: 'cipherDesk', cipher: 'memoryCabinet',
  photo: 'clockTower', clocks: 'postalArchive', postal: 'finalGallery', final: 'reveal',
};
