import { PUZZLE_DEFINITIONS } from '../game/puzzles';
import type { PuzzleId } from '../game/types';

export function HintPanel({ puzzle, level, onRequest, limit, hints: customHints }: { puzzle: PuzzleId; level: number; onRequest: () => void; limit?: number; hints?: readonly string[] }) {
  const hints = (customHints ?? PUZZLE_DEFINITIONS[puzzle].hints).slice(0, limit);
  return (
    <aside className="hint-panel" aria-label="Progressive hints">
      <div className="hint-heading"><span>Hint lamp</span><span>{level}/{hints.length}</span></div>
      {level > 0 && <ol>{hints.slice(0, level).map((hint, index) => <li key={hint}><span>Hint {index + 1}</span>{hint}</li>)}</ol>}
      {level < hints.length && <button className="button quiet" type="button" onClick={onRequest}>Reveal hint {level + 1}</button>}
    </aside>
  );
}
