# 04 — Operations runbook

How Taxshift runs itself, and what the owner does when it doesn't.

---

## Daily cycle

| Time (Sydney) | What | Where |
|---|---|---|
| ~05:00 | Research routine runs `agent/daily-research.md`, opens PR `bot/daily-DATE` | Claude Code cloud routine |
| minutes later | PR gate: validate, test, build, classify | `.github/workflows/pr-gate.yml` |
| | Minor only → auto-merge + deploy | |
| | Material → `needs-review` label, @mention to owner | |
| ~06:00–07:00 | Daily deploy (refreshes countdowns) + stale-data alarm | `.github/workflows/deploy.yml` |

## What counts as material

Anything except: `meta.json`, a measure's `lastVerified`, newly added sources, a source's `accessed` date, and new change-log entries. Any file outside `src/data/` is always material. The rule lives in `src/lib/classify.ts` (`MINOR_RULES`).

## Owner tasks

| When | Do |
|---|---|
| GitHub notifies you of a `needs-review` PR | Open it in GitHub mobile. Check each change against its source link. Merge to publish, or close. |
| A research PR fails checks | Nothing is published. Read the PR body; fix the data or close the PR. |
| A `stale-data` issue opens | The routine hasn't run for 3+ days. Check claude.ai/code → Routines; re-run it. Close the issue once fresh data lands. |
| Someone reports an error (GitHub issue) | Fix the JSON in `src/data`, add a `material` change-log entry, open a PR. |

## Changing the research behaviour

Edit `agent/daily-research.md` in a PR. The routine reads it fresh on every run.

## Custom domain (optional)

1. Buy the domain (e.g. `taxshift.au`, which had no DNS records on 20 Nov 2026).
2. Repo Settings → Pages → Custom domain; add the DNS records GitHub shows.
3. Repo Settings → Secrets and variables → Actions → Variables: `SITE_URL=https://taxshift.au`, `BASE_PATH=/`.
4. Re-run the Deploy workflow.

## Fallbacks if the cloud routine is unavailable

- **Local:** create a Claude desktop scheduled task with the prompt "In C:\source\taxshift, follow agent/daily-research.md" (runs only while the PC is on).
- **API:** a GitHub Action calling the Claude API with the same prompt (needs an `ANTHROPIC_API_KEY` secret; pay-per-use).
