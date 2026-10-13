import type { ClockState } from '../game/types';

type CityKey = 'ny' | 'mum';

function parseTime(value: string) {
  const [hour = '12', minute = '00'] = value.split(':');
  return { hour: Math.min(12, Math.max(1, Number(hour) || 12)), minute: Math.min(59, Math.max(0, Number(minute) || 0)) };
}

function ClockFace({ value, label, onChange }: { value: string; label: string; onChange: (time: string) => void }) {
  const { hour, minute } = parseTime(value);
  const update = (hourDelta: number, minuteDelta: number) => {
    let total = ((hour % 12) * 60 + minute + hourDelta * 60 + minuteDelta + 720) % 720;
    const nextHour = Math.floor(total / 60) || 12; const nextMinute = total % 60;
    onChange(`${nextHour}:${String(nextMinute).padStart(2, '0')}`);
  };
  const minuteAngle = minute * 6; const hourAngle = (hour % 12) * 30 + minute * .5;
  return <div className="clock-control">
    <svg className="clock-face" viewBox="0 0 240 240" role="img" aria-label={`${label} clock showing ${value}`} tabIndex={0} onKeyDown={(event) => { if (event.key === 'ArrowRight') update(0, 5); if (event.key === 'ArrowLeft') update(0, -5); if (event.key === 'ArrowUp') update(1, 0); if (event.key === 'ArrowDown') update(-1, 0); }}>
      <circle cx="120" cy="120" r="106" className="clock-rim" />
      {Array.from({ length: 12 }, (_, i) => { const angle = i * Math.PI / 6; const x = 120 + Math.sin(angle) * 86; const y = 120 - Math.cos(angle) * 86; return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{i || 12}</text>; })}
      <line x1="120" y1="120" x2="120" y2="68" className="hour-hand" transform={`rotate(${hourAngle} 120 120)`} />
      <line x1="120" y1="120" x2="120" y2="42" className="minute-hand" transform={`rotate(${minuteAngle} 120 120)`} />
      <circle cx="120" cy="120" r="7" className="clock-pin" />
    </svg>
    <div className="hand-controls"><button type="button" onClick={() => update(-1, 0)}>Hour −</button><button type="button" onClick={() => update(1, 0)}>Hour +</button><button type="button" onClick={() => update(0, -5)}>Minute −</button><button type="button" onClick={() => update(0, 5)}>Minute +</button></div>
  </div>;
}

export function TwinClocks({ clocks, onChange }: { clocks: ClockState; onChange: (value: ClockState) => void }) {
  const set = (key: keyof ClockState, value: string) => onChange({ ...clocks, [key]: value });
  const renderCity = (city: CityKey, cityName: string) => {
    const dateKey = `${city}Date` as keyof ClockState; const timeKey = `${city}Time` as keyof ClockState; const periodKey = `${city}Period` as keyof ClockState;
    return <article className="city-clock">
      <header><h2>{cityName}</h2></header>
      <ClockFace label={cityName} value={clocks[timeKey]} onChange={(value) => set(timeKey, value)} />
      <details className="clock-fallback" open><summary>Keyboard & text entry</summary>
        <label>Date<input type="date" value={clocks[dateKey]} onChange={(e) => set(dateKey, e.target.value)} /></label>
        <label>Local time<input type="text" inputMode="text" autoComplete="off" autoCorrect="off" spellCheck={false} pattern="[0-9]{1,2}:[0-9]{2}" value={clocks[timeKey]} onChange={(e) => set(timeKey, e.target.value)} aria-describedby={`${city}-format`} /></label>
        <small id={`${city}-format`}>Use H:MM.</small>
        <label>Period<select value={clocks[periodKey]} onChange={(e) => set(periodKey, e.target.value)}><option>AM</option><option>PM</option></select></label>
      </details>
    </article>;
  };
  return <div className="twin-clocks">{renderCity('ny', 'New York')}<div className="clock-link" aria-label="Same instant"><span>ONE INSTANT</span><b>↔</b><span>TWO LOCAL TIMES</span></div>{renderCity('mum', 'Mumbai')}</div>;
}
