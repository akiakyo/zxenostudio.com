# ZXENO Studio

React + TypeScript + Vite. Native SVG logo portal, procedural Three.js studio composition, and the studio's actual films.

```sh
npm install
npm run dev
npm run build
npm run preview
```

The dev server runs at http://127.0.0.1:5173. `dist/` is the deployable static site.

## Content and media

- `src/content.tsx`: homepage projects, role-based disciplines, and the 12-member team directory. The 10 supplied member emails are linked; Kierre Paolo uses `zaevara.zxeno@gmail.com` as confirmed. John Kenneth Bergonio and V1nks have no supplied email, so none is invented.
- `src/App.tsx`: React page composition and experience lifecycle.
- `src/experience.ts`: intro handoff, media and player wiring, and hashless in-page navigation — section links scroll and focus without ever writing a fragment, so the address bar stays on a bare `/`. A shared `/#section` link still lands on that section, then drops the fragment.
- `src/components/Sections.tsx`: homepage sections, navigation and custom film player.
- `src/logo-scene.ts`: actual extruded ZXENO logo geometry, beveled edges, perspective and directional lighting.
- `src/intro.ts`: 3D assembly, handoff to the original `Main Logo.png` luminance mask, organic SVG openings, and transition into the hero. Plays once per tab session, with a skip control during the intro.
- `src/tools-scene.ts`: actual beveled WebGL objects and extruded tool symbols. Set `modelUrl` in `toolModels` to replace an object with a GLB export, centred at the origin, facing +Z, approximately 1.7 units across.
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
