import { useRef, useId, type PointerEvent } from 'react';
import { caesarDecode } from '../game/validators';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function CipherWheel({ shift, onShift, ciphertext }: { shift: number; onShift: (value: number) => void; ciphertext: string }) {
  const headingId = useId();
  const drag = useRef<{ pointerId: number; angle: number; shift: number } | null>(null);
  const change = (delta: number) => onShift((shift + delta + 26) % 26);
  const angleAt = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - bounds.top - bounds.height / 2, event.clientX - bounds.left - bounds.width / 2);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    let delta = angleAt(event) - drag.current.angle;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    const steps = Math.round(delta / (2 * Math.PI / 26));
    onShift((drag.current.shift + steps + 26) % 26);
  };
  return (
    <section className="cipher-tool" aria-labelledby={headingId}>
      <div className="wheel-copy">
        <p className="eyebrow">Brass alphabet mechanism</p>
        <h2 id={headingId}>Caesar wheel</h2>
      </div>
      <div className="cipher-wheel" style={{ '--wheel-shift': `${shift * 360 / 26}deg` } as React.CSSProperties} aria-hidden="true"
        onPointerDown={(event) => {
          if (drag.current || !event.isPrimary || event.button !== 0) return;
          drag.current = { pointerId: event.pointerId, angle: angleAt(event), shift };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={(event) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}
        onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}>
        <div className="wheel-ring outer">{alphabet.map((letter, i) => <span key={letter} style={{ transform: `rotate(${i * 13.846}deg)` }}>{letter}</span>)}</div>
        <div className="wheel-ring inner">{alphabet.map((letter, i) => <span key={letter} style={{ transform: `rotate(${i * 13.846}deg)` }}>{letter}</span>)}</div>
        <div className="wheel-center"><small>SHIFT</small><strong>{shift}</strong></div>
      </div>
      <div className="wheel-controls">
        <button type="button" className="round-button" onClick={() => change(-1)} aria-label="Decrease cipher shift">−</button>
        <label>Shift
          <input type="range" min="0" max="25" value={shift} onChange={(event) => onShift(Number(event.target.value))} />
        </label>
        <button type="button" className="round-button" onClick={() => change(1)} aria-label="Increase cipher shift">+</button>
      </div>
      <div className="output-strip" aria-live="polite"><span>{ciphertext}</span><b aria-hidden="true">→</b><strong>{caesarDecode(ciphertext, shift)}</strong></div>
    </section>
  );
}
