import type { APIRoute } from 'astro';
import { getContent } from '../lib/server';
import { publishedArticles } from '../lib/articles';
export const GET: APIRoute = async () => {
  const { content } = await getContent();
  const paths = [
    '/',
    '/nasveti',
    ...content.services.items.map((item) => `/storitve/${item.slug}`),
    ...publishedArticles(content.articles.items).map(
      (item) => `/nasveti/${item.slug}`,
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>https://brezmadeza.si${path}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
