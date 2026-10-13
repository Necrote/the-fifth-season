export function DigitRollers({ label, digits, value, onChange }: { label: string; digits: number; value: string; onChange: (value: string) => void }) {
  const spin = (index: number, step: number) => {
    const next = value.padEnd(digits, '0').split('');
    next[index] = String((Number(next[index]) + step + 10) % 10);
    onChange(next.join(''));
  };
  return (
    <div className="routing-slot">
      <h2>{label}</h2>
      <div className="digit-rollers" aria-label={`${label} digit rollers`}>
        {Array.from({ length: digits }, (_, index) => <div className="digit-roller" key={index}>
          <button type="button" onClick={() => spin(index, 1)} aria-label={`${label} digit ${index + 1} increase`}>▴</button>
          <output aria-label={`${label} digit ${index + 1}`}>{value[index] ?? '—'}</output>
          <button type="button" onClick={() => spin(index, -1)} aria-label={`${label} digit ${index + 1} decrease`}>▾</button>
        </div>)}
      </div>
      <details className="accessible-controls"><summary>Text entry</summary>
        <label>{label}<input inputMode="numeric" value={value} maxLength={digits} onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, digits))} /></label>
      </details>
    </div>
  );
}
