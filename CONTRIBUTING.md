# Contributing

Use this guide when changing Stock Blocks locally or preparing a pull request.

## Development setup

1. Use Node.js 18 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run a development build while working:
   ```bash
   npm run dev
   ```
4. Run the production checks before submitting:
   ```bash
   npm run lint
   npm run build
   ```

## Project structure

- `main.ts` handles the Obsidian plugin lifecycle and registration.
- `src/` contains parsing, data fetching, rendering, and UI components.
- `styles.css` contains plugin styles.
- `manifest.json` contains the Obsidian plugin metadata.
- `versions.json` maps plugin versions to minimum Obsidian app versions.

Keep generated files out of commits unless the release process explicitly requires them. Do not commit `node_modules/` or local vault copies.

## Coding standards

- Keep TypeScript strict and avoid `any`; prefer explicit types and `unknown` with type guards.
- Keep `main.ts` focused on lifecycle and registration work.
- Handle every promise with `await`, `.catch`, a rejection handler, or `void` when intentionally ignored.
- Use `async` arrow callbacks only when they contain an `await`.
- Use Obsidian DOM helpers and avoid `innerHTML`, `outerHTML`, and `createContextualFragment`.
- Use `ownerDocument` or `window.activeDocument` for DOM work so popout windows behave correctly.
- Register timers, events, and DOM listeners with Obsidian cleanup helpers when possible.
- Use sentence case for user-facing text.
- Prefer CSS classes or CSS variables over inline styles.
- Use full 6-digit hex colors and avoid `!important`.
- Avoid deprecated browser or Obsidian APIs.

## Manual testing

After `npm run build`, test the plugin in a local Obsidian vault:

1. Copy `manifest.json`, `main.js`, and `styles.css` to `.obsidian/plugins/stock-blocks/` in the test vault.
2. Reload Obsidian.
3. Enable Stock Blocks in the community plugins settings.
4. Test both `stock-block` and `stock-block-list` code blocks.
5. Check refresh controls, chart tooltips, sorting, link styles, settings, and error states.

## Releases

Releases are created by GitHub Actions after a version bump is merged to `main`.

Use the version helper for release branches:

```bash
npm run update-version patch
```

Use `minor` for new features and `major` for breaking changes. The release workflow builds the plugin, attaches only `main.js`, `manifest.json`, and `styles.css`, and publishes SHA256 checksums in the release notes.

## Pull request checklist

- The change is scoped to the reported bug or feature.
- Documentation and examples are updated when behavior changes.
- `npm run lint` passes.
- `npm run build` passes.
- The plugin was tested in Obsidian when UI or rendering behavior changed.
