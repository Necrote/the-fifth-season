# The Fifth Season

A static, single-player birthday escape-room game built with React, TypeScript, Vite, CSS/SVG, Vitest, and Playwright. The experience is designed for GitHub Pages and uses two physical Alphonse Mucha postcards plus their shipping label as required props.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
npm run test:pages
```

Progress is stored only in the browser under `the-fifth-season:v1`. There is no backend, analytics, authentication, or hard time limit.

## iPhone and production checks

The game has iPhone-safe screen insets, dynamic-height dialogs, 44px-high touch controls, 44px lens targets, and text controls at least 16px on touch devices. Both clock text fields allow a colon-capable keyboard. The horizontal room strip brings the current room into view; rotation, revisiting, hints, dialogs and the final envelope remain usable. Pinch zoom and reduced-motion settings are preserved. If storage is blocked or full, gameplay continues in memory and the footer warns that reloading will lose progress.

The certificate keeps its PNG available after export. On iPhone, an explicit **Share or save image** button uses native file sharing when supported; **Download PNG** and **Open PNG** are persistent alternatives. Sharing is optional, never automatic. Returning from Photos or another app pauses/resumes audio, with the next tap retrying a browser-blocked resume.

`npm run test:pages` builds and tests `dist/` at `http://127.0.0.1:4174/the-fifth-season/` using a strict static server—not Vite's development server or SPA fallback. It checks all artwork, asset paths, full puzzle progression, saved-room reloads, audio, and certificate export. Missing paths really return 404. Use `npm run build` then `npm run preview:pages` to inspect that artifact yourself. This helper is for local QA only; GitHub Pages serves the deployed static files without a backend.

## Assets

The four files in `public/images/seasons/` are crops made from the supplied postcard photographs. The hotspot positions in `src/components/ArtistLens.tsx` were manually calibrated against those crops. If the crops are replaced, recalibrate the named anchors rather than changing their IDs:

- `spring-bouquet`
- `summer-wheat`
- `autumn-fruit`
- `winter-bough`

The fourteen generated illustrations in `public/images/props/` are optimized WebP assets: the artist’s lens, key engraved 26, sealed envelope, torn timestamp slip, certificate border, four numbered witness cards, reusable paper/brass/wood panels, final evidence-photo composition, and the CASE REOPENED gate. Transparent props preserve alpha.

## Sound

An original, browser-synthesized music-box theme and warm ambient chords accompany the case. The Fifth Season reveal switches to a brighter variation and a short celebratory flourish. Plaques, calendar tiles, lens selections, cipher wheels, clocks, digit rollers, hints, routing tickets, and room passages have restrained mechanical or paper sounds. First-time discoveries use dedicated latch, drawer, key, cabinet, bell, and stamp effects; unsuccessful attempts have a quiet mechanical thud.

Sound starts only after player interaction. New defaults are 100% music and 100% effects; prior volume preferences are preserved. Music smoothly fades out during sound effects and returns after the last overlapping effect ends. Use the speaker button for instant mute or **Sound** for independent sliders and a sound preview. Preferences save separately in `the-fifth-season:audio:v1` and survive progress resets. Music pauses in hidden tabs and resumes when returning; unsupported or blocked audio never blocks gameplay. All clues and discoveries remain visible and usable in silence. There are no external audio files, requests, services, or added dependencies.

The authored score and sound envelopes live in `src/audio/score.ts`; mixing, scheduling, and cleanup are in `src/audio/engine.ts`. Unit tests cover action cues, persistence and lifecycle, while browser tests render every sound to a waveform and exercise controls and silent-mode progression.

Each puzzle has a distinct themed failure effect: refused iron lock, quill scratch for unnamed witnesses, glass resonance for lens catches, jammed calendar, slipping cipher gears, blocked cabinet latches, discordant clock bells, returned postal stamp, and paired final locks. Failures remain non-punitive and can be retried; they respect SFX volume and mute. The final envelope opening triggers the celebratory flourish.
