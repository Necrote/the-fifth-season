import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../src/audio/engine';
import { gameSound } from '../src/audio/events';
import { AUDIO_STORAGE_KEY, DEFAULT_AUDIO, loadAudioPreferences, saveAudioPreferences } from '../src/audio/preferences';
import { musicBeat, SOUND_CUES, type SoundCue } from '../src/audio/score';
import { FAILURE_CUES } from '../src/audio/failures';
import { createInitialState, gameReducer } from '../src/game/state';

afterEach(() => { vi.useRealTimers(); localStorage.clear(); });

function audioFixture() {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const source = () => ({ ...node(), start: vi.fn(), stop: vi.fn(), frequency: parameter(), onended: null });
  const context = {
    state: 'running', currentTime: 0, sampleRate: 44100, destination: node(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    createGain: vi.fn(() => ({ ...node(), gain: parameter() })),
    createOscillator: vi.fn(source), createBufferSource: vi.fn(source),
    createBuffer: vi.fn((_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) })),
    createBiquadFilter: vi.fn(() => ({ ...node(), frequency: parameter(), type: 'lowpass' })),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { context, factory, engine: new GameAudio(factory) };
}

describe('sound preferences', () => {
  it('uses quiet defaults and persists independently from puzzle progress', () => {
    expect(loadAudioPreferences()).toEqual(DEFAULT_AUDIO);
    saveAudioPreferences({ muted: true, music: 0.2, effects: 0.7 });
    expect(loadAudioPreferences()).toEqual({ muted: true, music: 0.2, effects: 0.7 });
    expect(localStorage.getItem('the-fifth-season:v1')).toBeNull();
  });
  it('handles corrupt, missing, and out-of-range settings', () => {
    localStorage.setItem(AUDIO_STORAGE_KEY, '{broken');
    expect(loadAudioPreferences()).toEqual(DEFAULT_AUDIO);
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify({ muted: 'yes', music: 4, effects: -1 }));
    expect(loadAudioPreferences()).toEqual({ muted: false, music: 1, effects: 0 });
    expect(loadAudioPreferences({ getItem: () => { throw new Error('unavailable'); } })).toEqual(DEFAULT_AUDIO);
    expect(() => saveAudioPreferences(DEFAULT_AUDIO, { setItem: () => { throw new Error('unavailable'); } })).not.toThrow();
  });
});

describe('original sound score', () => {
  it('contains bounded, finite envelopes for each effect', () => {
    expect(Object.keys(SOUND_CUES)).toHaveLength(21);
    for (const voices of Object.values(SOUND_CUES)) for (const voice of voices) {
      expect(voice.frequency).toBeGreaterThan(0); expect(voice.frequency).toBeLessThan(20000);
      expect(voice.gain).toBeGreaterThan(0); expect(voice.gain).toBeLessThanOrEqual(0.4);
      expect(voice.duration).toBeGreaterThan(0); expect(voice.offset + voice.duration).toBeLessThan(4);
    }
  });
  it('loops the music-box score and changes harmony for the reveal', () => {
    expect(musicBeat('mystery', 32)).toEqual(musicBeat('mystery', 0));
    expect(musicBeat('reveal', 32)).toEqual(musicBeat('reveal', 0));
    expect(musicBeat('reveal', 0)).not.toEqual(musicBeat('mystery', 0));
    expect(musicBeat('mystery', 1)).toEqual([]);
  });
});

describe('audio lifecycle', () => {
  it('cleans up interrupted Safari playback and restarts one scheduler on resume', async () => {
    vi.useFakeTimers(); const { engine, context } = audioFixture();
    engine.setMode('mystery'); await engine.unlock();
    const stateChange = context.addEventListener.mock.calls[0][1] as () => void;
    context.state = 'interrupted'; stateChange();
    expect(vi.getTimerCount()).toBe(0);
    await engine.unlock(); stateChange();
    expect(context.state).toBe('running'); expect(vi.getTimerCount()).toBe(1);
    engine.dispose(); expect(context.removeEventListener).toHaveBeenCalledWith('statechange', stateChange);
  });
  it('retries resume from a new gesture while a background attempt is pending', async () => {
    const { engine, context } = audioFixture(); context.state = 'suspended';
    context.resume.mockImplementationOnce(() => new Promise<void>(() => {}));
    void engine.unlock();
    expect(await engine.unlock()).toBe(true);
    expect(context.resume).toHaveBeenCalledTimes(2); engine.dispose();
  });
  it('does not create audio or timers before a gesture', () => {
    vi.useFakeTimers(); const { engine, factory } = audioFixture();
    engine.setMode('mystery'); engine.play('stamp'); engine.setPreferences(DEFAULT_AUDIO);
    expect(factory).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0); engine.dispose();
  });
  it('starts one scheduler, and independently mixes music and effects', async () => {
    vi.useFakeTimers(); const { engine, factory, context } = audioFixture();
    engine.setMode('mystery'); expect(await engine.unlock()).toBe(true); await engine.unlock();
    expect(factory).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(1);
    engine.setPreferences({ muted: false, music: 0.22, effects: 0.81 });
    expect(context.createGain.mock.results[1].value.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.22, 0, 0.015);
    expect(context.createGain.mock.results[2].value.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.81, 0, 0.025);
    const count = context.createOscillator.mock.calls.length;
    engine.play('stamp'); expect(context.createOscillator.mock.calls.length).toBeGreaterThan(count);
    engine.dispose(); expect(vi.getTimerCount()).toBe(0); expect(context.close).toHaveBeenCalledTimes(1);
  });
  it('mute and zero volumes suppress scheduling and effects', async () => {
    vi.useFakeTimers(); const { engine, factory, context } = audioFixture();
    engine.setPreferences({ muted: true, music: 0.35, effects: 0.65 });
    await engine.unlock(); expect(factory).not.toHaveBeenCalled();
    engine.setPreferences(DEFAULT_AUDIO); engine.setMode('mystery'); await engine.unlock();
    engine.setPreferences({ muted: false, music: 0, effects: 0 });
    const count = context.createOscillator.mock.calls.length;
    engine.play('bell'); expect(context.createOscillator.mock.calls).toHaveLength(count); expect(vi.getTimerCount()).toBe(0);
    engine.setPreferences({ ...DEFAULT_AUDIO, muted: true });
    expect(context.suspend).toHaveBeenCalled(); engine.dispose();
  });
  it('pauses hidden tabs without accumulating missed notes', async () => {
    vi.useFakeTimers(); const { engine, context } = audioFixture();
    engine.setMode('mystery'); await engine.unlock(); engine.setVisible(false);
    expect(vi.getTimerCount()).toBe(0); expect(context.suspend).toHaveBeenCalled();
    const count = context.createOscillator.mock.calls.length;
    engine.play('bell'); expect(context.createOscillator.mock.calls).toHaveLength(count);
    context.currentTime = 100;
    engine.setVisible(true); await Promise.resolve();
    expect(vi.getTimerCount()).toBe(1);
    // Beat one is an intentional rest. Resume the next note without replaying the hidden interval.
    context.currentTime = 102; vi.advanceTimersByTime(200);
    const scheduled = context.createOscillator.mock.results.slice(count);
    expect(scheduled.length).toBeLessThan(10);
    expect(scheduled[0].value.start).toHaveBeenCalledWith(102.06); engine.dispose();
  });
  it('allows effects with music off, and rate-limits dragged wheel ticks', async () => {
    const { engine, context } = audioFixture(); await engine.unlock();
    engine.setPreferences({ ...DEFAULT_AUDIO, music: 0 });
    engine.play('tick'); const count = context.createOscillator.mock.calls.length;
    engine.play('tick'); expect(context.createOscillator.mock.calls).toHaveLength(count);
    context.currentTime = 0.1; engine.play('tick'); expect(context.createOscillator.mock.calls.length).toBeGreaterThan(count);
    engine.play('reveal'); expect(context.createOscillator.mock.calls.length).toBeGreaterThan(count + 1); engine.dispose();
  });
  it('degrades gracefully without Web Audio or with blocked resume', async () => {
    const engine = new GameAudio(() => { throw new Error('unsupported'); });
    expect(await engine.unlock()).toBe(false); expect(() => engine.play('reveal')).not.toThrow(); engine.dispose();
    const fixture = audioFixture(); fixture.context.state = 'suspended';
    fixture.context.resume.mockRejectedValueOnce(new Error('blocked'));
    expect(await fixture.engine.unlock()).toBe(false); fixture.engine.dispose();
  });
  it('does not start music if the tab hides during resume', async () => {
    vi.useFakeTimers(); const { engine, context } = audioFixture(); context.state = 'suspended';
    engine.setMode('mystery'); const pending = engine.unlock(); engine.setVisible(false);
    expect(await pending).toBe(false); expect(vi.getTimerCount()).toBe(0); engine.dispose();
  });
  it('ducks music for an effect, extends overlapping ducks, and restores the current chosen volume', async () => {
    vi.useFakeTimers(); const { engine, context } = audioFixture();
    engine.setMode('mystery'); await engine.unlock();
    const music = context.createGain.mock.results[1].value.gain;
    engine.play('bell');
    expect(music.setTargetAtTime).toHaveBeenCalledWith(0, 0, 0.015);
    expect(music.setValueAtTime.mock.lastCall?.[0]).toBe(0);
    expect(music.setValueAtTime.mock.lastCall?.[1]).toBeCloseTo(2.32);
    context.currentTime = 0.5; engine.play('reveal');
    expect(music.setValueAtTime.mock.lastCall?.[1]).toBeCloseTo(4.02);
    engine.setPreferences({ ...DEFAULT_AUDIO, music: 0.4 });
    expect(music.setTargetAtTime.mock.lastCall?.[0]).toBe(0.4);
    expect(music.setTargetAtTime.mock.lastCall?.[1]).toBeCloseTo(4.02);
    expect(music.setTargetAtTime.mock.lastCall?.[2]).toBe(0.2);
    engine.setPreferences({ ...DEFAULT_AUDIO, muted: true });
    expect(music.setTargetAtTime).toHaveBeenLastCalledWith(0, 0.5, 0.015);
    engine.dispose();
  });
});

describe('game action sounds', () => {
  it('maps every first discovery to a distinct appropriate effect', () => {
    const state = createInitialState(1000);
    const cues: Record<string, SoundCue> = { gate: 'latch', seasons: 'drawer', calendar: 'key', cipher: 'paper', photo: 'cabinet', clocks: 'bell', postal: 'stamp', final: 'latch' };
    for (const [puzzle, cue] of Object.entries(cues)) {
      const next = { ...state, solved: { ...state.solved, [puzzle]: true } };
      expect(gameSound(state, next)).toBe(cue);
      expect(gameSound(next, next)).toBeNull();
    }
  });
  it('ticks wheels, clocks and postal rollers, and rustles hints and routing tickets', () => {
    const state = createInitialState(1000);
    expect(gameSound(state, gameReducer(state, { type: 'SET_FINAL_SHIFT', shift: 23 }))).toBe('tick');
    expect(gameSound(state, gameReducer(state, { type: 'SET_CIPHER', shift: 4 }))).toBe('tick');
    expect(gameSound(state, { ...state, clocks: { ...state.clocks, nyTime: '11:15' } })).toBe('tick');
    expect(gameSound(state, { ...state, postal: { ...state.postal, recipient: '11101' } })).toBe('tick');
    expect(gameSound(state, { ...state, postal: { ...state.postal, routed: true } })).toBe('paper');
    expect(gameSound(state, gameReducer(state, { type: 'REQUEST_HINT', puzzle: 'gate' }))).toBe('paper');
    expect(gameSound(state, gameReducer(state, { type: 'ACCEPT_PARTNER_PHRASE' }))).toBe('latch');
  });
  it('makes no sounds for ticking elapsed time, reset or restored evidence', () => {
    const state = createInitialState(1000);
    expect(gameSound(state, gameReducer(state, { type: 'TICK', now: 2000 }))).toBeNull();
    expect(gameSound(state, gameReducer(state, { type: 'RESET', now: 3000 }))).toBeNull();
    const restored = { ...state, solved: { ...state.solved, gate: true, photo: true } };
    expect(gameSound(restored, { ...restored, elapsedMs: 1000 })).toBeNull();
  });
  it('has a themed failure effect for every puzzle and a dedicated witness-writing effect', () => {
    expect(Object.values(FAILURE_CUES)).toHaveLength(8);
    for (const cue of [...Object.values(FAILURE_CUES), 'failWitness' as const]) expect(SOUND_CUES[cue].length).toBeGreaterThan(1);
  });
  it('celebrates opening the evidence envelope once, not merely revisiting the ending', () => {
    const state = createInitialState(); const opened = { ...state, evidenceEnvelopeOpened: true };
    expect(gameSound(state, opened)).toBe('reveal');
    expect(gameSound(opened, opened)).toBeNull();
  });
});
