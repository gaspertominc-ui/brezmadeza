import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  settings,
  json,
  getContent,
  readBody,
  limit,
  authenticated,
  digest,
  cookie,
  passwordMatches,
  verifyTurnstile,
  isLocal,
} from '../../lib/server';
import { contentSchema } from '../../lib/content';

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  phone: z.string().max(50),
  service: z.string().min(1).max(200),
  location: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
  website: z.string().max(200).default(''),
  token: z.string().max(2048).default(''),
});

export const ALL: APIRoute = async ({ request, params }) => {
  const env = settings();
  const route = params.route;
  try {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method))
      return json({ error: 'Metoda ni dovoljena.' }, 405);
    if (
      request.method !== 'GET' &&
      request.headers.get('origin') !== new URL(request.url).origin
    )
      return json({ error: 'Zahteva ni dovoljena.' }, 403);
    if (route === 'admin/login' && request.method === 'POST') {
      if (
        !env.ADMIN_PASSWORD ||
        !env.SESSION_SECRET ||
        env.SESSION_SECRET.length < 32
      )
        return json({ error: 'Prijava še ni nastavljena.' }, 503);
      if (!(await limit(request, 'login', 8, 900)))
        return json({ error: 'Preveč poskusov. Poskusite čez 15 minut.' }, 429);
      const data = z
        .object({
          password: z.string().max(300),
          token: z.string().max(2048).default(''),
        })
        .parse(await readBody(request, 5000));
      if (!(await verifyTurnstile(request, data.token, 'admin_login')))
        return json(
          { error: 'Varnostno preverjanje ni uspelo. Poskusite znova.' },
          403,
        );
      if (!(await passwordMatches(data.password)))
        return json({ error: 'Geslo ni pravilno.' }, 401);
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      const now = Math.floor(Date.now() / 1000);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
        env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(
          now,
        ),
        env.DB.prepare(
          'INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)',
        ).bind(await digest(`${env.SESSION_SECRET}:${token}`), now + 28800),
      ]);
      return json({ success: true }, 200, {
        'Set-Cookie': cookie(request, token),
      });
    }
    if (route === 'inquiry' && request.method === 'POST') {
      if (
        !isLocal(request) &&
        (!env.WEB3FORMS_ACCESS_KEY ||
          !env.TURNSTILE_SECRET_KEY ||
          !env.TURNSTILE_SITE_KEY)
      )
        return json(
          {
            error:
              'Obrazec trenutno ni na voljo. Uporabite objavljeni kontakt.',
          },
          503,
        );
      if (!(await limit(request, 'inquiry', 5, 600)))
        return json(
          { error: 'Preveč povpraševanj. Poskusite čez nekaj minut.' },
          429,
        );
      const data = inquirySchema.parse(await readBody(request, 12000));
      if (data.website) return json({ error: 'Zahteva ni dovoljena.' }, 400);
      if (!(await verifyTurnstile(request, data.token, 'contact')))
        return json(
          {
            error:
              'Varnostno preverjanje je poteklo ali ni uspelo. Poskusite znova.',
          },
          403,
        );
      const { token: _token, website: _website, ...stored } = data;
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO inquiries (id, data) VALUES (?, ?)')
        .bind(id, JSON.stringify(stored))
        .run();
      return json({
        success: true,
        id,
        demo: !env.WEB3FORMS_ACCESS_KEY,
        accessKey: env.WEB3FORMS_ACCESS_KEY || null,
      });
    }
    if (route?.startsWith('admin/')) {
      if (!(await authenticated(request)))
        return json({ error: 'Za nadaljevanje se prijavite.' }, 401);
      if (route === 'admin/logout' && request.method === 'POST') {
        const token = request.headers
          .get('cookie')
          ?.match(/(?:^|;\s*)bm_session=([a-f0-9]{64})(?:;|$)/)?.[1];
        if (token)
          await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
            .bind(await digest(`${env.SESSION_SECRET}:${token}`))
            .run();
        return json({ success: true }, 200, {
          'Set-Cookie': cookie(request, '', 0),
        });
      }
      if (route === 'admin/content' && request.method === 'GET')
        return json(await getContent());
      if (route === 'admin/content' && request.method === 'PUT') {
        const payload = z
          .object({ content: contentSchema, version: z.number().int().min(0) })
          .parse(await readBody(request, 1_800_000));
        const result = await env.DB.prepare(
          'INSERT INTO content (id, data, version) VALUES (?, ?, 1) ON CONFLICT(id) DO UPDATE SET data = excluded.data, version = content.version + 1, updated_at = CURRENT_TIMESTAMP WHERE content.version = ? RETURNING version',
        )
          .bind('site', JSON.stringify(payload.content), payload.version)
          .first<{ version: number }>();
        if (!result)
          return json(
            {
              error:
                'Vsebino je medtem spremenil drug urejevalnik. Izvozite svoje spremembe in osvežite stran.',
            },
            409,
          );
        return json({ success: true, version: result.version });
      }
      if (route === 'admin/inquiries' && request.method === 'GET') {
        const results = await env.DB.prepare(
          'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 200',
        ).all<{
          id: string;
          data: string;
          status: string;
          created_at: string;
        }>();
        return json({
          inquiries: results.results.map((row) => ({
            ...row,
            data: JSON.parse(row.data),
          })),
        });
      }
      if (
        route === 'admin/inquiries' &&
        ['PUT', 'DELETE'].includes(request.method)
      ) {
        const data = z
          .object({
            id: z.uuid(),
            status: z.enum(['new', 'handled']).optional(),
          })
          .parse(await readBody(request, 1000));
        if (request.method === 'DELETE')
          await env.DB.prepare('DELETE FROM inquiries WHERE id = ?')
            .bind(data.id)
            .run();
        else if (data.status)
          await env.DB.prepare('UPDATE inquiries SET status = ? WHERE id = ?')
            .bind(data.status, data.id)
            .run();
        else return json({ error: 'Manjka stanje povpraševanja.' }, 400);
        return json({ success: true });
      }
    }
    return json({ error: 'Stran ne obstaja.' }, 404);
  } catch (error) {
    if (error instanceof z.ZodError)
      return json(
        {
          error: 'Preverite vnesene podatke.',
          details: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
        },
        400,
      );
    if (
      error instanceof Error &&
      ['SIZE', 'JSON', 'BODY'].includes(error.message)
    )
      return json({ error: 'Zahteva je prevelika ali nepravilna.' }, 400);
    console.error(JSON.stringify({ event: 'api_error', route }));
    return json(
      { error: 'Prišlo je do napake. Poskusite znova pozneje.' },
      500,
    );
  }
};
