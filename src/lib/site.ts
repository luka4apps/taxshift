/** Astro-only glue: base-aware links, memoised data, build date. Domain logic stays in pure modules. */
import { todayInSydney } from './dates.ts';
import { joinBase } from './href.ts';
import { loadSiteData } from './load.ts';
import type { SiteData } from './schema.ts';

let cache: SiteData | undefined;

export function getData(): SiteData {
  if (import.meta.env.DEV) return loadSiteData();
  return (cache ??= loadSiteData());
}

export const href = (path = ''): string => joinBase(import.meta.env.BASE_URL, path);

/** "Today" in Sydney at build time; client script refreshes countdowns after load. */
export const buildToday = todayInSydney();

export const SITE_NAME = 'Taxshift';
export const TAGLINE = 'What changed. When it bites. Who wants to change it back.';
export const REPO_URL = 'https://github.com/luka4apps/taxshift';
