import { useId, useRef } from 'react';
import { useAudio } from '../audio/AudioProvider';

export function AudioControls() {
  const { preferences, update, status, play } = useAudio();
  const dialog = useRef<HTMLDialogElement>(null);
  const controlId = useId();
  return <div className="audio-controls">
    <button className="audio-mute" aria-label={preferences.muted ? 'Unmute all audio' : 'Mute all audio'} aria-pressed={preferences.muted} onClick={() => update({ muted: !preferences.muted })}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" />{preferences.muted ? <path d="m17 9 5 6m0-6-5 6" /> : <><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19 6a9 9 0 0 1 0 12" /></>}</svg>
    </button>
    <button className="audio-settings" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>Sound</button>
    <dialog className="audio-dialog" ref={dialog} aria-labelledby="audio-title">
      <div className="audio-dialog-heading"><div><p className="eyebrow">The brass music box</p><h2 id="audio-title">Sound settings</h2></div><button className="button quiet" onClick={() => dialog.current?.close()} aria-label="Close sound settings">×</button></div>
      <p>Music-box melodies and mechanical sounds. Music fades out while an effect plays. Every clue also works in silence.</p>
      <button className="button primary" aria-pressed={preferences.muted} onClick={() => update({ muted: !preferences.muted })}>{preferences.muted ? 'Unmute all audio' : 'Mute all audio'}</button>
      <label className="audio-slider" htmlFor={`${controlId}-music`}>Music volume <output aria-hidden="true">{Math.round(preferences.music * 100)}%</output><input id={`${controlId}-music`} type="range" min="0" max="100" step="1" value={Math.round(preferences.music * 100)} onChange={(event) => update({ music: Number(event.target.value) / 100 })} /></label>
      <label className="audio-slider" htmlFor={`${controlId}-effects`}>Sound effects volume <output aria-hidden="true">{Math.round(preferences.effects * 100)}%</output><input id={`${controlId}-effects`} type="range" min="0" max="100" step="1" value={Math.round(preferences.effects * 100)} onChange={(event) => update({ effects: Number(event.target.value) / 100 })} /></label>
      <button className="button quiet" disabled={preferences.muted || preferences.effects === 0} onClick={() => play('success')}>Preview sounds</button>
      <p className="audio-status" role="status">{preferences.muted ? 'All audio muted.' : status === 'unavailable' ? 'Sound is unavailable or paused by your browser. Try another tap; the game still works in silence.' : status === 'ready' ? 'Sound ready. Pauses while this tab is hidden.' : 'Sound begins with your first interaction.'} Preferences save when browser storage is available.</p>
    </dialog>
  </div>;
}
