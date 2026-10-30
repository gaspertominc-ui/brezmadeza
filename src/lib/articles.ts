import type { Article } from './content';

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160)
    .replace(/-$/, '');
}

export function publishedArticles(items: Article[]) {
  return items
    .filter((a) => a.status === 'published')
    .sort(
      (a, b) =>
        b.publishedAt.localeCompare(a.publishedAt) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
}

export function readingMinutes(body: string) {
  return Math.max(
    1,
    Math.ceil(body.trim().split(/\s+/).filter(Boolean).length / 200),
  );
}

export function formatArticleDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('sl-SI', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Europe/Ljubljana',
      }).format(date)
    : '';
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );
}

function safeUrl(value: string, image = false) {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return true;
  if (!image && /^#[\w-]+$/.test(value)) return true;
  try {
    const url = new URL(value);
    return image
      ? url.protocol === 'https:'
      : ['https:', 'http:', 'mailto:'].includes(url.protocol);
  } catch {
    return false;
  }
}

// Only generated tags are emitted. Raw HTML is always escaped, including in code.
function inline(value: string, depth = 0): string {
  if (depth > 5) return escapeHtml(value);
  const token =
    /`([^`\n]+)`|(!?)\[([^\]\n]+)\]\(([^\s)]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let output = '';
  let cursor = 0;
  for (const match of value.matchAll(token)) {
    output += escapeHtml(value.slice(cursor, match.index));
    if (match[1] !== undefined)
      output += `<code>${escapeHtml(match[1])}</code>`;
    else if (match[3] !== undefined) {
      const isImage = match[2] === '!';
      if (safeUrl(match[4], isImage)) {
        output += isImage
          ? `<img src="${escapeHtml(match[4])}" alt="${escapeHtml(match[3])}" loading="lazy" decoding="async">`
          : `<a href="${escapeHtml(match[4])}" rel="noopener noreferrer">${inline(match[3], depth + 1)}</a>`;
      } else output += escapeHtml(match[0]);
    } else if (match[5] !== undefined)
      output += `<strong>${inline(match[5], depth + 1)}</strong>`;
    else output += `<em>${inline(match[6], depth + 1)}</em>`;
    cursor = match.index! + match[0].length;
  }
  return output + escapeHtml(value.slice(cursor));
}

/** Safe, intentionally small Markdown: headings, lists, quotes, links, images, and code. */
export function renderArticle(body: string): string {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const output: string[] = [];
  let paragraph: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let quote: string[] = [];
  let code: string[] | null = null;
  const flush = () => {
    if (paragraph.length) {
      output.push(`<p>${paragraph.map((s) => inline(s)).join('<br>')}</p>`);
      paragraph = [];
    }
    if (list) {
      output.push(`</${list}>`);
      list = null;
    }
    if (quote.length) {
      output.push(
        `<blockquote><p>${quote.map((s) => inline(s)).join('<br>')}</p></blockquote>`,
      );
      quote = [];
    }
  };
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (code) {
        output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
        code = null;
      } else {
        flush();
        code = [];
      }
      continue;
    }
    if (code) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flush();
      const level = Math.max(2, heading[1].length);
      output.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      flush();
      output.push('<hr>');
      continue;
    }
    const bullet = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.+)$/);
    if (bullet) {
      const next = bullet[1] ? 'ul' : 'ol';
      if (list !== next) {
        flush();
        list = next;
        output.push(`<${list}>`);
      }
      output.push(`<li>${inline(bullet[2])}</li>`);
      continue;
    }
    const quoted = line.match(/^>\s?(.*)$/);
    if (quoted) {
      if (!quote.length) flush();
      quote.push(quoted[1]);
      continue;
    }
    if (list || quote.length) flush();
    paragraph.push(line);
  }
  if (code)
    output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  flush();
  return output.join('\n');
}
