import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Inventory } from '../components/Inventory';
import { AudioControls } from '../components/AudioControls';
import { useGameAudio } from '../audio/AudioProvider';
import { ROOM_LABELS, ROOM_PUZZLES, UNLOCK_SEQUENCE } from '../game/puzzles';
import { createInitialState, gameReducer, getUnlockedRooms, loadState, saveState } from '../game/state';
import type { RoomId } from '../game/types';
import { CalendarRoom, CipherRoom, ClockRoom, FinalRoom, GalleryRoom, GateRoom, PhotoRoom, PostalRoom, RevealRoom, formatDuration } from '../rooms/Rooms';

function StoryIntro({ onComplete }: { onComplete: () => void }) {
  const [panel, setPanel] = useState(0);
  const passages = [
    ['CASE REOPENED', 'The warden has reopened the prisoners’ case.'],
    ['FOUR WITNESSES', 'Four illustrated seasons remember how the old escape began.'],
    ['ONE MISSING FRAME', 'Two cities hold the final key. Enter when you are ready.'],
  ];
  useEffect(() => { const id = window.setTimeout(() => panel < 2 ? setPanel(panel + 1) : onComplete(), 5000); return () => window.clearTimeout(id); }, [panel, onComplete]);
  return <div className="story-intro"><div className="story-card" key={panel}><span>{String(panel + 1).padStart(2, '0')} / 03</span><p className="eyebrow">{passages[panel][0]}</p><h1>{passages[panel][1]}</h1><div className="story-progress"><i style={{ width: `${((panel + 1) / 3) * 100}%` }} /></div><div><button className="button quiet" onClick={onComplete}>Skip introduction</button>{panel < 2 && <button className="button primary" onClick={() => setPanel(panel + 1)}>Continue</button>}</div></div></div>;
}

export default function App() {
  const savedAtLaunch = useMemo(() => loadState(), []);
  const [state, dispatch] = useReducer(gameReducer, savedAtLaunch ?? createInitialState());
  const [phase, setPhase] = useState<'landing' | 'story' | 'game'>('landing');
  const enterGame = useCallback(() => setPhase('game'), []);
  const [highContrast, setHighContrast] = useState(() => { try { return localStorage.getItem('the-fifth-season:contrast') === 'true'; } catch { return false; } });
  const [canPersist, setCanPersist] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useGameAudio(state, phase !== 'landing');

  useEffect(() => { setCanPersist(saveState(state)); }, [state]);
  useEffect(() => { try { localStorage.setItem('the-fifth-season:contrast', String(highContrast)); } catch { /* Contrast still works for this session. */ } }, [highContrast]);
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') dispatch({ type: 'TICK', now: Date.now() }); };
    const id = window.setInterval(tick, 1000); return () => window.clearInterval(id);
  }, []);
  useEffect(() => {
    if (phase !== 'game') return;
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="step"]');
    // Scroll only the horizontal room strip, without moving the puzzle.
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      const delta = active.getBoundingClientRect().left - nav.getBoundingClientRect().left;
      nav.scrollLeft += delta - (nav.clientWidth - active.offsetWidth) / 2;
    }
  }, [state.activeRoom, phase]);
  useEffect(() => {
    const puzzle = ROOM_PUZZLES[state.activeRoom];
    if (phase !== 'game' || !puzzle || !state.solved[puzzle]) return;
    const discovery = mainRef.current?.querySelector<HTMLElement>('.cabinet-open, .discovered-evidence');
    if (discovery) {
      discovery.setAttribute('tabindex', '-1');
      discovery.focus({ preventScroll: true });
      discovery.scrollIntoView({ block: 'center' });
    }
  }, [state.solved]);

  const startNew = () => { dispatch({ type: 'RESET', now: Date.now() }); setPhase('story'); };
  if (phase === 'landing') return <div className={`app-shell landing-shell ${highContrast ? 'high-contrast' : ''}`}><div className="utility-float"><AudioControls /><button className="contrast-float" onClick={() => setHighContrast((value) => !value)} aria-pressed={highContrast}>High contrast</button></div><main className="landing"><div className="landing-ornament" aria-hidden="true">V</div><p className="eyebrow">The warden’s last escape</p><h1>The Fifth Season</h1><p className="landing-lede">Four seasons. Four days. Two cities.<br />One frame that cannot be opened alone.</p><div className="landing-actions">{savedAtLaunch && <button className="button primary" onClick={() => setPhase('game')}>Continue case <span>{ROOM_LABELS[state.activeRoom]}</span></button>}<button className={savedAtLaunch ? 'button quiet' : 'button primary'} onClick={() => { if (!savedAtLaunch || window.confirm('Start over and clear the saved case?')) startNew(); }}>Begin a new case</button></div><p className="prop-check">A pair of postcards. A label bearing two cities.</p></main></div>;
  if (phase === 'story') return <><div className="utility-float"><AudioControls /></div><StoryIntro onComplete={enterGame} /></>;

  const unlocked = getUnlockedRooms(state);
  const room = renderRoom(state.activeRoom, state, dispatch);
  return <div className={`app-shell ${highContrast ? 'high-contrast' : ''}`}>
    <header className="topbar"><a className="brand" href="#main-content" aria-label="The Fifth Season, current puzzle"><span aria-hidden="true">V</span><b>The Fifth Season</b></a><div className="case-status"><span>ELAPSED TIME</span><time>{formatDuration(state.elapsedMs)}</time></div><div className="topbar-actions"><AudioControls /><button className="contrast-toggle" onClick={() => setHighContrast((value) => !value)} aria-pressed={highContrast}>◐ <span>High contrast</span></button></div></header>
    <div className="game-layout">
      <nav className="room-nav" ref={navRef} aria-label="Unlocked rooms"><p>Case rooms</p><ol>{UNLOCK_SEQUENCE.map((roomId, index) => { const isUnlocked = unlocked.includes(roomId); const isActive = state.activeRoom === roomId; return <li key={roomId}><button disabled={!isUnlocked} aria-current={isActive ? 'step' : undefined} onClick={() => dispatch({ type: 'NAVIGATE', room: roomId })}><span>{String(index).padStart(2, '0')}</span><b>{ROOM_LABELS[roomId]}</b>{isUnlocked ? <i aria-label="unlocked">◇</i> : <i aria-label="locked">×</i>}</button></li>; })}</ol></nav>
      <main id="main-content" className="main-content" ref={mainRef} tabIndex={-1}>{room}</main>
      <Inventory items={state.inventory} />
    </div>
    <footer className="site-footer"><span role={canPersist ? undefined : 'status'}>{canPersist ? 'No hard time limit · Progress saves on this device' : 'Storage unavailable · Keep this tab open; progress cannot survive a reload.'}</span><button onClick={() => { if (window.confirm('Clear all saved progress?')) { dispatch({ type: 'RESET', now: Date.now() }); setPhase('landing'); } }}>Reset progress</button></footer>
  </div>;
}

function renderRoom(room: RoomId, state: ReturnType<typeof createInitialState>, dispatch: React.Dispatch<React.ComponentProps<typeof GateRoom>['dispatch'] extends React.Dispatch<infer A> ? A : never>) {
  const props = { state, dispatch };
  switch (room) {
    case 'gate': return <GateRoom {...props} />;
    case 'gallery': return <GalleryRoom {...props} />;
    case 'calendar': return <CalendarRoom {...props} />;
    case 'cipherDesk': return <CipherRoom {...props} />;
    case 'memoryCabinet': return <PhotoRoom {...props} />;
    case 'clockTower': return <ClockRoom {...props} />;
    case 'postalArchive': return <PostalRoom {...props} />;
    case 'finalGallery': return <FinalRoom {...props} />;
    case 'reveal': return <RevealRoom {...props} />;
  }
}
