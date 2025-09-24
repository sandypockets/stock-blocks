# Stock Blocks Plugin - Copilot PR Review Instructions

> **Audience**: GitHub Copilot for PR reviews  
> **Project**: Obsidian Stock Blocks Plugin - displays stock prices, charts & sparklines  
> **Source of truth**: Always read **AGENTS.md** first for general Obsidian plugin conventions

## Stock Blocks Plugin Context

This is a **zero-dependency** Obsidian plugin that displays stock data in two formats:
- `stock-block-list`: Multi-stock compact tables with sparklines  
- `stock-block`: Single-stock detailed charts (candlestick, line, sparkline)

### Critical Files & Components
When reviewing PRs, examine these in priority order:
1. **Core Architecture**: `main.ts`, `AGENTS.md` (plugin lifecycle & conventions)
2. **Configuration Parsing**: `src/utils/config-parser.ts` (backwards compatibility is CRITICAL)
3. **Data Layer**: `src/services/stock-data.ts` (network calls, caching, API handling)  
4. **UI Components**: `src/components/stock-list.ts`, `src/components/stock-chart.ts`
5. **Settings**: `src/components/settings-tab.ts`, `src/settings.ts`
6. **Documentation**: `README.md`, `demo.md` (must reflect behavior changes)
7. **Build & Release**: `manifest.json`, `versions.json`, `package.json`, `esbuild.config.mjs`

## Stock Blocks Specific Review Checklist

### 1) Summarize the change
- **Required**: 3–6 bullets referencing **file paths** and **user-facing impact**
- **Focus areas**: Config parsing changes, new stock data sources, chart rendering modifications, settings changes
- **Risk callouts**: Plugin lifecycle (`onload`/`onunload`), network calls (Yahoo Finance API), data caching, file I/O

### 2) Stock Blocks Core Functionality & Safety

**Configuration Parsing (`src/utils/config-parser.ts`):**
- **CRITICAL**: Multiple property name aliases must remain supported without breaking existing notes
- **Stock lists**: `tickers | symbols | stocks | ticker | symbol | stock` (all must work identically)
- **Stock charts**: `symbol | symbols | stock | stocks | ticker | tickers` (all must work identically)  
- Parser changes must be **backwards-compatible** and **idempotent**
- Test edge cases: empty values, malformed YAML, mixed property names, case variations

**Data Service (`src/services/stock-data.ts`):**
- All network calls go through `requestUrl()` (Obsidian API) - never direct fetch/axios
- Caching logic must handle Yahoo Finance rate limits gracefully
- Error handling for network timeouts, API failures, invalid symbols
- Data validation for price/OHLC data before rendering
- Memory cleanup for large datasets

**Component Architecture:**
- Stock components registered via `this.addChild()` for proper cleanup
- Refresh callbacks properly dispose previous renders
- Canvas/SVG elements are cleaned up in component destruction
- Settings changes trigger appropriate component re-renders

### 3) Stock Blocks Testing Patterns
- **Config Examples**: If config parsing changed, require demonstration notes showing:
  - Multiple property name variations working identically
  - Edge cases: empty tickers, malformed inputs, huge lists (50+ symbols)
  - Mixed old/new syntax in same vault
- **Chart Rendering**: Verify charts render correctly with various data scenarios:
  - Stocks with gaps/weekends (business days vs calendar days)
  - Very recent IPOs with limited history  
  - Symbols with special characters or international exchanges
- **Performance**: Test with 20+ symbols in one list, ensure no blocking behavior

### 4) Build, lint, and scripts (Stock Blocks specific)
- **Package Manager**: npm only (project has npm-specific scripts)
- **Required Scripts**: 
  - Dev: `npm run dev` (esbuild watch mode)
  - Build: `npm run build` (TypeScript check + production esbuild bundle)
  - Lint: `npm run lint` and `npm run lint:fix` (ESLint with TypeScript)
  - Version: `npm run version` (automated version bumping with git staging)
- **Bundler**: esbuild (config in `esbuild.config.mjs`) - changes must maintain zero-dependency principle
- **Zero Dependencies**: Runtime dependencies forbidden - everything must bundle into `main.js`

### 5) Release artifacts & versioning (Stock Blocks specific)
**If version bump detected:**
- `manifest.json` version follows SemVer (**no leading `v`**)
- `versions.json` updated with matching entry
- Version bump scripts (`version-bump.mjs`, `update-version.mjs`) handle automation correctly
- **Required release assets**: `main.js`, `manifest.json`, `styles.css`, `SHA256SUMS` (security verification)
- **Never change**: `id: "stock-blocks"` in manifest (breaks existing installations)

### 6) Stock Blocks Documentation & UX
**Documentation consistency:**
- `README.md`: Must reflect any config changes, especially property aliases
- `demo.md`: Should show practical examples of changed features
- Settings UI: Copy matches documentation, uses sentence case

**User Experience:**
- Error messages reference Yahoo Finance specifically when relevant
- Loading states for network requests
- Graceful degradation when API is unavailable
- Settings descriptions explain stock market concepts clearly

### 7) Privacy, security, compliance (Stock Blocks specific)
**Network & Data Security:**
- **Default behavior**: Plugin works offline with cached data
- **External APIs**: Only Yahoo Finance queries - explicitly documented in README security section
- **No PII collection**: Never send vault contents, filenames, or user data
- **Data scope**: Only stock symbols and requested date ranges sent to Yahoo Finance
- **Opt-in principle**: Any new external services require settings toggle + README disclosure
- **Integrity verification**: SHA256 checksums for all releases (already implemented)

### 8) Performance (Stock Blocks specific)
**Startup Performance:**
- `onload()` creates service instances but no immediate network calls
- Stock data fetching only triggered by block rendering
- Cache initialization deferred until first use

**Runtime Performance:**
- Data service caching prevents redundant API calls
- Large stock lists (20+ symbols) use batch processing
- Canvas rendering for sparklines optimized for multiple charts
- Component cleanup prevents memory leaks in long documents

### 9) Stock Blocks Architecture & Maintainability
**Code Organization:**
- `main.ts`: Minimal lifecycle + block processor registration only
- Feature logic properly separated into `src/` modules:
  - `services/`: Data fetching, caching (network boundary)
  - `components/`: UI rendering, user interaction  
  - `utils/`: Pure functions, calculations, helpers
- **File size guideline**: Keep individual files < 300-400 lines
- **Type safety**: Strict TypeScript, avoid `any` especially for stock data structures

### 10) Output format (Copilot, follow exactly)
Produce sections in this order:

**Summary**  
- bullets with file paths and user impact

**Strengths**  
- what’s good, concise bullets

**Risks / Requests**  
- concrete asks blocking merge; cite lines/files

**Suggested Tests / Examples**  
- specific edge cases or demo notes to add

## Diff-aware heuristics

- **If `src/utils/config-parser.ts` changed**: verify all accepted property aliases are covered in parsing + docs:  
  - Stock lists: `tickers | symbols | stocks | ticker | symbol | stock`  
  - Stock charts: `symbol | symbols | stock | stocks | ticker | tickers`  
  Request demonstration notes showing property alias compatibility and updated snippets in `README.md`/`demo.md`.

- **If `main.ts` changed**: confirm new listeners/intervals are registered with `this.register*` and cleaned up in `onunload`.

- **If `manifest.json` or `versions.json` changed**: check SemVer rules, `minAppVersion`, and community catalog requirements.

- **If build config changed (`esbuild.config.mjs`)**: ensure externals are bundled; no regressions that would ship broken `main.js`.

## File/area ownership
- Plugin lifecycle (`main.ts`): route risky changes to maintainers.
- Config parsing (`src/utils/config-parser.ts`): route to maintainers.
- Docs (`README.md`, `demo.md`): require in-PR updates when behavior changes.

## Ignore / out of scope
- Generated or vendored files: `dist/`, `node_modules/`, `*.map`, `*.gen.*`, build outputs.
- Drive-by refactors unrelated to the diff—do not request them unless they fix correctness/security.

## Commands Copilot can assume
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Acceptance checklist (Copilot must verify)
- [ ] Builds with `npm run build` and produces a single `main.js` bundle.  
- [ ] No new network calls without opt-in + docs.  
- [ ] All new listeners/intervals are registered and auto-disposed.  
- [ ] Docs/examples updated when behavior changes.  
- [ ] Versioning/release steps consistent if version bump appears.  
