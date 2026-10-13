import { DEFAULT_AUDIO, type AudioPreferences } from './preferences';
import { BEAT_SECONDS, musicBeat, SOUND_CUES, type MusicMode, type SoundCue } from './score';
import { synthesize, type PlayingVoice } from './synthesis';

export type ContextFactory = () => AudioContext;
export function browserContext(): AudioContext {
  const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Constructor) throw new Error('Web Audio is unavailable');
  return new Constructor();
}

export class GameAudio {
  private context?: AudioContext;
  private musicGain?: GainNode;
  private effectsGain?: GainNode;
  private master?: GainNode;
  private timer?: ReturnType<typeof setInterval>;
  private mode: MusicMode = 'silent';
  private visible = true;
  private preferences: AudioPreferences;
  private nextBeat = 0;
  private beat = 0;
  private lastSound = -Infinity;
  private duckUntil = 0;
  private musicVoices = new Set<PlayingVoice>();
  private effectsVoices = new Set<PlayingVoice>();
  private onStateChange = () => {
    if (this.context?.state === 'running') this.startMusic();
    else { this.stopMusic(); this.stopVoices(this.effectsVoices); this.duckUntil = 0; this.applyVolume(); }
  };

  constructor(private createContext: ContextFactory = browserContext, preferences = DEFAULT_AUDIO) { this.preferences = { ...preferences }; }

  // Called synchronously from a real gesture; never create a context during render.
  unlock(): Promise<boolean> {
    if (!this.visible || this.preferences.muted || (!this.preferences.music && !this.preferences.effects)) return Promise.resolve(false);
    try {
      if (!this.context) {
        this.context = this.createContext();
        this.master = this.context.createGain(); this.master.gain.value = 0.6;
        this.musicGain = this.context.createGain(); this.effectsGain = this.context.createGain();
        this.musicGain.connect(this.master); this.effectsGain.connect(this.master); this.master.connect(this.context.destination);
        this.context.addEventListener('statechange', this.onStateChange);
        this.applyVolume();
      }
      const context = this.context;
      if (context.state === 'running') { this.startMusic(); return Promise.resolve(true); }
      // Retry resume in every real gesture, even if Safari left a background resume pending.
      return context.resume().then(() => {
        if (this.context !== context || !this.visible || this.preferences.muted) { void context.suspend().catch(() => {}); return false; }
        this.startMusic(); return context.state === 'running';
      }).catch(() => false);
    } catch { return Promise.resolve(false); }
  }

  setPreferences(preferences: AudioPreferences) {
    this.preferences = { ...preferences }; this.applyVolume();
    if (preferences.muted || !preferences.music) this.stopMusic(); else this.startMusic();
    if (preferences.muted || !preferences.effects) this.stopVoices(this.effectsVoices);
    if (preferences.muted) void this.context?.suspend().catch(() => {});
  }

  setMode(mode: MusicMode) {
    if (mode === this.mode) return;
    this.stopMusic(); this.mode = mode; this.beat = 0; this.startMusic();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (!visible) {
      this.stopMusic(); this.stopVoices(this.effectsVoices);
      this.duckUntil = 0; this.applyVolume();
      void this.context?.suspend().catch(() => {});
    } else if (this.context) { void this.unlock(); }
  }

  play(cue: SoundCue) {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.visible || this.preferences.muted || !this.preferences.effects) return;
    // Dragging a ring or holding a clock key should not pile up hundreds of ticks.
    if ((cue === 'tick' || cue === 'click') && context.currentTime - this.lastSound < 0.055) return;
    this.lastSound = context.currentTime;
    this.duckUntil = Math.max(this.duckUntil, context.currentTime + Math.max(...SOUND_CUES[cue].map((voice) => voice.offset + voice.duration)) + 0.12);
    this.applyVolume();
    synthesize(context, this.effectsGain!, SOUND_CUES[cue], context.currentTime + 0.005, (voice) => this.effectsVoices.add(voice), (voice) => this.effectsVoices.delete(voice));
  }

  private applyVolume() {
    if (!this.context || !this.musicGain || !this.effectsGain) return;
    const now = this.context.currentTime;
    const music = this.preferences.muted ? 0 : this.preferences.music;
    this.musicGain.gain.cancelScheduledValues(now);
    this.musicGain.gain.setTargetAtTime(this.duckUntil > now ? 0 : music, now, 0.015);
    if (music && this.duckUntil > now) {
      this.musicGain.gain.setValueAtTime(0, this.duckUntil);
      this.musicGain.gain.setTargetAtTime(music, this.duckUntil, 0.2);
    }
    this.effectsGain.gain.setTargetAtTime(this.preferences.muted ? 0 : this.preferences.effects, now, 0.025);
  }

  private startMusic() {
    if (this.timer || !this.context || this.context.state !== 'running' || this.mode === 'silent' || !this.visible || this.preferences.muted || !this.preferences.music) return;
    this.nextBeat = this.context.currentTime + 0.06;
    this.schedule(); this.timer = setInterval(() => this.schedule(), 200);
  }

  private schedule() {
    const context = this.context;
    if (!context || context.state !== 'running' || this.mode === 'silent') return;
    if (this.nextBeat < context.currentTime) this.nextBeat = context.currentTime + 0.06;
    while (this.nextBeat < context.currentTime + 0.4) {
      synthesize(context, this.musicGain!, musicBeat(this.mode, this.beat++), this.nextBeat, (voice) => this.musicVoices.add(voice), (voice) => this.musicVoices.delete(voice));
      this.nextBeat += BEAT_SECONDS;
    }
  }

  private stopVoices(voices: Set<PlayingVoice>) { for (const voice of voices) voice.stop(); voices.clear(); }
  private stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = undefined; this.stopVoices(this.musicVoices); }

  dispose() {
    this.stopMusic(); this.stopVoices(this.effectsVoices);
    const context = this.context;
    this.context = undefined; this.musicGain = undefined; this.effectsGain = undefined; this.master = undefined; this.lastSound = -Infinity; this.duckUntil = 0;
    if (context) { context.removeEventListener('statechange', this.onStateChange); void context.close().catch(() => {}); }
  }
}
