import type { PropsWithChildren } from 'react';
import { HintPanel } from './HintPanel';
import type { PuzzleId } from '../game/types';

type Props = PropsWithChildren<{
  eyebrow: string; title: string; goal: string; puzzle: PuzzleId; hintLevel: number;
  onHint: () => void; onSkip: () => void; solved?: boolean;
  onContinue: () => void; nextRoom: string; hintLimit?: number;
  hints?: readonly string[];
}>;

export function RoomScene({ eyebrow, title, goal, puzzle, hintLevel, onHint, onSkip, solved, children, onContinue, nextRoom, hintLimit, hints }: Props) {
  return (
    <section className="room-scene" aria-labelledby={`${puzzle}-title`}>
      <header className="room-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id={`${puzzle}-title`}>{title}</h1>
        <p className="scene-atmosphere">{goal}</p>
      </header>
      <div className="room-body">{children}</div>
      {solved && <div className="room-exit" role="status"><span className="eyebrow">Passage unlocked</span><button className="button primary" onClick={onContinue}>Enter {nextRoom} <span aria-hidden="true">→</span></button></div>}
      {!solved && <HintPanel puzzle={puzzle} level={hintLevel} onRequest={onHint} limit={hintLimit} hints={hints} />}
      {!solved && (
        <details className="emergency-skip">
          <summary>Stuck and need to keep the birthday moving?</summary>
          <p>This completes only the current puzzle. You can revisit its clues afterward.</p>
          <button className="button danger" type="button" onClick={() => { if (window.confirm('Skip this puzzle and unlock the next room?')) onSkip(); }}>Skip this puzzle</button>
        </details>
      )}
    </section>
  );
}
