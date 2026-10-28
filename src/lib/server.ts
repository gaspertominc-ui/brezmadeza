import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { contentSchema, defaultContent, type SiteContent } from './content';

export const settings = () => env;
export function isLocal(request: Request) {
  return (
    import.meta.env.DEV &&
    ['127.0.0.1', 'localhost'].includes(new URL(request.url).hostname)
  );
}
export async function getContent(): Promise<{
  content: SiteContent;
  version: number;
}> {
  const row = await env.DB.prepare(
    'SELECT data, version FROM content WHERE id = ?',
  )
    .bind('site')
    .first<{ data: string; version: number }>();
  return row
    ? {
        content: contentSchema.parse(JSON.parse(row.data)),
        version: row.version,
      }
    : { content: defaultContent, version: 0 };
}
export function json(value: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}
export async function readBody(
  request: Request,
  limit = 300_000,
): Promise<unknown> {
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new Error('JSON');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('BODY');
  let length = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error('SIZE');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function digest(input: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)),
    ),
  )
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
export async function limit(
  request: Request,
  action: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000);
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    (isLocal(request) ? 'local' : 'unknown');
  const key = await digest(`${action}:${ip}:${env.SESSION_SECRET || ''}`);
  const result = await env.DB.prepare(
    'INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN expires_at < ? THEN 1 ELSE count + 1 END, expires_at = CASE WHEN expires_at < ? THEN ? ELSE expires_at END RETURNING count',
  )
    .bind(key, now + seconds, now, now, now + seconds)
    .first<{ count: number }>();
  return !!result && result.count <= max;
}
export async function verifyTurnstile(
  request: Request,
  token: string,
  action: string,
) {
  if (isLocal(request) && !env.TURNSTILE_SITE_KEY && !env.TURNSTILE_SECRET_KEY)
    return true;
  if (
    !env.TURNSTILE_SECRET_KEY ||
    !env.TURNSTILE_SITE_KEY ||
    !token ||
    token.length > 2048
  )
    return false;
  const hostnames = new Set(
    env.TURNSTILE_HOSTNAMES.split(',')
      .map((v) => v.trim())
      .filter(
        (v) =>
          v && (isLocal(request) || !['localhost', '127.0.0.1'].includes(v)),
      ),
  );
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          ...(request.headers.get('CF-Connecting-IP')
            ? { remoteip: request.headers.get('CF-Connecting-IP')! }
            : {}),
        }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) return false;
    const result = (await response.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
    };
    return (
      result.success === true &&
      result.action === action &&
      !!result.hostname &&
      hostnames.has(result.hostname)
    );
  } catch {
    return false;
  }
}
export async function authenticated(request: Request) {
  if (!env.SESSION_SECRET) return false;
  const token = request.headers
    .get('cookie')
    ?.match(/(?:^|;\s*)bm_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return false;
  const hash = await digest(`${env.SESSION_SECRET}:${token}`);
  const session = await env.DB.prepare(
    'SELECT expires_at FROM sessions WHERE token_hash = ?',
  )
    .bind(hash)
    .first<{ expires_at: number }>();
  return !!session && session.expires_at > Math.floor(Date.now() / 1000);
}
export async function passwordMatches(password: string) {
  if (!env.ADMIN_PASSWORD) return false;
  const a = new TextEncoder().encode(await digest(password));
  const b = new TextEncoder().encode(await digest(env.ADMIN_PASSWORD));
  return timingSafeEqual(a, b);
}
export function cookie(request: Request, token: string, maxAge = 28800) {
  return `bm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
