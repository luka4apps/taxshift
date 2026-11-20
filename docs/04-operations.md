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

## One-time setup for the research routine

Found by the first test run on 20 Nov 2026. Without these, the routine can't open PRs or read primary sources.

1. **GitHub access:** install the Claude GitHub App on `luka4apps/taxshift` (github.com/apps/claude → Configure → select the repo). Without it, push and branch creation return 403.
2. **Network allowlist:** the cloud environment must be able to reach these hosts (claude.ai/code → environment settings → network access):

| Purpose | Hosts |
|---|---|
| Parliament and legislation | `www.aph.gov.au`, `parlinfo.aph.gov.au`, `www.legislation.gov.au`, `api.prod.legislation.gov.au` |
| Tax office and Treasury | `www.ato.gov.au`, `treasury.gov.au`, `ministers.treasury.gov.au`, `consult.treasury.gov.au`, `budget.gov.au` |
| Elections | `www.aec.gov.au`, `aec.gov.au` |
| Party positions | `www.liberal.org.au`, `greens.org.au`, `www.onenation.org.au`, `nationals.org.au`, `www.alp.org.au` |
| Reputable media | `www.abc.net.au`, `www.afr.com`, `www.smh.com.au` |

Web search works without the allowlist; reading pages does not.

3. **Parliament blocks bots.** `aph.gov.au` and `parlinfo.aph.gov.au` return 403 to any automated reader, even with the host allowed. The agent therefore detects royal assent from the Federal Register of Legislation API and passage from Treasury media releases (see `agent/daily-research.md`). When you review a material PR, use the aph.gov.au link in its body to confirm the stage yourself.

To change the allowlist: claude.ai/code/routines → Taxshift daily research → ⋯ → Edit → Advanced settings → Cloud environment → hover **Default** → settings icon → Network access **Limited**, keep "Allow package managers" ticked → Allowed domains (one per line) → Save changes.

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
