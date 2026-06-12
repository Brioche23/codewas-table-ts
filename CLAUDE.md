# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # tsc -b && vite build (TypeScript check + production bundle)
npm run lint      # ESLint with flat config (eslint.config.js)
npm run preview   # Preview production build locally
```

There are no automated tests. The app is a browser-only SPA — verify changes by running `npm run dev` and using the UI.

## Architecture

CodeWAS Table is an epidemiological data visualization tool (GWAS/EHR analysis). It supports two data source formats loaded entirely in-browser:

- **JSON mode** → `MainTable.tsx` — Material React Table with hierarchical row expansion
- **DuckDB mode** → `DuckDbExplorer.tsx` — Full in-browser SQL via DuckDB WASM, with lazy-loading hierarchy, filter presets stored in localStorage, and multiple visualization modes

### Data Flow

```
File/URL input
    ↓
useDataSource (src/hooks/useDataSource.ts)
    ├─ .json  → JsonDataSource { rows: ConceptRow[] }
    └─ .duckdb → DuckDbDataSource (src/utils/duckdb.ts — singleton WASM runtime)
                  ↳ exposes runQuery() for dynamic SQL
    ↓
App.tsx — routes to MainTable or DuckDbExplorer
```

### Core Data Type

`ConceptRow` (src/utils/types.ts) is the central type: each row is a medical concept with nested arrays for each analysis type (Binary, Counts, Age, Days, Continuous, Categorical). Sub-arrays follow a fixed indexing convention — `n_*[index]` for counts, `t_*[index][index]` for test results, `d_*[index][index]` for distributions. The `index` maps to a position in `constants.ts` column definitions.

### Key Architectural Patterns

**ColumnFactory** (`src/table/ColumnFactory.tsx`): Generates all MRT column definitions dynamically. Uses `makeStatGroup()` to create grouped columns per analysis type. Cell renderers (`CasesControlCell`) do side-by-side case/control stats display. Effect size thresholds per column control conditional highlighting.

**Count Mode**: Concepts can be counted as exact codes (`"code"`) or all descendants (`"descendant"`). This global filter (`countMode` state) affects both table rows and chart data — it is not a MRT column filter.

**DuckDB singleton** (`src/utils/duckdb.ts`): The WASM runtime is initialized once via `runtimePromise` and reused. File buffers are registered by name and opened as databases. DuckDB WASM workers/binaries are bundled by Vite.

**Hierarchy**: Two separate implementations:
- JSON mode: MRT `getSubRows` callback filtering by `ancestorConceptIds`
- DuckDB mode: Lazy SQL queries triggered on row expand (see `DuckDbExplorer.tsx`)

**Visualizations**: D3 scales + custom SVG (no chart library for most charts). `src/components/charts/` has domain-specific charts (Heatmap with clustering, Scatter, SlopeChart). `@mui/x-charts` is used only for ScatterChart. Three.js is a dependency but not actively used in the main features.

### TypeScript Config

Strict mode with `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. Module resolution is `bundler`. Target ES2023. The build will fail on unused variables — remove or prefix with `_` when needed.
