export type SoundCue = 'click' | 'tick' | 'paper' | 'latch' | 'drawer' | 'key' | 'cabinet' | 'stamp' | 'bell' | 'success' | 'error' | 'reveal'
  | 'failLock' | 'failWitness' | 'failLens' | 'failCalendar' | 'failCipher' | 'failCabinet' | 'failClocks' | 'failPostal' | 'failFinal';
export type MusicMode = 'silent' | 'mystery' | 'reveal';
export interface Voice {
  frequency: number;
  offset: number;
  duration: number;
  gain: number;
  waveform?: OscillatorType | 'noise';
  attack?: number;
}

export const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const tone = (note: number, offset = 0, duration = 0.6, gain = 0.18): Voice => ({ frequency: midiHz(note), offset, duration, gain });
const noise = (offset = 0, duration = 0.08, gain = 0.3, frequency = 1800): Voice => ({ offset, duration, gain, frequency, waveform: 'noise' });
const tick: Voice[] = [noise(0, 0.035, 0.18, 2200), { frequency: 760, offset: 0, duration: 0.04, gain: 0.1, waveform: 'triangle' }];
const latch: Voice[] = [noise(0, 0.06, 0.32, 900), tone(43, 0.025, 0.14, 0.25), noise(0.16, 0.05, 0.16, 2000)];

// Original procedural sounds: no samples, downloads, or sound-dependent clues.
export const SOUND_CUES: Record<SoundCue, Voice[]> = {
  click: [noise(0, 0.035, 0.14, 1500), tone(77, 0, 0.08, 0.08)],
  tick,
  paper: [noise(0, 0.24, 0.12, 1200), noise(0.12, 0.25, 0.08, 2600)],
  latch,
  drawer: [...latch, noise(0.2, 0.45, 0.08, 450)],
  key: [...latch, tone(86, 0.18, 0.75, 0.12), tone(93, 0.21, 0.5, 0.06)],
  cabinet: [...latch, noise(0.2, 0.55, 0.13, 500), noise(0.6, 0.3, 0.08, 1700)],
  stamp: [noise(0, 0.09, 0.4, 600), tone(38, 0, 0.14, 0.28), noise(0.14, 0.05, 0.1, 1800)],
  bell: [tone(74, 0, 1.8, 0.18), tone(86, 0, 1.3, 0.05), tone(81, 0.4, 1.8, 0.14), tone(93, 0.4, 1.2, 0.04)],
  success: [tone(74), tone(77, 0.16), tone(81, 0.32, 1.2)],
  error: [tone(45, 0, 0.15, 0.12), noise(0.04, 0.07, 0.06, 550)],
  failLock: [noise(0, 0.08, 0.3, 900), tone(38, 0, 0.22, 0.23), noise(0.16, 0.09, 0.24, 650)],
  failWitness: [noise(0, 0.22, 0.2, 1600), noise(0.17, 0.18, 0.13, 2200), tone(50, 0.32, 0.12, 0.1)],
  failLens: [tone(83, 0, 0.6, 0.16), tone(84, 0.03, 0.48, 0.08), noise(0.22, 0.06, 0.14, 2000)],
  failCalendar: [noise(0, 0.08, 0.25, 550), tone(42, 0.03, 0.2, 0.22), noise(0.2, 0.09, 0.18, 1200)],
  failCipher: [noise(0, 0.05, 0.18, 1900), noise(0.09, 0.05, 0.18, 1700), tone(49, 0.13, 0.2, 0.2)],
  failCabinet: [tone(36, 0, 0.22, 0.28), noise(0, 0.1, 0.26, 450), tone(36, 0.22, 0.2, 0.2)],
  failClocks: [tone(74, 0, 0.85, 0.16), tone(75, 0.14, 0.7, 0.13), noise(0.35, 0.05, 0.09, 1000)],
  failPostal: [noise(0, 0.14, 0.28, 700), tone(40, 0, 0.18, 0.2), noise(0.17, 0.25, 0.17, 1700)],
  failFinal: [noise(0, 0.08, 0.22, 850), tone(38, 0, 0.22, 0.24), noise(0.23, 0.09, 0.2, 700), tone(41, 0.23, 0.24, 0.18)],
  reveal: [tone(62, 0, 2.8, 0.12), tone(66, 0, 2.8, 0.09), tone(69, 0, 2.8, 0.09), ...[74, 78, 81, 86].map((note, index) => tone(note, 0.3 + index * 0.3, 2.2, 0.15))],
};

export const BEAT_SECONDS = 60 / 68;
const mysteryMelody = [74, null, 81, 77, null, 76, 74, null, 72, null, 77, 76, null, 69, 72, null, 70, null, 77, 74, null, 72, 70, null, 69, null, 76, 73, null, 76, 81, null];
const revealMelody = [74, null, 78, 81, null, 86, 81, null, 73, null, 76, 81, null, 85, 81, null, 71, null, 74, 78, null, 83, 78, null, 69, null, 73, 76, null, 81, 78, null];

export function musicBeat(mode: Exclude<MusicMode, 'silent'>, beat: number): Voice[] {
  const index = beat % 32;
  const note = (mode === 'mystery' ? mysteryMelody : revealMelody)[index];
  const voices: Voice[] = note === null ? [] : [tone(note, 0, 2.1, 0.16), { ...tone(note, 0, 1.15, 0.026), frequency: midiHz(note) * 3.98 }];
  if (index % 8 === 0) {
    const chords = mode === 'mystery' ? [[50, 57, 65], [48, 55, 64], [46, 53, 62], [45, 52, 61]] : [[50, 57, 66], [49, 57, 64], [47, 54, 62], [45, 52, 61]];
    for (const pitch of chords[index / 8]) voices.push({ ...tone(pitch, 0, BEAT_SECONDS * 8, 0.04), attack: 0.8 });
  }
  return voices;
}
