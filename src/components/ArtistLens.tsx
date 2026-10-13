import { SEASONS } from '../game/puzzles';
import type { Season } from '../game/types';

type Anchor = { id: string; x: number; y: number; label: string };

// Calibrated against the four crops in public/images/seasons on 2026-10-10.
// Coordinates are percentages of each rendered crop, so responsive scaling is exact.
const ANCHORS: Record<Season, Anchor[]> = {
  spring: [
    { id: 'spring-bouquet', x: 32, y: 30, label: 'Flowers cradled in her arms' },
    { id: 'spring-face', x: 52, y: 15, label: 'The figure’s face' },
    { id: 'spring-feet', x: 22, y: 72, label: 'Plants at her feet' },
    { id: 'spring-hem', x: 55, y: 89, label: 'The green dress hem' },
  ],
  summer: [
    { id: 'summer-wheat', x: 76, y: 56, label: 'Wheat beside the lower figure' },
    { id: 'summer-flowers', x: 34, y: 34, label: 'Flowers in her arms' },
    { id: 'summer-face', x: 58, y: 14, label: 'The figure’s face' },
    { id: 'summer-poppies', x: 51, y: 84, label: 'Poppies near the lower border' },
  ],
  autumn: [
    { id: 'autumn-fruit', x: 29, y: 35, label: 'Basket of yellow fruit in her left hand' },
    { id: 'autumn-halo', x: 48, y: 13, label: 'Mosaic halo' },
    { id: 'autumn-sleeve', x: 80, y: 39, label: 'Patterned sleeve' },
    { id: 'autumn-drapery', x: 32, y: 81, label: 'Lower red drapery' },
  ],
  winter: [
    { id: 'winter-bough', x: 51, y: 12, label: 'Snow-laden boughs above her' },
    { id: 'winter-cloak', x: 58, y: 34, label: 'White cloak' },
    { id: 'winter-trunk', x: 82, y: 52, label: 'Dark tree trunk' },
    { id: 'winter-shrubs', x: 34, y: 76, label: 'Snow-covered foreground shrubs' },
  ],
};


export function numberedAnchors(layout: readonly Season[]) {
  return layout.flatMap((season, portraitIndex) => {
    const offset = SEASONS.indexOf(season);
    const anchors = [...ANCHORS[season].slice(offset), ...ANCHORS[season].slice(0, offset)];
    return anchors.map((anchor, index) => ({ ...anchor, season, number: portraitIndex * 4 + index + 1 }));
  });
}

export function ArtistLens({ selections, onSelect, layout }: { selections: Partial<Record<Season, string>>; onSelect: (season: Season, anchor: string) => void; layout: Season[] }) {
  const numbered = numberedAnchors(layout);
  return <section className="artist-lens lens-combination" aria-labelledby="lens-portraits-heading">
    <h3 id="lens-portraits-heading" className="sr-only">The four portraits</h3>
    <div className="lens-grid">
      {layout.map((season, portraitIndex) => {
        const anchors = numbered.filter((anchor) => anchor.season === season);
        const selected = selections[season];
        return <figure className="lens-portrait" key={season}>
          <div className="artwork-viewport">
            <div className="artwork-stage">
              <img src={`${import.meta.env.BASE_URL}images/seasons/${season}.jpg`} alt={`${season} panel from Alphonse Mucha’s The Seasons, 1900`} />
              <div className="lens-locations" role="radiogroup" aria-label={`Portrait ${portraitIndex + 1} lens locations`} onKeyDown={(event) => {
                const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
                if (!keys.includes(event.key)) return;
                event.preventDefault();
                const index = Math.max(0, anchors.findIndex((anchor) => anchor.id === selected));
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? anchors.length - 1 : (index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) + anchors.length) % anchors.length;
                onSelect(season, anchors[next].id);
                event.currentTarget.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
              }}>
                {anchors.map((anchor, index) => <button key={anchor.id} type="button" role="radio" aria-checked={selected === anchor.id} tabIndex={selected ? selected === anchor.id ? 0 : -1 : index === 0 ? 0 : -1}
                  className={`hotspot ${selected === anchor.id ? 'selected' : ''}`}
                  style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
                  aria-label={`Lens location ${anchor.number}: ${anchor.label}`}
                  onClick={() => onSelect(season, anchor.id)}>{anchor.number}</button>)}
              </div>
            </div>
          </div>
          <figcaption>Portrait {portraitIndex + 1} <span aria-live="polite">{selected ? `· ${anchors.find((anchor) => anchor.id === selected)?.number}` : '· —'}</span></figcaption>
        </figure>;
      })}
    </div>
    <details className="accessible-controls"><summary>Location controls</summary>
      <div className="lens-fallback">{layout.map((season, portraitIndex) => <fieldset key={season}><legend>Portrait {portraitIndex + 1}</legend>
        {numbered.filter((anchor) => anchor.season === season).map((anchor) => <label key={anchor.id}><input type="radio" name={`feature-${season}`} checked={selections[season] === anchor.id} onChange={() => onSelect(season, anchor.id)} /><span>{anchor.number}. {anchor.label}</span></label>)}
      </fieldset>)}</div>
    </details>
  </section>;
}
