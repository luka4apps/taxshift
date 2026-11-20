import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getData, href } from '../lib/site.ts';

export function GET(context: APIContext) {
  const { changelog, measures } = getData();
  const title = (id: string | null) => measures.find((m) => m.id === id)?.shortTitle;
  return rss({
    title: 'Taxshift: Australian investor tax changes',
    description: 'Updates to tracked Australian tax and super law changes for property investors, share investors, SMSFs and business owners.',
    site: context.site!,
    items: [...changelog]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((c, i) => ({
        title: c.measureId ? `${title(c.measureId)}: ${c.summary}` : c.summary,
        description: c.summary,
        pubDate: new Date(`${c.date}T09:00:00+10:00`),
        link: c.measureId ? href(`changes/${c.measureId}/`) : href('changelog/'),
        customData: `<guid isPermaLink="false">taxshift-${c.date}-${i}</guid>`,
      })),
  });
}
