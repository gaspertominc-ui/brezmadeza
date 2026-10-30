import test from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify,
  publishedArticles,
  readingMinutes,
  formatArticleDate,
  renderArticle,
} from '../src/lib/articles.ts';

test('Naslov URL podpira slovenske črke in omeji dolžino', () => {
  assert.equal(
    slugify('  Čiščenje sedežne: Še več svežine!  '),
    'ciscenje-sedezne-se-vec-svezine',
  );
  assert.equal(slugify('---'), '');
  const long = slugify('dolg naslov '.repeat(50));
  assert.ok(long.length <= 160);
  assert.match(long, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test('Javni seznam izloči osnutke in razvrsti po datumu brez spreminjanja izvirnika', () => {
  const items = [
    {
      id: 'old',
      status: 'published',
      publishedAt: '2026-09-20',
      updatedAt: '2026-10-29T12:00:00Z',
    },
    {
      id: 'draft',
      status: 'draft',
      publishedAt: '2026-12-01',
      updatedAt: '2026-10-30T12:00:00Z',
    },
    {
      id: 'recent',
      status: 'published',
      publishedAt: '2026-10-30',
      updatedAt: '2026-10-30T12:00:00Z',
    },
    {
      id: 'same-day',
      status: 'published',
      publishedAt: '2026-10-30',
      updatedAt: '2026-10-30T14:00:00Z',
    },
  ];
  const originalOrder = items.map((item) => item.id);
  assert.deepEqual(
    publishedArticles(items).map((item) => item.id),
    ['same-day', 'recent', 'old'],
  );
  assert.deepEqual(
    items.map((item) => item.id),
    originalOrder,
  );
  assert.deepEqual(publishedArticles([]), []);
});

test('Čas branja in datum sta uporabna tudi za prazne osnutke', () => {
  assert.equal(readingMinutes(''), 1);
  assert.equal(readingMinutes('beseda '.repeat(200)), 1);
  assert.equal(readingMinutes('beseda '.repeat(201)), 2);
  assert.equal(formatArticleDate(''), '');
  assert.equal(formatArticleDate('neveljavno'), '');
  assert.match(formatArticleDate('2026-10-30'), /30.*oktober.*2026/);
});

test('Besedilo podpira naslove, odstavke, poudarke, sezname in navedke', () => {
  const html = renderArticle(
    [
      '# Naslov v besedilu',
      '',
      'Prva vrstica z **močnim** in *poševnim* poudarkom.',
      'Druga vrstica z `izsekom`.',
      '',
      '- Prvi',
      '- Drugi',
      '',
      '1. Uvod',
      '2. Konec',
      '',
      '> Dober nasvet',
      '',
      '---',
    ].join('\r\n'),
  );
  assert.match(html, /<h2>Naslov v besedilu<\/h2>/);
  assert.doesNotMatch(html, /<h1>/);
  assert.match(html, /<strong>močnim<\/strong>/);
  assert.match(html, /<em>poševnim<\/em>/);
  assert.match(html, /<br>Druga vrstica z <code>izsekom<\/code>/);
  assert.match(html, /<ul>\s*<li>Prvi<\/li>\s*<li>Drugi<\/li>\s*<\/ul>/);
  assert.match(html, /<ol>\s*<li>Uvod<\/li>\s*<li>Konec<\/li>\s*<\/ol>/);
  assert.match(html, /<blockquote><p>Dober nasvet<\/p><\/blockquote>/);
  assert.match(html, /<hr>/);
});

test('Dovoljene povezave in slike ohranijo varno strukturo', () => {
  const html = renderArticle(
    [
      '[Stran](https://brezmadeza.si/?a=1&b=2)',
      '[Kontakt](/#kontakt)',
      '[Naslov](#naslov)',
      '[E-pošta](mailto:contact@brezmadeza.si)',
      '![Svetla & čista soba](https://example.com/room.webp)',
      '![Lokalna slika](/images/sofa.webp)',
    ].join('\n'),
  );
  assert.match(html, /href="https:\/\/brezmadeza\.si\/\?a=1&amp;b=2"/);
  assert.match(html, /href="\/#kontakt"/);
  assert.match(html, /href="#naslov"/);
  assert.match(html, /href="mailto:contact@brezmadeza.si"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /alt="Svetla &amp; čista soba" loading="lazy"/);
  assert.match(html, /src="\/images\/sofa.webp"/);
});

test('Prispevek ne more vstaviti HTML, skriptov ali nevarnih naslovov', () => {
  const attacks = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<iframe src="https://example.com"></iframe>',
    '[Klik](javascript:alert%281%29)',
    '[Klik](JaVaScRiPt:alert%281%29)',
    '[Klik](data:text/html,test)',
    '[Klik](vbscript:msgbox)',
    '[Klik](//evil.example/path)',
    '[Klik](/\\evil.example)',
    '[Klik](https://example.com/"onmouseover="alert)',
    '![Slika](data:image/svg+xml,test)',
    '![Slika](http://example.com/image.webp)',
    '![Slika](//evil.example/image.webp)',
  ];
  for (const attack of attacks) {
    const html = renderArticle(attack);
    assert.doesNotMatch(html, /<(?:script|iframe|img)\b/i, attack);
    assert.doesNotMatch(
      html,
      /href=["'](?:javascript:|data:|vbscript:|\/\/)/i,
      attack,
    );
    assert.doesNotMatch(html, /\son(?:error|mouseover)=["']/i, attack);
  }
  assert.equal(
    renderArticle('<b>Čisto & sveže</b>'),
    '<p>&lt;b&gt;Čisto &amp; sveže&lt;/b&gt;</p>',
  );
});

test('Koda se varno izpiše tudi pri nedokončanem bloku', () => {
  assert.equal(
    renderArticle('```html\n<script>alert(1)</script>\n```'),
    '<pre><code>&lt;script&gt;alert(1)&lt;/script&gt;</code></pre>',
  );
  assert.equal(
    renderArticle('```\n<b>test</b>'),
    '<pre><code>&lt;b&gt;test&lt;/b&gt;</code></pre>',
  );
  assert.equal(
    renderArticle('`<img onerror="test">`'),
    '<p><code>&lt;img onerror=&quot;test&quot;&gt;</code></p>',
  );
});
