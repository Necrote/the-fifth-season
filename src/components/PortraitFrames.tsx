import { useEffect, useRef, useState } from 'react';
import type { Season } from '../game/types';

export function PortraitFrames({ layout }: { layout: Season[] }) {
  const [inspected, setInspected] = useState<Season | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (inspected) dialog.current?.showModal(); else dialog.current?.close(); }, [inspected]);
  return <>
    <div className="final-frames">
      {layout.map((season) => <button className="portrait-frame" key={season} onClick={() => setInspected(season)} aria-label={`Inspect ${season} portrait`}>
        <img src={`${import.meta.env.BASE_URL}images/seasons/${season}.jpg`} alt={`${season} — Alphonse Mucha, The Seasons, 1900`} />
      </button>)}
      <div className="empty-frame" aria-label="Fifth frame, sealed">V</div>
    </div>
    <dialog className="portrait-dialog" ref={dialog} aria-label={inspected ? `${inspected} portrait` : 'Portrait'} onCancel={() => setInspected(null)}>
      <button className="button quiet" onClick={() => setInspected(null)}>Close portrait</button>
      {inspected && <img src={`${import.meta.env.BASE_URL}images/seasons/${inspected}.jpg`} alt={`Complete ${inspected} portrait`} />}
    </dialog>
  </>;
}
