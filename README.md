# Taxshift

**What changed. When it bites. Who wants to change it back.**

A free, non-partisan tracker of Australian federal tax and super law changes for property investors, share investors, SMSF trustees and business owners: Budget 2026-27's CGT overhaul, negative gearing limits, SMSF borrowing rules, Division 296, the trust minimum tax and more.

- Every fact links to its source, official sources first.
- Checked every day by an AI research agent; material changes are approved by a person before publishing.
- General information only, not financial, tax or legal advice.

## How it works

```
Claude cloud routine (daily) ──PR──▶ PR gate (validate · test · classify)
                                       ├─ minor ─▶ auto-merge ─▶ GitHub Pages
                                       └─ material ─▶ owner review ─▶ merge ─▶ GitHub Pages
```

Static [Astro](https://astro.build) site, data in `src/data/*.json`, zero servers, zero running cost.

## Develop

```sh
npm install
npm run dev      # local site
npm run check    # validate data, unit tests, build, built-site tests
```

## Docs

- [Business requirements](docs/01-business-requirements.md)
- [Architecture and decisions](docs/02-architecture.md)
- [Brand](docs/03-brand.md)
- [Operations runbook](docs/04-operations.md)
- [Research agent prompt](agent/daily-research.md)

## Data

The data is open: plain JSON under `src/data`, validated against `src/lib/schema.ts`. Spot an error? [Open an issue](https://github.com/luka4apps/taxshift/issues/new).
