import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
const allPosts = await getCollection('posts');
const nonDraftPosts = allPosts.filter(post => !post.data.draft).sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())

export async function GET(context) {
  return rss({
    title: 'Ethan Gardner\'s Blog',
    description: 'Ethan\'s Digital Garden',
    site: context.site,
    items: nonDraftPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: `/${post.collection}/${post.slug}`,
    })),
  });
}
