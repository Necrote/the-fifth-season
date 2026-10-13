import type { Voice } from './score';

export interface PlayingVoice { stop: () => void }

export function synthesize(context: BaseAudioContext, output: AudioNode, voices: readonly Voice[], at: number, register: (voice: PlayingVoice) => void = () => {}, release: (voice: PlayingVoice) => void = () => {}) {
  for (const voice of voices) {
    const envelope = context.createGain();
    const start = at + voice.offset;
    const end = start + voice.duration;
    const attack = Math.min(voice.attack ?? 0.008, voice.duration * 0.4);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(voice.gain, start + attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    envelope.gain.setValueAtTime(0, end + 0.015);
    envelope.connect(output);
    let source: OscillatorNode | AudioBufferSourceNode;
    let filter: BiquadFilterNode | undefined;
    if (voice.waveform === 'noise') {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * (voice.duration + 0.03)), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = voice.frequency;
      noise.connect(filter); filter.connect(envelope); source = noise;
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = voice.waveform ?? 'sine';
      oscillator.frequency.value = voice.frequency;
      oscillator.connect(envelope); source = oscillator;
    }
    let stopped = false;
    const playing: PlayingVoice = { stop: () => {
      if (stopped) return;
      stopped = true;
      const now = context.currentTime;
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setTargetAtTime(0, now, 0.012);
      try { source.stop(now + 0.06); } catch { /* Already ended. */ }
    } };
    source.onended = () => { source.disconnect(); filter?.disconnect(); envelope.disconnect(); release(playing); };
    register(playing);
    source.start(start); source.stop(end + 0.025);
  }
}
