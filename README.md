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

Playwright includes desktop Chromium, touch Chromium, WebKit/iPhone 13, and a narrow 320px WebKit profile. Automated coverage is not a physical iPhone certification. Windows WebKit lacks Web Audio and can have display-scaling problems; run the complete suite on Linux/macOS (the Pages workflow uses Ubuntu), and follow the [real iPhone and Pages checklist](docs/IPHONE_AND_PAGES_TESTING.md) before handing over the postcards.

## Assets

The four files in `public/images/seasons/` are crops made from the supplied postcard photographs. The hotspot positions in `src/components/ArtistLens.tsx` were manually calibrated against those crops. If the crops are replaced, recalibrate the named anchors rather than changing their IDs:

- `spring-bouquet`
- `summer-wheat`
- `autumn-fruit`
- `winter-bough`

The supplied escape photograph is retained unchanged at `public/images/escape-photo.jpg` as the source image. It was converted locally from `IMG_9191.HEIC` to a 1350×1800 JPEG (about 306 KiB), preserving the full portrait composition and removing EXIF metadata. The original HEIC is not part of the project. The Memory Cabinet’s torn evidence slip gives the date and city but deliberately omits the time; the player consults the original photo already on their phone. At the ending, opening the illustrated envelope reveals `public/images/props/warden-evidence-photo.webp`: one generated evidence-photo composition based on the actual photo, with a matching completed timestamp slip. The source photo is preserved; the composition is an illustrated derivative. Its label and the clock answers remain October 26, 2025 · 11:15 AM New York / 8:45 PM Mumbai. Envelope-opening progress persists across reloads. Before sharing, verify the phone’s capture timestamp and timezone, not the stripped web JPEG or file-modified time.

The fourteen generated illustrations in `public/images/props/` are optimized WebP assets: the artist’s lens, key engraved 26, sealed envelope, torn timestamp slip, certificate border, four numbered witness cards, reusable paper/brass/wood panels, final evidence-photo composition, and the CASE REOPENED gate. Transparent props preserve alpha. The built-in imagegen skill produced the artwork; [generation prompts](docs/ILLUSTRATION_PROMPTS.md) document the complete prompt set. The supplied postcard crops and calibrated hotspot coordinates are unchanged.

## Revised room interactions

The latest requested design changes are implemented in the canonical puzzle definitions. Written witness descriptions and portraits shuffle for each case. Typed painting names open a separate lens compartment; no portraits or answer tiles are shown in that first section. Examining the generated lens reveals all four complete portraits, with locations numbered continuously 1–16 in display order. Each portrait accepts only one selection, and the full combination—not individual clicks—is validated. The drawer directly grants the calendar tiles instead of displaying a dangling `SEED` clue. Both gallery substeps and their independent hint progress persist across reloads; old completed galleries migrate without relocking.

Room exits require an explicit click after solving; discovered evidence remains visible and saved. Calendar tiles use buttons, postal digits use brass rollers, and lens choices have radio-button/arrow-key controls with an expandable text alternative. Explanatory cipher copy and the birthday-date calculation now live in optional hints. The final Caesar lock still uses archive shift **23**: `TOGETHER` → `QLDBQEBO`, but the Final Gallery no longer prints the archive number next to its note. The earlier Cipher Desk remains shift 4: `PHOTO` → `TLSXS`. The sender-held phrase remains unchanged. Both wheels start at shift 17 for a new case; saved wheel positions are preserved and their solution shifts remain 4 and 23. The illustrated certificate PNG incorporates the player’s actual elapsed time. “You Escaped!” now uses the larger 58px type and “Happy Birthday!” the smaller 30px type, with matching preview styling.

Witness cards now use generated illustrations and stylized numbered headings. Similar evidence notes, recovered objects, calendar/clock/postal surfaces and clue panels throughout all rooms use the illustrated paper, brass and wood theme, while their text stays selectable and accessible. Paper cards now use nine-slice illustrated borders with reserved margins, keeping headings, body text and controls clear of ornament as cards resize or text grows. The lens has a visible “Examine” affordance. Birthday A/B displays are removed from the gate and case-file inventory; the cipher’s optional hint still provides the unchanged dates. Twin Clocks shows only the two city names, never their postal codes—the physical shipping label supplies those later.

Before publishing, confirm permission to use the supplied postcard photographs. Mucha’s underlying 1900 artwork may be public domain while a modern reproduction or photograph can have separate rights.

## Sound

An original, browser-synthesized music-box theme and warm ambient chords accompany the case. The Fifth Season reveal switches to a brighter variation and a short celebratory flourish. Plaques, calendar tiles, lens selections, cipher wheels, clocks, digit rollers, hints, routing tickets, and room passages have restrained mechanical or paper sounds. First-time discoveries use dedicated latch, drawer, key, cabinet, bell, and stamp effects; unsuccessful attempts have a quiet mechanical thud.

Sound starts only after player interaction. New defaults are 100% music and 100% effects; prior volume preferences are preserved. Music smoothly fades out during sound effects and returns after the last overlapping effect ends. Use the speaker button for instant mute or **Sound** for independent sliders and a sound preview. Preferences save separately in `the-fifth-season:audio:v1` and survive progress resets. Music pauses in hidden tabs and resumes when returning; unsupported or blocked audio never blocks gameplay. All clues and discoveries remain visible and usable in silence. There are no external audio files, requests, services, or added dependencies.

The authored score and sound envelopes live in `src/audio/score.ts`; mixing, scheduling, and cleanup are in `src/audio/engine.ts`. Unit tests cover action cues, persistence and lifecycle, while browser tests render every sound to a waveform and exercise controls and silent-mode progression.

Each puzzle has a distinct themed failure effect: refused iron lock, quill scratch for unnamed witnesses, glass resonance for lens catches, jammed calendar, slipping cipher gears, blocked cabinet latches, discordant clock bells, returned postal stamp, and paired final locks. Failures remain non-punitive and can be retried; they respect SFX volume and mute. The final envelope opening triggers the celebratory flourish.

## Deploy to GitHub Pages

The workflow at `.github/workflows/deploy-pages.yml` runs unit tests and Chromium/WebKit development and production browser checks, then deploys only the tested `dist/` whenever `main` is pushed. Failed checks prevent publication and retain browser traces for seven days. Nothing is published by local testing commands.

1. Create a GitHub repository named `the-fifth-season` and push this project to `main`.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source.
3. In **Settings → Actions → General**, ensure workflows have permission to read repository contents and deploy Pages.
4. Push `main` or run **Deploy to GitHub Pages** manually from the Actions tab.
5. Wait for the workflow’s `Deploy` step and open the URL it reports.

The production Vite base is `/the-fifth-season/`. If the repository name changes, update `base` in `vite.config.ts`. For a root custom domain, use `/` and add the domain’s `CNAME` file under `public/`.

## QR-link setup

After the first successful deployment, the default stable entry URL is:

```text
https://YOUR-GITHUB-USERNAME.github.io/the-fifth-season/
```

1. Open that URL from a private/incognito window and complete at least the gate on both desktop and phone.
2. Generate a static QR code that contains the exact HTTPS URL. Do not use a redirect or expiring QR service.
3. Test the QR from a phone on cellular data, not only the same Wi-Fi network.
4. Print a small proof and verify scan distance before making the final sticker or slip.
5. Place it only in an unused postcard-back margin or on a removable slip; do not cover artwork, handwriting, postage, barcode, or shipping label.

The QR is only an entry link. Delivery date and mailing timestamp are not used by any puzzle.

## Privacy and reset behavior

The app does not send or log answers. Postal codes are game props and are visible in the static JavaScript bundle; they are not security secrets. The sender-held phrase is likewise a social ritual, not cryptographic protection. “Reset progress” and “Replay” both require confirmation before local data is cleared.

The creator-only solution path is documented in [docs/CREATOR_WALKTHROUGH.md](docs/CREATOR_WALKTHROUGH.md). Do not print or mail that file with the postcards.
