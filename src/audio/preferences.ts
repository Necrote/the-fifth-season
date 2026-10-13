export interface AudioPreferences {
  muted: boolean;
  music: number;
  effects: number;
}

export const AUDIO_STORAGE_KEY = 'the-fifth-season:audio:v1';
export const DEFAULT_AUDIO: AudioPreferences = { muted: false, music: 1, effects: 1 };
const volume = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

export function loadAudioPreferences(storage?: Pick<Storage, 'getItem'>): AudioPreferences {
  try {
    const saved = JSON.parse((storage ?? localStorage).getItem(AUDIO_STORAGE_KEY) ?? 'null');
    return { muted: typeof saved?.muted === 'boolean' ? saved.muted : false, music: volume(saved?.music, DEFAULT_AUDIO.music), effects: volume(saved?.effects, DEFAULT_AUDIO.effects) };
  } catch { return { ...DEFAULT_AUDIO }; }
}

export function saveAudioPreferences(value: AudioPreferences, storage?: Pick<Storage, 'setItem'>) {
  try { (storage ?? localStorage).setItem(AUDIO_STORAGE_KEY, JSON.stringify(value)); } catch { /* Sound still works when storage is unavailable. */ }
}
