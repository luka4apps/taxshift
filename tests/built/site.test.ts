// Smoke tests over the built static site (run after `npm run build`).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadSiteData } from '../../src/lib/load.ts';
import { PERSONAS } from '../../src/lib/personas.ts';

const DIST = path.resolve('dist');
const read = (p: string) => fs.readFileSync(path.join(DIST, p), 'utf8');
const data = loadSiteData();

describe('built site', () => {
  it('should_render_every_measure_on_the_home_page_and_as_its_own_page', () => {
    const home = read('index.html');
    for (const m of data.measures) {
      expect(home).toContain(m.shortTitle.replace(/&/g, '&amp;'));
      expect(fs.existsSync(path.join(DIST, 'changes', m.id, 'index.html'))).toBe(true);
    }
  });

  it('should_build_a_page_for_every_persona', () => {
    for (const p of PERSONAS) expect(fs.existsSync(path.join(DIST, 'for', p.slug, 'index.html'))).toBe(true);
  });

  it('should_build_all_navigation_pages_feeds_and_sitemap', () => {
    for (const p of ['timeline/index.html', 'could-it-flip/index.html', 'calculator/index.html', 'glossary/index.html', 'changelog/index.html', 'about/index.html', '404.html', 'rss.xml', 'sitemap-index.xml', 'robots.txt', 'favicon.svg']) {
      expect(fs.existsSync(path.join(DIST, p)), p).toBe(true);
    }
  });

  it('should_show_the_general_information_disclaimer_on_every_page', () => {
    const pages = ['index.html', 'calculator/index.html', `changes/${data.measures[0]!.id}/index.html`];
    for (const p of pages) expect(read(p)).toContain('not financial, tax or legal advice');
  });

  it('should_link_internal_pages_under_the_configured_base_path', () => {
    const home = read('index.html');
    const base = process.env.BASE_PATH ?? '/taxshift';
    expect(home).toContain(`href="${base}/changes/`);
    expect(home).not.toMatch(/href="\/changes\//);
  });

  it('should_render_a_calculator_result_without_javascript', () => {
    expect(read('calculator/index.html')).toMatch(/more tax|less tax|No change in tax/);
  });

  it('should_publish_a_valid_rss_feed_with_change_log_items', () => {
    const rss = read('rss.xml');
    expect(rss).toContain('<rss');
    expect((rss.match(/<item>/g) ?? []).length).toBe(data.changelog.length);
  });

  it('should_ship_little_javascript', () => {
    const astroDir = path.join(DIST, '_astro');
    const js = fs.readdirSync(astroDir).filter((f) => f.endsWith('.js'));
    const bytes = js.reduce((n, f) => n + fs.statSync(path.join(astroDir, f)).size, 0);
    expect(bytes).toBeLessThan(60_000);
  });
});
