import { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Check,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import type { SiteContent } from '../lib/content';
import {
  formatArticleDate,
  readingMinutes,
  renderArticle,
  slugify,
} from '../lib/articles';

type Articles = SiteContent['articles'];
type Article = Articles['items'][number];

function today() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Ljubljana',
  }).format(new Date());
}

export default function ArticleEditor({
  value,
  onChange,
  busy,
}: {
  value: Articles;
  onChange: (value: Articles) => void;
  busy: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const bodyInput = useRef<HTMLTextAreaElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const selected = value.items.find((item) => item.id === selectedId);
  const visible = value.items.filter(
    (item) =>
      (filter === 'all' || item.status === filter) &&
      `${item.title} ${item.category} ${item.excerpt}`
        .toLocaleLowerCase('sl')
        .includes(query.toLocaleLowerCase('sl')),
  );
  const published = value.items.filter(
    (item) => item.status === 'published',
  ).length;

  function choose(id: string | null) {
    setSelectedId(id);
    setPreview(false);
    setMessage('');
    setConfirmDelete(false);
  }
  function update(patch: Partial<Article>) {
    if (!selected) return;
    onChange({
      ...value,
      items: value.items.map((item) =>
        item.id === selected.id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item,
      ),
    });
    setMessage('');
    setConfirmDelete(false);
  }
  function create() {
    if (value.items.length >= 100 || busy) return;
    const article: Article = {
      id: crypto.randomUUID(),
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      category: '',
      image: '',
      imageAlt: '',
      status: 'draft',
      publishedAt: '',
      updatedAt: new Date().toISOString(),
    };
    onChange({ ...value, items: [article, ...value.items] });
    choose(article.id);
    requestAnimationFrame(() => titleInput.current?.focus());
  }
  function publish() {
    if (!selected) return;
    if (selected.status === 'published') {
      update({ status: 'draft' });
      return;
    }
    if (
      !selected.title.trim() ||
      !selected.slug.trim() ||
      !selected.excerpt.trim() ||
      !selected.body.trim()
    ) {
      setMessage(
        'Pred objavo dopolnite naslov, naslov v URL, kratek opis in vsebino.',
      );
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(selected.slug)) {
      setMessage(
        'Naslov v URL naj vsebuje male črke brez šumnikov, številke in vezaje.',
      );
      return;
    }
    if (
      value.items.some(
        (item) => item.id !== selected.id && item.slug === selected.slug,
      )
    ) {
      setMessage(
        'Ta naslov v URL že uporablja drug prispevek. Izberite drugega.',
      );
      return;
    }
    if (selected.image && !selected.imageAlt.trim()) {
      setMessage(
        'Dodajte opis naslovne slike za dostopnost ali odstranite sliko.',
      );
      return;
    }
    update({
      status: 'published',
      publishedAt: selected.publishedAt || today(),
    });
  }
  function insert(before: string, after = '', placeholder = 'besedilo') {
    if (!selected || !bodyInput.current) return;
    const input = bodyInput.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = selected.body.slice(start, end) || placeholder;
    update({
      body:
        selected.body.slice(0, start) +
        before +
        text +
        after +
        selected.body.slice(end),
    });
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(
        start + before.length,
        start + before.length + text.length,
      );
    });
  }

  return (
    <div className="articles-manager">
      <div className="articles-summary">
        <span>
          <strong>{value.items.length}</strong> prispevkov skupaj
        </span>
        <span>
          <strong>{published}</strong> objavljenih
        </span>
        <span>
          <strong>{value.items.length - published}</strong> osnutkov
        </span>
        <a href="/nasveti" target="_blank" rel="noreferrer">
          Odpri Nasvete <ArrowUpRight size={15} />
        </a>
      </div>
      <p className="articles-save-hint">
        <Check size={16} /> Vse spremembe potrdite z gumbom »Shrani prispevke«
        na vrhu. Osnutki niso javno vidni.
      </p>

      {!selected ? (
        <>
          <details className="editor-item articles-page-settings">
            <summary>
              <span>Naslov in uvod strani Nasveti</span>
              <span className="articles-settings-note">Uredi</span>
            </summary>
            <fieldset
              disabled={busy}
              className="editor-item-body editor-fields articles-fieldset"
            >
              <label className="editor-field">
                <span>Naslov strani</span>
                <input
                  value={value.title}
                  maxLength={160}
                  onChange={(event) =>
                    onChange({ ...value, title: event.target.value })
                  }
                />
              </label>
              <label className="editor-field">
                <span>Uvodno besedilo</span>
                <textarea
                  rows={3}
                  value={value.description}
                  maxLength={500}
                  onChange={(event) =>
                    onChange({ ...value, description: event.target.value })
                  }
                />
              </label>
            </fieldset>
          </details>
          <div className="articles-list-tools">
            <label className="articles-search">
              <Search size={17} />
              <span className="articles-sr-only">Poišči prispevek</span>
              <input
                type="search"
                placeholder="Poišči prispevek …"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="articles-filter">
              <span className="articles-sr-only">Prikaži prispevke</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="all">Vsi prispevki</option>
                <option value="published">Objavljeni</option>
                <option value="draft">Osnutki</option>
              </select>
            </label>
            <button
              className="button articles-new"
              type="button"
              disabled={busy || value.items.length >= 100}
              onClick={create}
            >
              <Plus size={17} /> Nov prispevek
            </button>
          </div>
          {value.items.length >= 100 && (
            <p className="articles-format-help">
              Doseženo je največje število prispevkov (100). Za nov prispevek
              najprej odstranite katerega od obstoječih.
            </p>
          )}
          {!visible.length ? (
            <div className="articles-empty">
              <BookOpen size={34} />
              <h2>
                {value.items.length
                  ? 'Ni zadetkov.'
                  : 'Vaš naslednji dober nasvet.'}
              </h2>
              <p>
                {value.items.length
                  ? 'Spremenite iskalni izraz ali prikaz prispevkov.'
                  : 'Tukaj je prostor za nasvete, članke in zgodbe. Začnite z osnutkom in ga objavite, ko bo pripravljen.'}
              </p>
              {!value.items.length && (
                <button
                  className="button"
                  type="button"
                  disabled={busy}
                  onClick={create}
                >
                  <Plus size={17} /> Napiši prvi prispevek
                </button>
              )}
            </div>
          ) : (
            <div className="articles-admin-list">
              {visible.map((item) => (
                <button
                  type="button"
                  className="articles-admin-card"
                  key={item.id}
                  onClick={() => choose(item.id)}
                >
                  <span className="articles-card-icon">
                    <FileText size={22} />
                  </span>
                  <span className="articles-card-copy">
                    <span className="articles-card-title">
                      {item.title || 'Prispevek brez naslova'}
                    </span>
                    <span>
                      {item.category || 'Brez kategorije'}
                      {item.publishedAt
                        ? ` · ${formatArticleDate(item.publishedAt)}`
                        : ''}{' '}
                      · {readingMinutes(item.body)} min branja
                    </span>
                  </span>
                  <span className={`articles-status ${item.status}`}>
                    {item.status === 'published' ? 'Objavljeno' : 'Osnutek'}
                  </span>
                  <ArrowUpRight size={19} />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="articles-editor-nav">
            <button
              type="button"
              className="articles-back"
              onClick={() => choose(null)}
            >
              <ArrowLeft size={16} /> Vsi prispevki
            </button>
            <span className={`articles-status ${selected.status}`}>
              {selected.status === 'published'
                ? 'Objavljeno po shranjevanju'
                : 'Zasebni osnutek'}
            </span>
          </div>
          <fieldset
            disabled={busy}
            className="editor-card articles-fieldset articles-edit-card"
          >
            <div className="articles-edit-heading">
              <FileText size={20} />
              <h2>{selected.title || 'Nov prispevek'}</h2>
            </div>
            <div className="editor-fields">
              <label className="editor-field">
                <span>Naslov prispevka</span>
                <input
                  ref={titleInput}
                  value={selected.title}
                  maxLength={160}
                  placeholder="Dober nasvet se začne z jasnim naslovom"
                  onChange={(event) => {
                    const title = event.target.value;
                    update({
                      title,
                      ...(!selected.slug ||
                      selected.slug === slugify(selected.title)
                        ? { slug: slugify(title) }
                        : {}),
                    });
                  }}
                />
              </label>
              <label className="editor-field">
                <span>Naslov v URL</span>
                <div className="articles-slug-input">
                  <span>/nasveti/</span>
                  <input
                    value={selected.slug}
                    maxLength={160}
                    placeholder="naslov-prispevka"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) => update({ slug: event.target.value })}
                  />
                </div>
                <small>
                  Ob spremembi naslova v URL stara povezava ne bo več delovala.
                </small>
              </label>
              <label className="editor-field">
                <span>Kratek opis</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={selected.excerpt}
                  placeholder="V nekaj stavkih povejte, kaj bo bralec izvedel. Opis se prikaže na kartici in v iskalnikih."
                  onChange={(event) => update({ excerpt: event.target.value })}
                />
              </label>
              <div className="articles-field-row">
                <label className="editor-field">
                  <span>Kategorija (neobvezno)</span>
                  <input
                    value={selected.category}
                    maxLength={80}
                    placeholder="Na primer: Nega doma"
                    onChange={(event) =>
                      update({ category: event.target.value })
                    }
                  />
                </label>
                <label className="editor-field">
                  <span>Datum objave</span>
                  <input
                    type="date"
                    value={selected.publishedAt}
                    onChange={(event) =>
                      update({ publishedAt: event.target.value })
                    }
                  />
                  <small>
                    Prazen datum se ob objavi dopolni z današnjim. Datum je
                    oznaka, ne urnik objave.
                  </small>
                </label>
              </div>
              <details className="editor-item">
                <summary>Naslovna slika (neobvezno)</summary>
                <div className="editor-item-body editor-fields">
                  <label className="editor-field">
                    <span>Naslov HTTPS ali lokalna pot slike</span>
                    <input
                      value={selected.image}
                      placeholder="https://… ali /images/sofa.webp"
                      maxLength={2000}
                      onChange={(event) =>
                        update({ image: event.target.value })
                      }
                    />
                  </label>
                  <label className="editor-field">
                    <span>Opis slike za dostopnost</span>
                    <input
                      value={selected.imageAlt}
                      maxLength={200}
                      placeholder="Kratek opis tega, kar je na sliki"
                      onChange={(event) =>
                        update({ imageAlt: event.target.value })
                      }
                    />
                  </label>
                  {/^https:\/\/|^\/(?!\/)/.test(selected.image) && (
                    <img
                      className="articles-image-preview"
                      src={selected.image}
                      alt={selected.imageAlt || 'Predogled naslovne slike'}
                      loading="lazy"
                    />
                  )}
                </div>
              </details>
              <div className="articles-body-heading">
                <span>Vsebina prispevka</span>
                <div role="group" aria-label="Prikaz vsebine">
                  <button
                    type="button"
                    aria-pressed={!preview}
                    onClick={() => setPreview(false)}
                  >
                    Urejanje
                  </button>
                  <button
                    type="button"
                    aria-pressed={preview}
                    onClick={() => setPreview(true)}
                  >
                    <Eye size={14} /> Predogled
                  </button>
                </div>
              </div>
              {preview ? (
                <div
                  className="articles-content-preview"
                  aria-label="Predogled vsebine"
                >
                  {selected.body.trim() ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderArticle(selected.body),
                      }}
                    />
                  ) : (
                    <p className="articles-preview-empty">
                      Ko dodate vsebino, se njen predogled prikaže tukaj.
                    </p>
                  )}
                </div>
              ) : (
                <div className="articles-body-editor">
                  <div
                    className="articles-format-tools"
                    role="group"
                    aria-label="Oblikovanje besedila"
                  >
                    <button
                      type="button"
                      title="Krepko"
                      onClick={() => insert('**', '**')}
                    >
                      <strong>Krepko</strong>
                    </button>
                    <button
                      type="button"
                      title="Ležeče"
                      onClick={() => insert('*', '*')}
                    >
                      <em>Ležeče</em>
                    </button>
                    <button
                      type="button"
                      onClick={() => insert('\n## ', '\n', 'Mednaslov')}
                    >
                      Mednaslov
                    </button>
                    <button
                      type="button"
                      onClick={() => insert('\n- ', '\n', 'Element seznama')}
                    >
                      Seznam
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insert('[', '](https://primer.si)', 'besedilo povezave')
                      }
                    >
                      Povezava
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insert(
                          '\n![',
                          '](https://primer.si/slika.jpg)\n',
                          'opis slike',
                        )
                      }
                    >
                      Slika
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insert('\n> ', '\n', 'Izpostavljeni nasvet')
                      }
                    >
                      Citat
                    </button>
                  </div>
                  <label className="editor-field">
                    <span className="articles-sr-only">
                      Vsebina v obliki Markdown
                    </span>
                    <textarea
                      ref={bodyInput}
                      className="articles-body-input"
                      value={selected.body}
                      rows={18}
                      maxLength={80000}
                      placeholder={
                        'Začnite pisati ali prilepite svoje besedilo …\n\n## Mednaslov\n\nNov odstavek ločite s prazno vrstico.\n\n- Prvi nasvet\n- Drugi nasvet'
                      }
                      onChange={(event) => update({ body: event.target.value })}
                    />
                  </label>
                </div>
              )}
              <p className="articles-format-help">
                Navadno besedilo ali Markdown: prazna vrstica za odstavek, ## za
                mednaslov, **krepko**, *ležeče*, - za seznam. HTML se prikaže
                kot besedilo. Približno {readingMinutes(selected.body)} min
                branja.
              </p>
            </div>
            {message && (
              <p className="admin-notice error" role="alert">
                {message}
              </p>
            )}
            <div className="articles-publish-row">
              <div>
                <strong>
                  {selected.status === 'published'
                    ? 'Pripravljen za bralce.'
                    : 'Še nastaja? Naj ostane osnutek.'}
                </strong>
                <p>
                  {selected.status === 'published'
                    ? 'Prispevek bo javno viden po shranjevanju sprememb.'
                    : 'Osnutek lahko shranite in se k pisanju vrnete pozneje.'}
                </p>
              </div>
              <button className="button" type="button" onClick={publish}>
                {selected.status === 'published'
                  ? 'Prestavi v osnutke'
                  : 'Pripravi za objavo'}
              </button>
            </div>
            <div className="articles-delete-row">
              {confirmDelete ? (
                <>
                  <span>
                    Odstranim ta prispevek? Izbris potrdite še s shranjevanjem.
                  </span>
                  <button type="button" onClick={() => setConfirmDelete(false)}>
                    Prekliči
                  </button>
                  <button
                    type="button"
                    className="danger-text"
                    onClick={() => {
                      onChange({
                        ...value,
                        items: value.items.filter(
                          (item) => item.id !== selected.id,
                        ),
                      });
                      choose(null);
                    }}
                  >
                    Da, odstrani
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="danger-text"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} /> Odstrani prispevek
                </button>
              )}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
