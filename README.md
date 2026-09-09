# ZXENO Studio

React + TypeScript + Vite. Native SVG logo portal, procedural Three.js studio composition, and the studio's actual films.

```sh
npm install
npm run dev
npm run build
npm run preview
```

The dev server runs at http://127.0.0.1:5173. `dist/` is the deployable static site.

## Brand palette

Defined once as custom properties at the top of `src/style.css`. Off-white is the ground, green is the accent, and the WebGL scenes in `logo-scene.ts` / `tools-scene.ts` mirror the same values as hex literals.

| Token          | Value     | Role                                                                                                          |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| `--brand`      | `#55A630` | Brand green: fills, bands, buttons. Ink on it is 6.9:1.                                                       |
| `--brand-text` | `#4A9227` | Green display text on paper, 3.4:1 — clears AA for large text, which `--brand` alone does not.                |
| `--brand-deep` | `#2F6B1E` | Small green text and hairlines on paper, 5.7:1.                                                               |
| `--brand-lift` | `#8FD45F` | Green on the dark sections, 11.8:1 on ink.                                                                    |
| `--brand-soft` | `#DFE8D4` | Pale green wash for hovers.                                                                                   |
| `--paper`      | `#F2F1EC` | Warm off-white ground.                                                                                        |
| `--ink`        | `#0F1E09` | Typography and the dark grounds. A near-black carrying the brand hue rather than pure black, 15.3:1 on paper. |

Section grounds come from `data-tone` on each `<section>` (`paper`, `green`, `dark`); the fixed navigation reads the tone of whatever sits beneath it and recolours to match.

### Light and dark

Both themes are defined as two token sets: `:root` and `:root[data-theme="dark"]`. `--ink` and `--paper` are roles rather than fixed colours — `--ink` is always the reading contrast and `--paper` the recessive surface — so every ink/paper pair in the stylesheet inverts on its own. Surfaces that must stay dark in either theme (the film player, the reel portal, video mattes) use `--contrast` instead, and text sitting on bright brand green uses `--on-brand`.

The toggle is the Lucide sun/moon button in the navigation. An explicit choice is stored in `localStorage` under `zxeno-theme` and wins from then on; with nothing stored the site follows `prefers-color-scheme` and keeps following it if the system flips. A small inline script in `index.html` resolves the theme before first paint so there is no light flash. `tools-scene.ts` reads `--tool-body`, `--tool-side` and `--tool-symbol` from the stylesheet and repaints its materials when `data-theme` changes, so the WebGL tools follow the page.

## Motion

`src/reveal.ts` handles entrance motion. Display headings are split into per-line spans at their `<br>` boundaries and rise out of a mask, staggered; everything else fades up as it reaches the reveal line. Absolutely positioned children (the contact arrow) are left out of the split so a mask cannot clip them into a corner.

The trigger is a scroll sweep rather than an `IntersectionObserver`, deliberately. An observer got two cases wrong: content in the final screenful could never satisfy a negative bottom `rootMargin` and stayed invisible permanently, and fast or programmatic scrolling let elements pass through without a callback ever firing. The sweep reveals anything at or above the line, including anything already scrolled past, so no element can end up stranded at `opacity: 0`. Under `prefers-reduced-motion` nothing is split or transitioned — everything is simply marked visible.

Accent words share one voice: `MOTION`, `POSSIBILITIES` and the contact heading's `MATTER.` are Georgia italic in `--brand-text`, set by the `.accent` class.

## Content and media

- `src/content.tsx`: homepage projects, role-based disciplines, and the 12-member team directory. The 10 supplied member emails are linked; Kierre Paolo uses `zaevara.zxeno@gmail.com` as confirmed. John Kenneth Bergonio and V1nks have no supplied email, so none is invented.
- `src/App.tsx`: React page composition and experience lifecycle.
- `src/experience.ts`: intro handoff, media and player wiring, and hashless in-page navigation — section links scroll and focus without ever writing a fragment, so the address bar stays on a bare `/`. A shared `/#section` link still lands on that section, then drops the fragment.
- `src/components/Sections.tsx`: homepage sections, navigation and custom film player.
- `src/logo-scene.ts`: actual extruded ZXENO logo geometry, beveled edges, perspective and directional lighting.
- `src/intro.ts`: 3D assembly, handoff to the original `Main Logo.png` luminance mask, organic SVG openings, and transition into the hero. Plays once per tab session, with a skip control during the intro.
- `src/tools-scene.ts`: actual beveled WebGL objects and extruded tool symbols. The scene spans the whole creative section; dragging a tool moves that tool freely within the section (clamped to the visible plane so it cannot leave), while dragging empty space still turns the cluster. **Reset** returns every tool to its resting position. Set `modelUrl` in `toolModels` to replace an object with a GLB export, centred at the origin, facing +Z, approximately 1.7 units across.
- `public/media`: generated WebP posters, muted 12-second preview loops, and optimized full films. Originals remain in `assets/projects`.
- `scripts/prepare-media.cjs`: optional Windows media regeneration (`node scripts/prepare-media.cjs`). FFmpeg is a development dependency only.

The general studio email and location are based on the existing sibling ZXENO project; member roles, member emails and disciplines follow the updated team brief. No project dates or social accounts were invented. **Red Line** leads the hero reel; **DITO MAXX** follows it in Selected work. Original media files are retained. Section, project and service numbering has been removed.

The supplied `snaptik_7641307590445583630_v3.mp4` reference was reviewed frame by frame. Its small central form, reveal hold and accelerating organic expansion guide the native intro, adapted to the ZXENO identity and a real 3D mark.

Video previews load when visible and pause offscreen, while a film dialog is open, or when the tab is hidden. Full films load only on request. Three.js is essential to the intro; the additional tool geometry loads near its section, caps pixel ratio and pauses offscreen. Drag sideways, select a tool, or use the arrow keys to explore the tools; Home and Reset restore the composition. Mobile preserves vertical page scrolling. Reduced motion disables preview autoplay, continuous 3D motion and scroll masking, and simplifies the intro. When WebGL is unavailable, the native logo reveal, typography and tool labels remain accessible.

## Validation

```sh
npx playwright install chromium
npm test
```

An existing Chromium installation can be used by setting `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to its executable path. Tests cover the session intro and skip control, six responsive widths, lazy video loading, WebGL canvas, player controls, navigation and reduced motion. Screenshots are written to `test-results/`.

Three.js renderer and extrusion implementation follow the [official renderer documentation](https://threejs.org/docs/pages/WebGLRenderer.html) and [ExtrudeGeometry documentation](https://threejs.org/docs/pages/ExtrudeGeometry.html). The bundled Helvetiker font retains its license in `src/fonts/LICENSE`.
