// Keeps time-sensitive text honest between deploys (ADR-06): countdowns and the stale-data banner.
import { countdownText, isStale, todayInSydney } from '../lib/dates.ts';

export function hydrateLive(root: ParentNode = document): void {
  const today = todayInSydney();
  root.querySelectorAll<HTMLElement>('[data-countdown]').forEach((el) => {
    const date = el.dataset.date;
    if (date) el.textContent = countdownText(date, today);
  });
  root.querySelectorAll<HTMLElement>('[data-stale]').forEach((el) => {
    const last = el.dataset.lastChecked;
    if (last) el.hidden = !isStale(last);
  });
}
