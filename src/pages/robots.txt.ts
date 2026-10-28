import type { APIRoute } from 'astro';
export const GET: APIRoute = () =>
  new Response(
    'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://brezmadeza.si/sitemap.xml\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
