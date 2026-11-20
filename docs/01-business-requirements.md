# 01 — Business Requirements

Role: Business Analyst · Status: APPROVED v1.0 · Date: 2026-11-20

---

## 1. Problem

- Budget 2026-27 (12 May 2026) is the biggest investor-tax shake-up in decades.
- The facts are scattered across ATO, Treasury, Parliament, party media releases and hundreds of adviser blogs.
- Sources disagree on status: many blogs still call passed law "proposed", or proposed law "passed".
- The Opposition has promised to repeal the core changes, so investors face policy risk, not just a new rulebook.
- Result: an investor cannot quickly tell what applies to them, from when, and what might change again.

## 2. Outcome (the 30-second test)

A visitor should answer these five questions in 15–30 seconds, without scrolling past the first screen for 1–3:

| # | Question the visitor has | Answered by |
|---|---|---|
| 1 | What changed that affects me? | Persona filter + headline pills |
| 2 | When does it start? | Effective date + countdown on each pill |
| 3 | How does it affect me? | One-line impact on pill, before/after on detail page |
| 4 | Could it change again — who, how, when? | Political-risk strip per measure + election window on timeline |
| 5 | What should I do now? | Action checklist split into "Law: act" and "Proposed: prepare" |

## 3. Audiences

| ID | Persona | Core worry |
|---|---|---|
| P1 | Existing property investor | Am I grandfathered? Does my next sale lose the 50% discount? |
| P2 | Buying an investment property after 12 May 2026 | Can I still negatively gear? New build or established? |
| P3 | Share / ETF investor | How is CGT on my shares calculated after 1 July 2027? |
| P4 | SMSF trustee | Can my fund still borrow for property? Does Div 296 hit me? |
| P5 | Business owner / trust | Discretionary trust 30% minimum tax, small-business measures |
| P6 | Secondary: brokers, advisers, journalists | A neutral, sourced page to link clients to |

## 4. Scope

In scope (v1):

- Federal tax and superannuation law changes affecting P1–P5.
- Budget 2026-27 measures and anything announced after it.
- Positions of the Government, the Coalition Opposition, the Greens and notable crossbench.
- The next federal election window, as the main trigger for further change.

Out of scope (v1):

- Personal advice of any kind.
- State taxes (stamp duty, land tax, foreign surcharges). The data model must allow a jurisdiction field so states can be added later.
- User accounts, comments, paid features.

## 5. Functional requirements

Priority uses MoSCoW: M = must, S = should, C = could.

| ID | Requirement | Pri |
|---|---|---|
| FR1 | Headline pills: one large card per measure showing name, status, effective date, countdown, who is affected, one-line impact | M |
| FR2 | Legislative status tracker per measure: Announced → Draft → Bill introduced → Passed House → Passed Senate → Royal assent → In effect (plus Withdrawn / Lapsed) | M |
| FR3 | Master timeline of past and future key dates, including the election window | M |
| FR4 | Persona filter ("I am a…") that filters pills, timeline and actions; shareable via URL | M |
| FR5 | Measure detail page: before vs after, worked example, who is exempt (grandfathering), key dates, status history, sources | M |
| FR6 | Political-risk strip per measure: each party's stated position, what they would do, what would have to happen (trigger), and earliest date | M |
| FR7 | Action checklist per persona, split into "Law: act now" and "Proposed: prepare / monitor" | M |
| FR8 | Every fact links to its source; official sources (ATO, Treasury, legislation.gov.au, APH) ranked first | M |
| FR9 | Freshness stamp: "Checked daily — last checked <date>"; visible stale warning if older than 3 days | M |
| FR10 | Public change log: what changed in the data and when | M |
| FR11 | General-information disclaimer on every page, never presented as advice | M |
| FR12 | CGT calculator: tax on a sale under old rules vs new rules (pre/post 1 July 2027 apportionment, indexation, 30% minimum) | S |
| FR13 | RSS feed of the change log (free alerts) | S |
| FR14 | Social share images per measure; clean URLs | S |
| FR15 | Glossary of terms (CGT discount, indexation, LRBA, negative gearing, Div 296) | C |
| FR16 | Email alerts | C (v2) |
| FR17 | Negative-gearing / borrowing calculators | C (v2) |

## 6. Content and data requirements

The site is a view over a small set of entities. Each entity needs `lastVerified` and at least one source.

| Entity | Key fields |
|---|---|
| Measure | id, title, plain-English summary, category, personas affected, jurisdiction, status, effective date, before, after, exemptions, worked example |
| StatusEvent | measure, stage, date, source |
| PartyPosition | measure, party, stance (support / oppose / repeal / extend / amend / silent), what they would do, trigger, source |
| KeyDate | date, label, measure(s), kind (effective / deadline / parliament / election) |
| Action | measure, persona, kind (law-act / proposed-prepare), text, deadline |
| Source | url, publisher, official yes/no, retrieved date |
| ChangeLogEntry | date, measure, field changed, old value, new value, source |
| Election | earliest date, latest date, status |

## 7. Automation requirements

| ID | Requirement |
|---|---|
| AR1 | A research run happens every day with no human action |
| AR2 | The run checks official sources first, then reputable media, for every tracked measure and for new measures |
| AR3 | Every change the run makes must cite a source and update the change log |
| AR4 | Changes are validated (schema + business rules) before they can go live; invalid data never deploys |
| AR5 | Material changes (status, dates, rates, party positions) follow the approval policy chosen by the owner |
| AR6 | If a run fails, the site stays up with the last good data and shows its last-checked date; the owner is notified |
| AR7 | The site redeploys at least daily so countdowns and freshness stamps stay current |

## 8. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR1 | Cost | $0 hosting; domain only (~A$15–30/yr); research runs inside existing tools/plans |
| NFR2 | Minimal tech | One repo, one static site, the fewest vendors possible |
| NFR3 | Speed | First screen usable in under 1.5 s on 4G; tiny JavaScript |
| NFR4 | Mobile-first | Most traffic will come from social links on phones |
| NFR5 | Accessibility | WCAG 2.2 AA; status never shown by colour alone |
| NFR6 | Trust | Accuracy beats speed; law and proposals are never blurred; every fact sourced |
| NFR7 | Neutrality | Non-partisan wording; party positions quoted or paraphrased from their own sources |
| NFR8 | Privacy | No cookies, no consent banner, no personal data collected |
| NFR9 | SEO | One indexable page per measure; structured data; sitemap |
| NFR10 | Brand | Professional and credible, but loud and instantly recognisable — not a generic template look |

## 9. Success measures

- Five-second test: a first-time visitor names their top affected change and its date.
- Freshness: data checked on at least 95% of days.
- Accuracy: no factual error stays live more than 24 hours after an official source contradicts it.

## 10. Content inventory at launch (verified 20 Nov 2026)

Full facts, sources and caveats live in `src/data/measures/*.json`. Research corrected several widely repeated claims:

| Measure | Verified status | Starts | Correction vs common reporting |
|---|---|---|---|
| CGT: 50% discount → indexation + 30% minimum | Law (Act No. 49, assent 26 Jun 2026) | 1 Jul 2027 | Also brings pre-1985 assets into CGT; Treasurer's power to extend the discount was removed |
| Negative gearing: new builds only | Law (Act No. 49; amended by Act No. 71) | 2027-28 income year | Contract date, not settlement, decides grandfathering; 2026-27 losses still fully deductible |
| SMSF borrowing | Law (Act No. 49, Sch 5) | 10 Aug 2026 | Not a residential-only ban: new LRBAs limited to business real property |
| Division 296 | Law (Acts No. 8 and 9, assent 13 Mar 2026) | 2026-27 | Combined nominal rates 15% / 30% / 40%; realised earnings only |
| Trust 30% minimum tax | Bill before Senate | 1 Jul 2028 | Not 1 Jul 2027 (that is when the restructure window opens) |
| New-build definition (24-month test) | Bill before Senate | 1 Jul 2027 | Current law leaves it to an instrument not yet made |
| $20k instant asset write-off, permanent | Law (Act No. 71) | 1 Jul 2026 | |
| Company loss carry-back | Law (Act No. 71) | 1 Jul 2026 | Test is global income under $1b, not turnover |

## 11. Risks

| Risk | Mitigation |
|---|---|
| AI research states something false | Official-source priority, citation required per fact, schema + rule checks, approval gate for material changes, public change log |
| Seen as financial advice | General-information framing, disclaimers, no "you should buy/sell" language |
| Seen as partisan | Neutral tone rule, each party's own words linked |
| Daily run silently stops | Visible freshness stamp, stale banner, failure notification |
| Sources disagree | Rank official > parliamentary > major media > blogs; show "conflicting reports" state rather than guess |

## 12. Owner decisions

All open questions were answered on 20 Nov 2026 and are recorded in `docs/02-architecture.md` section 1.
