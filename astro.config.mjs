// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL / BASE_PATH let us move from github.io to a custom domain with config only (ADR-08).
const site = process.env.SITE_URL ?? 'https://luka4apps.github.io';
const base = process.env.BASE_PATH ?? '/taxshift';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [sitemap()],
});
