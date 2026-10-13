import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { GameAudio } from './engine';
import { gameSound } from './events';
import { loadAudioPreferences, saveAudioPreferences, type AudioPreferences } from './preferences';
import type { SoundCue } from './score';
import type { GameState } from '../game/types';

type AudioStatus = 'waiting' | 'ready' | 'unavailable';
interface AudioValue {
  engine: GameAudio;
  preferences: AudioPreferences;
  update: (patch: Partial<AudioPreferences>) => void;
  status: AudioStatus;
  play: (cue: SoundCue) => void;
}
const AudioContext = createContext<AudioValue | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(loadAudioPreferences);
  const [engine] = useState(() => new GameAudio(undefined, preferences));
  const [status, setStatus] = useState<AudioStatus>('waiting');
  const preferencesRef = useRef(preferences);

  useEffect(() => { saveAudioPreferences(preferences); }, [preferences]);
  useEffect(() => {
    let mounted = true;
    const unlock = (event: Event) => {
      if (!event.isTrusted || (event instanceof KeyboardEvent && !['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key))) return;
      if (preferencesRef.current.muted || (!preferencesRef.current.music && !preferencesRef.current.effects)) return;
      void engine.unlock().then((ready) => { if (mounted) setStatus(ready ? 'ready' : 'unavailable'); });
    };
    const visibility = () => engine.setVisible(!document.hidden);
    visibility();
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchend', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted = false;
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchend', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('visibilitychange', visibility);
      engine.dispose();
    };
  }, [engine]);

  const update = (patch: Partial<AudioPreferences>) => {
    const next = { ...preferencesRef.current, ...patch };
    preferencesRef.current = next;
    engine.setPreferences(next); setPreferences(next);
    // A mute/volume control is itself a gesture, including when the saved case is muted.
    if (!next.muted && (next.music || next.effects)) void engine.unlock().then((ready) => setStatus(ready ? 'ready' : 'unavailable'));
  };
  return <AudioContext.Provider value={{ engine, preferences, update, status, play: (cue) => engine.play(cue) }}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const audio = useContext(AudioContext);
  if (!audio) throw new Error('AudioProvider is missing');
  return audio;
}

export function useGameAudio(state: GameState, active: boolean) {
  const { engine } = useAudio();
  const previous = useRef(state);
  useEffect(() => { engine.setMode(active ? state.activeRoom === 'reveal' ? 'reveal' : 'mystery' : 'silent'); }, [engine, active, state.activeRoom]);
  useEffect(() => {
    const cue = gameSound(previous.current, state);
    previous.current = state;
    if (active && cue) engine.play(cue);
  }, [engine, state, active]);
}
