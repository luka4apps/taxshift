# Taxshift

Static Astro site tracking Australian federal tax and super law changes for investors. Data lives in `src/data/*.json`; everything else renders it.

## Commands

| Command | Does |
|---|---|
| `npm run validate` | Schema + business rules over `src/data` (exit 1 on any problem) |
| `npm test` | Unit + data-contract tests (Vitest) |
| `npm run build` then `npm run test:built` | Build to `dist/` and smoke-test the HTML |
| `npm run check` | All of the above, in order |
| `npm run dev` | Local dev server |

Node 24 runs `scripts/*.ts` directly (type stripping); relative imports use `.ts` extensions.

## Where things are

- `src/lib/` — pure, framework-free domain logic (schema, rules, status, risk, timeline, CGT calculator, PR classifier). All tested in `tests/unit/`.
- `src/lib/site.ts` — the only Astro-aware lib module (base path, memoised data).
- `src/components/`, `src/pages/` — views only; no business logic in `.astro` files.
- `agent/daily-research.md` — the daily research routine's instructions (versioned prompt).
- `docs/` — requirements, architecture (ADRs), brand, operations runbook.

## Rules

- Tests first for any new logic in `src/lib/`; name tests `should_…` with Given/When/Then.
- Data objects are `.strict()`: add new fields to `schema.ts` (and a test) before using them.
- Never present a proposal as law. Status comes from `history` via `deriveStatus`, never hard-coded.
- No party colours; stance uses the fixed vocabulary in `risk.ts`.
- One accent colour (`--shift`). Use semantic tokens from `src/styles/tokens.css`, never raw hex in components.
- Internal links go through `href()` so the GitHub Pages base path works.
