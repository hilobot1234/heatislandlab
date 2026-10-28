# Heat Island Lab

A browser-only urban heat island simulator for high school students. Edit an 8 × 8 neighborhood with trees, three building heights, three roof materials, and four ground surfaces. Inspect tiles to see estimated surface temperatures and their material, shade, and nearby-tree contributions.

## Run and check

Requires Node.js 20+ and Python 3. No package installation is needed.

```sh
npm test
npm run build
npm run preview
```

Open http://127.0.0.1:5173. For source development, use `npm run dev`. Stop a server with Ctrl+C. If server ports are unavailable, open the generated `preview.html` directly in a browser: its application code and styles are bundled inline. Source `src/index.html` requires HTTP for local ES module loading.

## Project layout

- `src/`: HTML, CSS, browser modules. `model.js` is a deterministic pure model; `view.js` draws the scene; `app.js` connects controls and results.
- `tests/`: Node's built-in test framework; no arbitrary coverage target. Tests cover editing and meaningful scientific comparisons.
- `docs/MODEL.md`: parameters, assumptions, sources, and manual comparison procedure.
- `skills/urban-heat-model/SKILL.md`: reusable skill for maintaining and checking this educational model. Kept with the project; not installed globally.
- `work/heat-interface.html`: preliminary in-conversation control exploration.
- `dist/`: generated static hosting files. Regenerate after source changes.

Use two-space indentation, ES modules, descriptive camelCase names, and small pure functions for model changes. `.editorconfig` supplies whitespace settings for supporting editors; no linter is configured. `node --check src/app.js` checks syntax; `npm test` checks behavior. Rebuild before testing interface changes, because the integration tests execute the generated standalone preview.

## Controls

Pick a tool and click a 3D tile or its tile-explorer button. Objects replace other objects on that tile, except that the Building tool selects an existing building instead of replacing it; change its height or roof from the menus. Measure temperature selects without editing. Height and roof menus appear only with the Building tool, and the ground menu only with Surface. Changing height or roof edits a selected building; changing ground edits the selected tile even beneath an object. Remove deletes only the object. Start over restores empty asphalt; Load example restores the initial mixed neighborhood. Heat colors toggles temperature colors in the 3D view. The labeled color legend remains fixed for fair comparisons. The readout's heat budget shows how air temperature, material heating, shade, and nearby trees add up to each tile's estimate. Tile-explorer numbers always show temperatures, even when 3D heat colors are off.

Three.js 0.160.1 loads from jsDelivr at runtime. If it or WebGL is unavailable, an offline-capable canvas renderer draws an isometric 3D projection with the same controls and model. Fonts (Bricolage Grotesque, Atkinson Hyperlegible, JetBrains Mono) load from Google Fonts; system fonts take over offline. No accounts, API keys, analytics, or backend are used. Edits stay in memory and restart on page reload.

## Host

Run `npm run build`, then upload the **contents** of `dist/` to any static host. The entry file is `index.html`; serve `.js` as JavaScript and use HTTPS. No server functions or environment variables are required. Relative asset links support subdirectory hosting. For a CSP, allow the pinned `https://cdn.jsdelivr.net` module or rely on the local fallback.

Netlify settings live in `netlify.toml`: it runs `npm run build` with Node 20 and publishes `dist/`. Connected to GitHub, Netlify redeploys on every push to `main`.

## Verification limits

The 20 automated checks cover controlled model comparisons, the bundled application's actual control handlers, and offline canvas tile picking with DOM/canvas adapters. They do not replace visual browser testing or validate the Three.js/WebGL path. In this workspace local server binding was denied and native browser automation was interrupted, so visual desktop/mobile checks remain pending. The Skill Creator validator also lacked its PyYAML dependency; the skill's frontmatter and linked files were checked separately.

## Science

Temperatures are illustrative **surface** estimates, not air temperatures or forecasts. Read [the model documentation](docs/MODEL.md) before changing coefficients. Sources support mechanisms; all model numerical parameters are explicitly illustrative. Validate comparisons whenever you modify the model.
