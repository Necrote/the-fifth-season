import { useEffect, useRef, useState, type Dispatch, type FormEvent, type CSSProperties } from 'react';
import { useAudio } from '../audio/AudioProvider';
import { FAILURE_CUES } from '../audio/failures';
import { ArtistLens } from '../components/ArtistLens';
import { CipherWheel } from '../components/CipherWheel';
import { RoomScene } from '../components/RoomScene';
import { TwinClocks } from '../components/TwinClocks';
import { DigitRollers } from '../components/DigitRollers';
import { PortraitFrames } from '../components/PortraitFrames';
import { HintPanel } from '../components/HintPanel';
import { EscapeCertificate } from '../components/EscapeCertificate';
import { EvidenceReveal } from '../components/EvidenceReveal';
import { PUZZLE_DEFINITIONS, SEASONS, NEXT_ROOM, ROOM_LABELS } from '../game/puzzles';
import type { GameAction } from '../game/state';
import type { GameState, PuzzleId, Season, ValidationResult } from '../game/types';
import { postalRouteMatches, validatePartnerPhrase, validatePuzzle, witnessNamesMatch } from '../game/validators';

type Props = { state: GameState; dispatch: Dispatch<GameAction> };

function usePuzzleFeedback(puzzle: PuzzleId) {
  const { play } = useAudio();
  const [feedback, setFeedback] = useState<ValidationResult | null>(null);
  return { feedback, check: (result: ValidationResult) => { setFeedback(result); if (!result.ok) play(FAILURE_CUES[puzzle]); return result.ok; } };
}

function Feedback({ value }: { value: ValidationResult | null }) {
  return value ? <p className={`feedback ${value.ok ? 'success' : 'error'}`} role="status">{value.feedback}</p> : null;
}

const sceneProps = (state: GameState, dispatch: Dispatch<GameAction>, puzzle: PuzzleId) => ({
  puzzle, hintLevel: state.hintLevels[puzzle] ?? 0,
  onHint: () => dispatch({ type: 'REQUEST_HINT', puzzle }),
  onSkip: () => dispatch({ type: 'SOLVE', puzzle }), solved: state.solved[puzzle],
  onContinue: () => dispatch({ type: 'NAVIGATE', room: NEXT_ROOM[puzzle] }), nextRoom: ROOM_LABELS[NEXT_ROOM[puzzle]],
  hintLimit: puzzle === 'final' && !state.partnerPhraseAccepted ? 2 : undefined,
});

export function GateRoom({ state, dispatch }: Props) {
  const [answer, setAnswer] = useState(''); const { feedback, check } = usePuzzleFeedback('gate');
  const submit = (event: FormEvent) => { event.preventDefault(); if (check(validatePuzzle('gate', answer))) dispatch({ type: 'SOLVE', puzzle: 'gate' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'gate')} eyebrow="Case 1026 · Entry" title="The Warden’s Gate" goal="An old case. A new lock. Seven empty spaces.">
    <div className="gate-hero">
      <figure className="case-reopened-art"><img src={`${import.meta.env.BASE_URL}images/props/case-reopened.webp`} alt="An Art Nouveau iron gate with a brass CASE REOPENED plaque" width={1122} height={1402} /></figure>
      <div className="evidence-card"><p>Your first evidence arrived by post.</p><form onSubmit={submit}><label htmlFor="gate-code">Seven-character keypad</label><input id="gate-code" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" maxLength={12} placeholder="•••••••" /><button className="button primary" type="submit">Try the lock</button></form><Feedback value={feedback} /></div>
    </div>
    {state.solved.gate && <div className="discovered-evidence"><span className="eyebrow">Case file recovered</span><h2>The case has been reopened.</h2><p>Four witnesses await their names.</p></div>}
  </RoomScene>;
}

export function GalleryRoom({ state, dispatch }: Props) {
  const { feedback, check } = usePuzzleFeedback('seasons');
  const [nameFeedback, setNameFeedback] = useState('');
  const { play } = useAudio();
  const discovery = useRef<HTMLDivElement>(null);
  const wasNamed = useRef(state.witnessesSolved);
  const wasRevealed = useRef(state.lensRevealed);
  useEffect(() => {
    if ((!wasNamed.current && state.witnessesSolved) || (!wasRevealed.current && state.lensRevealed)) {
      discovery.current?.focus({ preventScroll: true });
      discovery.current?.scrollIntoView({ block: 'start' });
    }
    wasNamed.current = state.witnessesSolved; wasRevealed.current = state.lensRevealed;
  }, [state.witnessesSolved, state.lensRevealed]);
  const nameWitnesses = (event: FormEvent) => {
    event.preventDefault();
    if (witnessNamesMatch(state.witnessAnswers, state.galleryLayout)) {
      dispatch({ type: 'CONFIRM_WITNESSES' }); setNameFeedback('');
    } else { setNameFeedback('One or more witnesses still lack their name.'); play('failWitness'); }
  };
  const submit = () => { if (check(validatePuzzle('seasons', { order: state.seasonOrder, selections: state.overlaySelections }, state))) dispatch({ type: 'SOLVE', puzzle: 'seasons' }); };
  const lensHints = state.witnessesSolved;
  return <RoomScene {...sceneProps(state, dispatch, 'seasons')}
    hintLevel={lensHints ? state.lensHintLevel : state.hintLevels.seasons ?? 0}
    onHint={() => dispatch(lensHints ? { type: 'REQUEST_LENS_HINT' } : { type: 'REQUEST_HINT', puzzle: 'seasons' })}
    hints={lensHints ? PUZZLE_DEFINITIONS.seasons.lensHints : PUZZLE_DEFINITIONS.seasons.hints}
    eyebrow="Room I · The four witnesses" title="Seasonal Gallery" goal="Four testimonies. Four missing names.">
    <section className="unnamed-witnesses" aria-labelledby="season-order-heading">
      <h2 id="season-order-heading">The unnamed witnesses</h2>
      <form onSubmit={nameWitnesses}>
        <div className="witness-testimonies">{state.galleryLayout.map((season, index) => <article className="witness-testimony illustrated-testimony" key={season} data-witness={index + 1} style={{ '--witness-art': `url("${import.meta.env.BASE_URL}images/props/witness-card-${index + 1}.webp")` } as CSSProperties}>
          <span className="sr-only">Witness {index + 1}</span>
          <blockquote>{PUZZLE_DEFINITIONS.seasons.descriptions[season]}</blockquote>
          <label className="sr-only" htmlFor={`witness-${index}`}>Name for {PUZZLE_DEFINITIONS.seasons.descriptions[season]}</label>
          <input id={`witness-${index}`} value={state.witnessAnswers[index]} readOnly={state.witnessesSolved} autoComplete="off" spellCheck={false}
            onChange={(event) => { const answers = [...state.witnessAnswers]; answers[index] = event.target.value; dispatch({ type: 'SET_WITNESS_ANSWERS', answers }); }} />
        </article>)}</div>
        {!state.witnessesSolved && <div className="submit-row"><button className="button primary">Return the names</button></div>}
      </form>
      {nameFeedback && <p className="feedback error" role="status">{nameFeedback}</p>}
      {state.witnessesSolved && <p className="witness-confirmation" role="status">The names settle into place. A hidden compartment opens.</p>}
    </section>
    {state.witnessesSolved && <div className="lens-discovery" ref={discovery} tabIndex={-1}>
      <h2>The artist’s lens</h2>
      <button className={`lens-object ${state.lensRevealed ? 'examined' : ''}`} aria-label="Examine the artist’s lens" aria-expanded={state.lensRevealed} disabled={state.lensRevealed} onClick={() => dispatch({ type: 'REVEAL_LENS' })}>
        <img src={`${import.meta.env.BASE_URL}images/props/artist-lens.webp`} alt="An artist’s magnifying lens of engraved botanical brass and blue-green glass" width={1536} height={1024} />
        {!state.lensRevealed && <span className="lens-affordance"><span aria-hidden="true">◇</span> Examine <span aria-hidden="true">↗</span></span>}
      </button>
      <p className="lens-inscription">Names remember. Glass returns.</p>
      {state.lensRevealed && <>
        <ArtistLens layout={state.galleryLayout} selections={state.overlaySelections} onSelect={(season, anchor) => dispatch({ type: 'SELECT_OVERLAY', season, anchor })} />
        {!state.solved.seasons && <div className="submit-row"><button className="button primary" type="button" onClick={submit}>Turn the four catches</button><Feedback value={feedback} /></div>}
      </>}
    </div>}
    {state.solved.seasons && <div className="discovered-evidence"><span className="eyebrow">The drawer opens</span><h2>Four season tiles recovered</h2><div className="recovered-tiles">{SEASONS.map((season) => <span className="season-plaque" key={season}>{season}</span>)}</div><p>A mechanical calendar waits beneath the tiles.</p></div>}
  </RoomScene>;
}

export function CalendarRoom({ state, dispatch }: Props) {
  const slots = state.calendarSlots; const { feedback, check } = usePuzzleFeedback('calendar');
  const [tile, setTile] = useState<Season | null>(null);
  const placeTile = (index: number, season: Season | null) => {
    const next = [...slots];
    const previous = season ? next.indexOf(season) : -1;
    if (previous !== -1 && previous !== index) next[previous] = next[index];
    next[index] = season;
    dispatch({ type: 'SET_CALENDAR', slots: next });
    setTile(null);
  };
  const submit = () => { if (check(validatePuzzle('calendar', slots))) dispatch({ type: 'SOLVE', puzzle: 'calendar' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'calendar')} eyebrow="Room II · Four passages" title="The Four-Day Calendar" goal="Five dates. Four passages. A key caught beneath the center seam.">
    <blockquote className="inscription">“Four passages separate two birthdays. The first blooms; the last freezes. The old escape sits where summer becomes autumn.”</blockquote>
    <div className="plaque-rack" aria-label="Calendar season tiles">{state.galleryLayout.map((season) => <button className="season-plaque" key={season} aria-pressed={tile === season} onClick={() => setTile(tile === season ? null : season)}>{season}</button>)}</div>
    <div className="calendar-strip" aria-label="October 24 through 28">
      <div className="date-row">{[24,25,26,27,28].map((date) => <time key={date} dateTime={`2025-10-${date}`}>OCT<strong>{date}</strong></time>)}</div>
      <div className="interval-row">{[0,1,2,3].map((index) => <button className="calendar-socket" key={index} aria-label={`Interval ${24 + index} to ${25 + index}`} onClick={() => placeTile(index, tile)}><span>{24 + index}→{25 + index}</span><strong>{slots[index] ?? 'Empty slot'}</strong></button>)}</div>
    </div>
    <details className="accessible-controls"><summary>Calendar entry controls</summary><div className="calendar-fallback">{[0,1,2,3].map((index) => <label key={index}>{24 + index}→{25 + index}<select aria-label={`Season for interval ${24 + index} to ${25 + index}`} value={slots[index] ?? ''} onChange={(e) => placeTile(index, (e.target.value || null) as Season | null)}><option value="">Season</option>{state.galleryLayout.map((season) => <option key={season} value={season}>{season}</option>)}</select></label>)}</div></details>
    <div className="submit-row"><button className="button primary" onClick={submit}>Set the calendar</button><Feedback value={feedback} /></div>
    {state.solved.calendar && <div className="discovered-evidence"><span className="eyebrow">Brass key recovered</span><img className="brass-key-art" src={`${import.meta.env.BASE_URL}images/props/brass-key-26.webp`} alt="An ornate brass key engraved 26" width={1774} height={887} /><p>The seam between Summer and Autumn glows.</p></div>}
  </RoomScene>;
}

export function CipherRoom({ state, dispatch }: Props) {
  const [decoded, setDecoded] = useState(state.cipherInput); const { feedback, check } = usePuzzleFeedback('cipher');
  const submit = (event: FormEvent) => { event.preventDefault(); dispatch({ type: 'SET_CIPHER', input: decoded }); if (check(validatePuzzle('cipher', { shift: state.cipherShift, decoded }))) dispatch({ type: 'SOLVE', puzzle: 'cipher' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'cipher')} eyebrow="Room III · The difference" title="Cipher Desk" goal="A word caught between two beginnings.">
    <blockquote className="inscription">“Between.”</blockquote>
    
    <div className="cipher-layout"><CipherWheel shift={state.cipherShift} onShift={(shift) => dispatch({ type: 'SET_CIPHER', shift })} ciphertext="TLSXS" /><form className="decoded-form" onSubmit={submit}><p className="locked-note">TLSXS</p><label htmlFor="decoded-word">Submit decoded word</label><input id="decoded-word" value={decoded} onChange={(e) => setDecoded(e.target.value)} autoComplete="off" /><button className="button primary" type="submit">Open the note</button><Feedback value={feedback} /></form></div>
    {state.solved.cipher && <div className="discovered-evidence"><span className="eyebrow">Recovered note</span><strong className="evidence-number">PHOTO</strong></div>}
  </RoomScene>;
}

export function PhotoRoom({ state, dispatch }: Props) {
  const [dateKey, setDateKey] = useState(''); const [wordKey, setWordKey] = useState(''); const { feedback, check } = usePuzzleFeedback('photo');
  const submit = (event: FormEvent) => { event.preventDefault(); if (check(validatePuzzle('photo', { dateKey, wordKey }, state))) dispatch({ type: 'SOLVE', puzzle: 'photo' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'photo')} eyebrow="Room IV · Evidence returned" title="Memory Cabinet" goal="Two latches hold an envelope the warden never opened.">
    {state.solved.photo ? <div className="cabinet-open" aria-live="polite">
      <div className="sealed-memory illustrated-memory"><img src={`${import.meta.env.BASE_URL}images/props/sealed-envelope.webp`} alt="A closed photograph envelope with a burgundy V wax seal" width={1536} height={1024} /><span>PHOTOGRAPH SEALED</span><h2>Held for the fifth frame</h2><p>The envelope stays closed. A timestamp strip slips free.</p></div>
      <figure className="timestamp-strip illustrated-slip"><img src={`${import.meta.env.BASE_URL}images/props/torn-timestamp-slip.webp`} alt="Prison Break · Evidence 1026. October 26, 2025 · time torn away · New York." width={1774} height={887} /><figcaption><span className="sr-only">The printed time is missing.</span><p>The paper forgot what the photograph kept.</p><p>One instant; two local times.</p></figcaption></figure>
      <HintPanel puzzle="clocks" level={state.hintLevels.clocks ?? 0} onRequest={() => dispatch({ type: 'REQUEST_HINT', puzzle: 'clocks' })} />
    </div> : <div className="cabinet"><div className="cabinet-doors" aria-hidden="true"><span>PRISON BREAK</span><b>EVIDENCE<br />RETURNED</b></div><form className="dual-lock" onSubmit={submit}><label>Date key<input value={dateKey} onChange={(e) => setDateKey(e.target.value)} inputMode="numeric" maxLength={2} /></label><label>Decoded word<input value={wordKey} onChange={(e) => setWordKey(e.target.value)} /></label><button className="button primary" type="submit">Turn both latches</button><Feedback value={feedback} /></form></div>}
  </RoomScene>;
}

export function ClockRoom({ state, dispatch }: Props) {
  const { feedback, check } = usePuzzleFeedback('clocks');
  const submit = () => { if (check(validatePuzzle('clocks', state.clocks))) dispatch({ type: 'SOLVE', puzzle: 'clocks' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'clocks')} eyebrow="Room V · One instant" title="Twin Clocks" goal="The clocks disagree. The memory remembers only one instant.">
    <details className="reference-card"><summary>Inspect the timezone reference card</summary><strong>REFERENCE · OCTOBER 26, 2025</strong><p>New York observed EDT (UTC−4). Mumbai observed IST (UTC+5:30).</p>{(state.hintLevels.clocks ?? 0) >= 2 && <span>Mumbai was 9 hours 30 minutes ahead.</span>}</details>
    <TwinClocks clocks={state.clocks} onChange={(clocks) => dispatch({ type: 'SET_CLOCKS', clocks })} />
    <div className="submit-row"><button className="button primary" onClick={submit}>Synchronize clocks</button><Feedback value={feedback} /></div>
    {state.solved.clocks && <div className="discovered-evidence"><span className="eyebrow">Both clocks chime</span><h2>The Postal Archive unlatches.</h2></div>}
  </RoomScene>;
}

export function PostalRoom({ state, dispatch }: Props) {
  const { recipient, sender, routed, code } = state.postal;
  const { feedback, check } = usePuzzleFeedback('postal');
  const route = () => {
    if (postalRouteMatches(recipient, sender)) {
      dispatch({ type: 'SET_POSTAL', postal: { ...state.postal, routed: true } });
      check({ ok: true, feedback: 'Two routing tickets drop into the tray.', unlocks: [] });
    } else check({ ok: false, feedback: 'The route is reversed or incomplete.', unlocks: [] });
  };
  const setCode = (code: string) => dispatch({ type: 'SET_POSTAL', postal: { ...state.postal, code } });
  const submit = () => { if (check(validatePuzzle('postal', { recipient, sender, code }))) dispatch({ type: 'SOLVE', puzzle: 'postal' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'postal')} eyebrow="Room VI · The route" title="Postal Archive" goal="Two mail slots. A jammed sorter. An unstamped ticket.">
    <details className="inspected-object"><summary>Inspect the wall note</summary><blockquote className="inscription">“Read the route from the label, not from memory. The letter with fewer digits belongs to the destination; the longer code marks its origin.”</blockquote></details>
    {!(routed || state.solved.postal) && <div className="postal-slots">
      <DigitRollers label="RECIPIENT · DESTINATION" digits={5} value={recipient} onChange={(recipient) => dispatch({ type: 'SET_POSTAL', postal: { ...state.postal, recipient, routed: false, code: '' } })} />
      <div className="mail-mark" aria-hidden="true">→</div>
      <DigitRollers label="SENDER · ORIGIN" digits={6} value={sender} onChange={(sender) => dispatch({ type: 'SET_POSTAL', postal: { ...state.postal, sender, routed: false, code: '' } })} />
      <button className="button primary" onClick={route}>Pull the sorting lever</button>
    </div>}
    {(routed || state.solved.postal) && <section className="postal-tickets" aria-live="polite">
      <div><span>DESTINATION</span><strong>{(recipient || PUZZLE_DEFINITIONS.postal.recipient).split('').join(' ')}</strong></div>
      <div><span>ORIGIN</span><strong>{(sender || PUZZLE_DEFINITIONS.postal.sender).split('').join(' ')}</strong></div>
      <p className="ticket-inscription">“Each different digit leaves one mark. Destination before origin.”</p>
      {!state.solved.postal && <><DigitRollers label="Archive number" digits={2} value={code} onChange={setCode} /><button className="button primary" onClick={submit}>Stamp archive number</button></>}
    </section>}
    <Feedback value={feedback} />
    {state.solved.postal && <div className="discovered-evidence archive-stamp"><span className="eyebrow">Archive ticket stamped</span><strong className="evidence-number">23</strong><p>A turning number, punched into the brass.</p></div>}
  </RoomScene>;
}

export function FinalRoom({ state, dispatch }: Props) {
  const [phrase, setPhrase] = useState(''); const [decoded, setDecoded] = useState(''); const { feedback, check } = usePuzzleFeedback('final');
  const accept = (event: FormEvent) => { event.preventDefault(); if (validatePartnerPhrase(phrase)) dispatch({ type: 'ACCEPT_PARTNER_PHRASE' }); else check({ ok: false, feedback: 'The other prisoner still holds the missing direction.', unlocks: [] }); };
  const finish = (event: FormEvent) => { event.preventDefault(); if (check(validatePuzzle('final', { decoded, shift: state.finalCipherShift }, state))) dispatch({ type: 'SOLVE', puzzle: 'final' }); };
  return <RoomScene {...sceneProps(state, dispatch, 'final')} eyebrow="Room VII · Two prisoners" title="Final Gallery" goal="Four witnesses surround a frame with two keyholes.">
    <PortraitFrames layout={state.galleryLayout} />
    {!state.partnerPhraseAccepted ? <form className="partner-interstitial" onSubmit={accept}><div className="partner-seal" aria-hidden="true">2</div><p className="eyebrow">The lock has two halves</p><h2>Contact your partner</h2><p>The other prisoner has the missing direction and a challenge phrase that is not written on either postcard.</p><label>Sender-held challenge phrase<input value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" /></label><button className="button primary" type="submit">Turn the first key</button><Feedback value={feedback} /></form>
    : <div className="final-cipher"><div className="warden-note"><span>INTERCEPTED MESSAGE</span><strong>{PUZZLE_DEFINITIONS.final.ciphertext}</strong><p>“The archive turns this lock.”</p></div><CipherWheel shift={state.finalCipherShift} onShift={(shift) => dispatch({ type: 'SET_FINAL_SHIFT', shift })} ciphertext={PUZZLE_DEFINITIONS.final.ciphertext} /><form onSubmit={finish}><label>Final decoded word<input value={decoded} onChange={(e) => setDecoded(e.target.value)} autoComplete="off" /></label><button className="button primary" type="submit">Open the fifth frame</button><Feedback value={feedback} /></form></div>}
  </RoomScene>;
}

export function RevealRoom({ state, dispatch }: Props) {
  const elapsed = state.completedAt ? state.completedAt - state.startedAt : state.elapsedMs;
  const duration = formatDuration(elapsed);
  return <section className="reveal" id="reveal"><div className="petal petal-a" /><div className="petal petal-b" /><p className="eyebrow">Escape complete</p><h1>The Fifth Season</h1><div className="fifth-frame evidence-fifth-frame"><EvidenceReveal opened={state.evidenceEnvelopeOpened} onOpen={() => dispatch({ type: 'OPEN_EVIDENCE_ENVELOPE' })} /></div><blockquote><p>Spring returns. Summer fades. Autumn passes. Winter ends.</p><p>But some traditions don’t belong to a season.</p><p>They begin again whenever two friends find their way back to the same adventure.</p></blockquote><h2>Happy Birthday!</h2><p className="final-line">Two cities. Two prisoners. Same team.<br />Next escape room—and the dinner afterward—are still on our list.</p><div className="escape-stats"><span><small>Elapsed</small>{duration}</span><span><small>Puzzles solved</small>8 / 8</span><span><small>Old benchmark</small>60:00</span></div><div className="reveal-actions"><EscapeCertificate duration={duration} /><button className="button quiet" onClick={() => { if (window.confirm('Clear all progress and begin the case again?')) dispatch({ type: 'RESET' }); }}>Replay from the beginning</button></div></section>;
}

export function formatDuration(ms: number) { const seconds = Math.max(0, Math.floor(ms / 1000)); const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`; }
