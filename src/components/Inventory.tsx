export function Inventory({ items }: { items: string[] }) {
  const evidence: Record<string, string> = {
    'Case File': 'The warden’s case has been reopened. Four witnesses await their names.',
    'Brass Key · 26': 'A key engraved 26, from the seam between Summer and Autumn.',
    'Sealed Photograph': 'Held for the fifth frame. The paper forgot what the photograph kept.',
    'Timestamp Strip': 'October 26, 2025 · [time torn away] · New York. One instant; two local times.',
    'Archive Code · 23': '23. A turning number, punched into brass.',
    'Cipher Wheel': 'The alphabet mechanism remains on the Cipher Desk.',
  };
  return (
    <aside className="inventory" aria-label="Case inventory">
      <h2>Evidence</h2>
      {items.length ? <ul>{items.map((item) => <li key={item}>{evidence[item] ? <details><summary>{item}</summary><p>{evidence[item]}</p></details> : item}</li>)}</ul> : <p>Your evidence tray is empty.</p>}
    </aside>
  );
}
