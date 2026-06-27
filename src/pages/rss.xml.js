import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { withBase } from '../utils/base';

export async function GET(context) {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  return rss({
    title: 'Mariano Navas',
    description: 'Type-driven design, DSLs, and a Lightning Network playground.',
    site: new URL(withBase(''), context.site),
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: withBase(`blog/${post.id}/`),
    })),
  });
}
