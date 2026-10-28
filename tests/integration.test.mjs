import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = 'http://127.0.0.1:4321';
const vars = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8');
const password = vars.match(/^ADMIN_PASSWORD=(.+)$/m)?.[1].trim();
let cookie = '';
async function call(
  path,
  method = 'GET',
  data,
  authenticated = false,
  origin = base,
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(method !== 'GET'
        ? { Origin: origin, 'Content-Type': 'application/json' }
        : {}),
      ...(authenticated ? { Cookie: cookie } : {}),
    },
    ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
  });
}
test('Lokalni uporabniški in varnostni tokovi', async (t) => {
  let original;
  let version;
  let changed = false;
  let inquiryId;
  await t.test(
    'Javna stran vsebuje strežniško izrisano vsebino in skrbniških povezav ni',
    async () => {
      const response = await call('/');
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /lang="sl"/);
      assert.match(html, /Globinsko čiščenje/i);
      assert.match(html, /contact@brezmadeza.si/);
      assert.doesNotMatch(html, /href="\/admin/);
      assert.match(html, /application\/ld\+json/);
      const map = await (await call('/sitemap.xml')).text();
      assert.match(map, /sedezne-garniture/);
      assert.doesNotMatch(map, /admin/);
      const missing = await call('/storitve/neobstojeca-storitev');
      assert.equal(missing.status, 404);
      const admin = await call('/admin');
      assert.match(admin.headers.get('x-robots-tag'), /noindex/);
    },
  );
  await t.test(
    'Brez prijave so vsebina in osebni podatki nedostopni',
    async () => {
      assert.equal((await call('/api/admin/content')).status, 401);
      assert.equal((await call('/api/admin/inquiries')).status, 401);
      assert.equal((await call('/api/admin/content', 'PUT', {})).status, 401);
    },
  );
  await t.test('Zavrne tuji izvor in nepravilno geslo', async () => {
    assert.equal(
      (
        await call(
          '/api/admin/login',
          'POST',
          { password },
          false,
          'https://example.invalid',
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call('/api/admin/login', 'POST', {
          password: 'incorrect-test-password',
        })
      ).status,
      401,
    );
  });
  await t.test('Prijava ustvari varen sejni piškotek', async () => {
    const response = await call('/api/admin/login', 'POST', { password });
    assert.equal(response.status, 200);
    const header = response.headers.get('set-cookie');
    assert.match(header, /HttpOnly/);
    assert.match(header, /SameSite=Strict/);
    cookie = header.split(';')[0];
    const content = await (
      await call('/api/admin/content', 'GET', undefined, true)
    ).json();
    original = content.content;
    version = content.version;
  });
  try {
    await t.test(
      'Shrani vsebino v D1, javno prikaže spremembe in zavrne zastareli osnutek',
      async () => {
        const content = structuredClone(original);
        content.hero.title = 'Preverjanje shranjevanja.';
        content.extra.push({
          title: 'Testna dodatna sekcija',
          text: 'Začasno preverjanje dodatne vsebine.',
        });
        const response = await call(
          '/api/admin/content',
          'PUT',
          { content, version },
          true,
        );
        assert.equal(response.status, 200);
        changed = true;
        version = (await response.json()).version;
        const html = await (await call('/')).text();
        assert.match(html, /Preverjanje shranjevanja\./);
        assert.match(html, /Testna dodatna sekcija/);
        assert.equal(
          (
            await call(
              '/api/admin/content',
              'PUT',
              { content, version: version - 1 },
              true,
            )
          ).status,
          409,
        );
        content.services.items[1].slug = content.services.items[0].slug;
        assert.equal(
          (await call('/api/admin/content', 'PUT', { content, version }, true))
            .status,
          400,
        );
      },
    );
    await t.test(
      'Preveri zahtevana polja in shrani lokalno povpraševanje brez lažne potrditve e-pošte',
      async () => {
        if (
          vars.match(/^WEB3FORMS_ACCESS_KEY=\S+/m) ||
          vars.match(/^TURNSTILE_SECRET_KEY=\S+/m)
        )
          return;
        const data = {
          name: 'Testni obiskovalec',
          email: 'test@example.invalid',
          phone: '',
          location: 'Testni kraj',
          service: 'Sedežne garniture',
          message: 'To je samodejni preizkus lokalnega obrazca.',
          consent: false,
          website: '',
          token: '',
        };
        assert.equal((await call('/api/inquiry', 'POST', data)).status, 400);
        const response = await call('/api/inquiry', 'POST', {
          ...data,
          consent: true,
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        inquiryId = body.id;
        assert.equal(body.demo, true);
        assert.equal(body.accessKey, null);
        let inbox = await (
          await call('/api/admin/inquiries', 'GET', undefined, true)
        ).json();
        assert.ok(inbox.inquiries.some((item) => item.id === inquiryId));
        assert.equal(
          (
            await call(
              '/api/admin/inquiries',
              'PUT',
              { id: inquiryId, status: 'handled' },
              true,
            )
          ).status,
          200,
        );
        inbox = await (
          await call('/api/admin/inquiries', 'GET', undefined, true)
        ).json();
        assert.equal(
          inbox.inquiries.find((item) => item.id === inquiryId).status,
          'handled',
        );
      },
    );
  } finally {
    if (inquiryId)
      assert.equal(
        (await call('/api/admin/inquiries', 'DELETE', { id: inquiryId }, true))
          .status,
        200,
      );
    if (changed)
      assert.equal(
        (
          await call(
            '/api/admin/content',
            'PUT',
            { content: original, version },
            true,
          )
        ).status,
        200,
      );
  }
  await t.test('Odjava prekliče sejo na strežniku', async () => {
    assert.equal(
      (await call('/api/admin/logout', 'POST', undefined, true)).status,
      200,
    );
    assert.equal(
      (await call('/api/admin/content', 'GET', undefined, true)).status,
      401,
    );
  });
});
