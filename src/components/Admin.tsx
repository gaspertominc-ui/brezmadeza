import { useState, useEffect, useRef, type SyntheticEvent } from 'react';
import {
  Sparkles,
  ArrowUpRight,
  Save,
  LogOut,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Download,
  Upload,
  RotateCcw,
  Mail,
  Settings2,
  Eye,
  LockKeyhole,
  LoaderCircle,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import type { SiteContent } from '../lib/content';
import { contentSchema } from '../lib/content';
import Turnstile from './Turnstile';
import '../styles/admin.css';

type Value = string | Value[] | { [key: string]: Value };
type Inquiry = {
  id: string;
  data: {
    name: string;
    email: string;
    phone: string;
    location: string;
    service: string;
    message: string;
  };
  status: string;
  created_at: string;
};
const labels: Record<string, string> = {
  brand: 'Podatki podjetja',
  nav: 'Navigacija',
  hero: 'Uvodna naslovnica',
  trust: 'Prednosti v vrstici',
  services: 'Storitve',
  about: 'O čiščenju',
  process: 'Potek čiščenja',
  pricing: 'Cenik',
  faq: 'Pogosta vprašanja',
  contact: 'Kontakt in delovni čas',
  form: 'Obrazec za povpraševanje',
  footer: 'Noga strani',
  seo: 'SEO in deljenje',
  legal: 'Pravne vsebine',
  extra: 'Dodatne vsebinske sekcije',
  name: 'Ime znamke',
  tagline: 'Slogan',
  email: 'E-poštni naslov',
  phone: 'Telefon',
  area: 'Območje izvajanja',
  company: 'Uradno ime podjetja',
  address: 'Poslovni naslov',
  registration: 'Matična / davčna številka',
  eyebrow: 'Nadnaslov',
  title: 'Naslov',
  accent: 'Poudarjeni del naslova',
  description: 'Opis',
  cta: 'Besedilo gumba',
  secondary: 'Druga povezava',
  image: 'Slika (lokalna pot ali naslov HTTPS)',
  imageAlt: 'Opis slike za dostopnost',
  imageLabel: 'Oznaka na sliki',
  note: 'Opomba',
  floatingTitle: 'Naslov kartice na sliki',
  floatingText: 'Besedilo kartice na sliki',
  items: 'Elementi',
  link: 'Besedilo povezave',
  slug: 'Naslov v URL (male črke, številke, vezaji)',
  detail: 'Podroben opis storitve',
  label: 'Oznaka',
  points: 'Poudarki',
  price: 'Cena / oznaka cene',
  question: 'Vprašanje',
  answer: 'Odgovor',
  emailLabel: 'Oznaka e-pošte',
  phoneLabel: 'Oznaka telefona',
  areaLabel: 'Oznaka območja',
  hoursLabel: 'Oznaka delovnega časa',
  unavailable: 'Besedilo ob manjkajočem kontaktu',
  hours: 'Delovni čas',
  day: 'Dan / skupina dni',
  time: 'Čas',
  location: 'Oznaka kraja',
  message: 'Oznaka sporočila',
  messagePlaceholder: 'Namig v sporočilu',
  submit: 'Besedilo gumba za oddajo',
  consent: 'Obvestilo o osebnih podatkih',
  privacyLink: 'Povezava do zasebnosti',
  success: 'Potrditev oddaje',
  demoSuccess: 'Potrditev lokalnega predogleda',
  choose: 'Namig za izbiro storitve',
  navigation: 'Naslov navigacije',
  copyright: 'Avtorske pravice',
  privacy: 'Politika zasebnosti',
  terms: 'Pogoji poslovanja',
  backTop: 'Povezava na vrh',
  socialImage: 'Slika za deljenje (1200 × 630 priporočeno)',
  privacyTitle: 'Naslov strani o zasebnosti',
  termsTitle: 'Naslov pogojev poslovanja',
  text: 'Besedilo',
};
Object.assign(labels, {
  ui: 'Ostala besedila',
  home: 'Povezava domov',
  serviceDetailTitle: 'Naslov podrobnosti storitve',
  cleaningLabel: 'Oznaka storitve',
  notFoundTitle: 'Naslov napake 404',
  notFoundText: 'Opis napake 404',
  backHome: 'Gumb na začetno stran',
  imageCaption: 'Spodnji napis na sliki',
  namePlaceholder: 'Namig za ime',
  emailPlaceholder: 'Namig za e-pošto',
  phonePlaceholder: 'Namig za telefon',
  locationPlaceholder: 'Namig za kraj',
  other: 'Druga storitev',
  sending: 'Besedilo med pošiljanjem',
  security: 'Obvestilo o varstvu podatkov',
});
const tabs = [
  'brand',
  'nav',
  'hero',
  'trust',
  'services',
  'about',
  'process',
  'pricing',
  'faq',
  'contact',
  'form',
  'footer',
  'seo',
  'legal',
  'ui',
  'extra',
] as const;
function itemTitle(value: Value, index: number): string {
  if (typeof value === 'object' && value && !Array.isArray(value))
    return String(
      value.title || value.question || value.day || `Element ${index + 1}`,
    );
  return `Element ${index + 1}`;
}
function template(value: Value, key = ''): Value {
  if (typeof value === 'string') {
    if (['image', 'socialImage', 'imageAlt'].includes(key)) return value;
    if (key === 'slug')
      return `nova-storitev-${crypto.randomUUID().slice(0, 6)}`;
    if (['title', 'question', 'day'].includes(key)) return 'Nov element';
    return '';
  }
  if (Array.isArray(value)) return value.length ? [template(value[0])] : [];
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, template(item, key)]),
  );
}
function Field({
  value,
  name,
  onChange,
  level = 0,
}: {
  value: Value;
  name: string;
  onChange: (value: Value) => void;
  level?: number;
}) {
  if (typeof value === 'string') {
    const multiline =
      [
        'description',
        'detail',
        'answer',
        'text',
        'privacy',
        'terms',
        'messagePlaceholder',
        'consent',
      ].includes(name) ||
      value.length > 110 ||
      value.includes('\n');
    return (
      <label className="editor-field">
        <span>{labels[name] || name}</span>
        {multiline ? (
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={name === 'privacy' || name === 'terms' ? 12 : 3}
          />
        ) : (
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}{' '}
        {['image', 'socialImage'].includes(name) && value && (
          <img
            className="editor-image-preview"
            src={value}
            alt="Predogled izbrane slike"
            loading="lazy"
          />
        )}
      </label>
    );
  }
  if (Array.isArray(value))
    return (
      <div className="editor-array">
        <div className="array-title">
          <h3>{labels[name] || name}</h3>
          <span>{value.length} elementov</span>
        </div>
        {value.map((item, index) => (
          <details key={`${name}-${index}`} className="editor-item">
            <summary>
              <span className="item-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <strong>{itemTitle(item, index)}</strong>
              <ChevronDown size={16} />
            </summary>
            <div className="editor-item-body">
              <Field
                name={name}
                value={item}
                level={level + 1}
                onChange={(next) =>
                  onChange(
                    value.map((original, i) => (i === index ? next : original)),
                  )
                }
              />
              <div className="array-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    const copy = [...value];
                    [copy[index - 1], copy[index]] = [
                      copy[index],
                      copy[index - 1],
                    ];
                    onChange(copy);
                  }}
                >
                  <ArrowUp size={14} />
                  Višje
                </button>
                <button
                  type="button"
                  disabled={index === value.length - 1}
                  onClick={() => {
                    const copy = [...value];
                    [copy[index + 1], copy[index]] = [
                      copy[index],
                      copy[index + 1],
                    ];
                    onChange(copy);
                  }}
                >
                  <ArrowDown size={14} />
                  Nižje
                </button>
                <button
                  type="button"
                  className="danger-text"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <Trash2 size={14} />
                  Odstrani
                </button>
              </div>
            </div>
          </details>
        ))}
        <button
          type="button"
          className="add-item"
          onClick={() =>
            onChange([
              ...value,
              value.length
                ? template(value[0])
                : { title: 'Nova sekcija', text: '' },
            ])
          }
        >
          <Plus size={16} />
          Dodaj element
        </button>
      </div>
    );
  return (
    <div className={`editor-fields level-${level}`}>
      {Object.entries(value).map(([key, item]) => (
        <Field
          key={key}
          name={key}
          value={item}
          level={level + 1}
          onChange={(next) => onChange({ ...value, [key]: next })}
        />
      ))}
    </div>
  );
}
export default function Admin({ siteKey }: { siteKey: string }) {
  const [auth, setAuth] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [original, setOriginal] = useState('');
  const [version, setVersion] = useState(0);
  const [active, setActive] = useState<string>('hero');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dirty = content !== null && JSON.stringify(content) !== original;
  async function api(path: string, options?: RequestInit) {
    const response = await fetch(`/api/admin/${path}`, options);
    const body = await response.json();
    if (response.status === 401 && path !== 'login') setAuth(false);
    if (!response.ok)
      throw new Error(
        (body.error || 'Zahteva ni uspela.') +
          (body.details ? ` ${body.details.join(' ')}` : ''),
      );
    return body;
  }
  async function load() {
    try {
      const data = await api('content');
      setContent(data.content);
      setOriginal(JSON.stringify(data.content));
      setVersion(data.version);
      setAuth(true);
      const inbox = await api('inquiries');
      setInquiries(inbox.inquiries);
    } catch (error) {
      if (error instanceof Error && !error.message.includes('prijavite'))
        setNotice({ text: error.message, error: true });
      setAuth(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty]);
  async function login(event: SyntheticEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await api('login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, token }),
      });
      setPassword('');
      await load();
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'Prijava ni uspela.',
        error: true,
      });
    } finally {
      setBusy(false);
      setToken('');
      setCaptchaReset((v) => v + 1);
    }
  }
  async function save() {
    if (!content) return;
    const parsed = contentSchema.safeParse(content);
    if (!parsed.success) {
      setNotice({
        text: parsed.error.issues
          .map(
            (issue) =>
              `${issue.path.map((p) => labels[String(p)] || p).join(' → ')}: ${issue.message}`,
          )
          .join('\n'),
        error: true,
      });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const data = await api('content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, version }),
      });
      setVersion(data.version);
      setOriginal(JSON.stringify(content));
      setNotice({ text: 'Spremembe so shranjene in vidne na spletni strani.' });
    } catch (error) {
      setNotice({
        text:
          error instanceof Error ? error.message : 'Shranjevanje ni uspelo.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  function exportContent() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: 'application/json',
      }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `brezmadeza-vsebina-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importContent(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      if (selected.size > 300000) throw new Error('Datoteka je prevelika.');
      const data = contentSchema.parse(JSON.parse(await selected.text()));
      setContent(data);
      setNotice({
        text: 'Vsebina je uvožena kot osnutek. Preverite jo in shranite.',
      });
    } catch {
      setNotice({
        text: 'Uvoz ni uspel. Izberite veljavno varnostno kopijo vsebine.',
        error: true,
      });
    }
    event.target.value = '';
  }
  async function updateInquiry(id: string, remove = false) {
    setBusy(true);
    try {
      await api('inquiries', {
        method: remove ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'handled' }),
      });
      const inbox = await api('inquiries');
      setInquiries(inbox.inquiries);
      setDeleteId(null);
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : 'Sprememba ni uspela.',
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }
  if (auth === null)
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" size={24} /> Nalaganje urejevalnika …
      </div>
    );
  if (!auth)
    return (
      <div className="admin-login">
        <a href="/" className="admin-brand">
          <Sparkles size={26} />
          brezmadeža.
        </a>
        <div className="login-card">
          <span className="login-lock">
            <LockKeyhole size={26} />
          </span>
          <span className="admin-kicker">ZASEBNI DOSTOP</span>
          <h1>Dobrodošli v uredništvu.</h1>
          <p>Vaš prostor za vsebino, sveže ideje in nova povpraševanja.</p>
          <form onSubmit={login}>
            <label>
              Geslo za dostop
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
            </label>
            <Turnstile
              siteKey={siteKey}
              action="admin_login"
              onToken={setToken}
              reset={captchaReset}
            />
            <button className="button" disabled={busy || (!!siteKey && !token)}>
              {busy ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <>
                  Vstop v urejevalnik
                  <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </form>
          {notice && (
            <div className="admin-notice error" role="alert">
              {notice.text}
            </div>
          )}
          <a className="login-back" href="/">
            ← Nazaj na spletno stran
          </a>
        </div>
        <p className="login-foot">Brezmadeža · Urejanje spletne strani</p>
      </div>
    );
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/">
          <Sparkles size={25} />
          brezmadeža.
        </a>
        <div className="admin-workspace">
          <span className="workspace-icon">
            <Settings2 size={18} />
          </span>
          <div>
            Uredništvo<span>brezmadeza.si</span>
          </div>
        </div>
        <div className="sidebar-label">VSEBINA SPLETNE STRANI</div>
        <nav>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={active === tab ? 'active' : ''}
              onClick={() => {
                setActive(tab);
                setNotice(null);
              }}
            >
              {labels[tab]}
              <span>→</span>
            </button>
          ))}
        </nav>
        <button
          className={`inbox-nav ${active === 'inbox' ? 'active' : ''}`}
          onClick={() => {
            setActive('inbox');
            void api('inquiries')
              .then((data) => setInquiries(data.inquiries))
              .catch((error) =>
                setNotice({ text: error.message, error: true }),
              );
          }}
        >
          <Mail size={17} />
          Povpraševanja
          <span>
            {inquiries.filter((item) => item.status === 'new').length}
          </span>
        </button>
        <div className="sidebar-bottom">
          <a href="/" target="_blank" rel="noreferrer">
            <Eye size={16} />
            Odpri spletno stran
            <ArrowUpRight size={14} />
          </a>
          <button
            onClick={async () => {
              await api('logout', { method: 'POST' });
              setAuth(false);
              setContent(null);
            }}
          >
            <LogOut size={16} />
            Odjava
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>
            <span className={`status-dot ${dirty ? 'unsaved' : ''}`} />
            {dirty
              ? 'Neshranjene spremembe'
              : `Vse spremembe shranjene · različica ${version}`}
          </span>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="preview-button"
          >
            <Eye size={16} />
            Predogled
          </a>
          <button
            className="button"
            disabled={!dirty || busy}
            onClick={() => void save()}
          >
            {busy ? (
              <LoaderCircle className="spin" size={15} />
            ) : (
              <Save size={15} />
            )}
            Shrani spremembe
          </button>
          <button
            className="topbar-logout"
            title="Odjava"
            aria-label="Odjava"
            onClick={async () => {
              await api('logout', { method: 'POST' });
              setAuth(false);
              setContent(null);
            }}
          >
            <LogOut size={16} />
          </button>
        </header>
        <div className="admin-content">
          <div className="editor-heading">
            <div>
              <p className="admin-kicker">
                {active === 'inbox'
                  ? 'VAŠA SPOROČILA'
                  : 'VAŠA STRAN. VAŠA VSEBINA.'}
              </p>
              <h1>{active === 'inbox' ? 'Povpraševanja' : labels[active]}</h1>
              <p>
                {active === 'inbox'
                  ? 'Prejeta povpraševanja na enem mestu.'
                  : 'Uredite vsebino, nato shranite spremembe za objavo na strani.'}
              </p>
            </div>
            {active !== 'inbox' && (
              <span className="editor-heading-icon">
                <Sparkles size={28} />
              </span>
            )}
          </div>
          {notice && (
            <div
              className={`admin-notice ${notice.error ? 'error' : 'success'}`}
              role="status"
            >
              <span>{notice.text}</span>
              <button
                aria-label="Zapri obvestilo"
                onClick={() => setNotice(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {active === 'inbox' ? (
            <div className="inquiries-list">
              {!inquiries.length ? (
                <div className="empty-inbox">
                  <Mail size={36} />
                  <h2>Prostor za nove začetke.</h2>
                  <p>Ko obiskovalec odda povpraševanje, se prikaže tukaj.</p>
                </div>
              ) : (
                inquiries.map((item) => (
                  <article className="inquiry-card" key={item.id}>
                    <div className="inquiry-card-top">
                      <h3>{item.data.name}</h3>
                      <span
                        className={
                          item.status === 'new'
                            ? 'inquiry-badge'
                            : 'inquiry-badge handled'
                        }
                      >
                        {item.status === 'new' ? 'Novo' : 'Obravnavano'}
                      </span>
                      <time>
                        {new Date(
                          item.created_at.replace(' ', 'T') + 'Z',
                        ).toLocaleString('sl-SI')}
                      </time>
                    </div>
                    <p className="inquiry-service">
                      {item.data.service} · {item.data.location}
                    </p>
                    <p className="inquiry-message">{item.data.message}</p>
                    <div className="inquiry-contact">
                      <a href={`mailto:${item.data.email}`}>
                        {item.data.email}
                      </a>
                      {item.data.phone && (
                        <a href={`tel:${item.data.phone}`}>{item.data.phone}</a>
                      )}
                    </div>
                    <div className="inquiry-actions">
                      <a
                        href={`mailto:${item.data.email}?subject=${encodeURIComponent('Vaše povpraševanje – Brezmadeža')}`}
                      >
                        <Mail size={14} />
                        Odgovori po e-pošti
                      </a>
                      {item.status === 'new' && (
                        <button
                          disabled={busy}
                          onClick={() => void updateInquiry(item.id)}
                        >
                          <Check size={14} />
                          Označi kot obravnavano
                        </button>
                      )}
                      <button
                        className="danger-text"
                        disabled={busy}
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 size={14} />
                        Izbriši
                      </button>
                    </div>
                  </article>
                ))
              )}
              <p className="editor-help">
                Prikazanih je do 200 najnovejših povpraševanj. Stare osebne
                podatke izbrišite, ko jih ne potrebujete več. Prejem tukaj
                potrjuje shranjevanje; ne potrjuje dostave e-poštnega obvestila.
              </p>
            </div>
          ) : (
            content && (
              <>
                <div className="editor-card">
                  <Field
                    name={active}
                    value={content[active as keyof SiteContent]}
                    onChange={(value) =>
                      setContent({ ...content, [active]: value })
                    }
                  />
                </div>
                <div className="editor-tools">
                  <button onClick={exportContent}>
                    <Download size={15} />
                    Izvozi varnostno kopijo
                  </button>
                  <button onClick={() => file.current?.click()}>
                    <Upload size={15} />
                    Uvozi vsebino
                  </button>
                  <button
                    disabled={!dirty}
                    onClick={() => {
                      setContent(JSON.parse(original));
                      setNotice({
                        text: 'Neshranjene spremembe so razveljavljene.',
                      });
                    }}
                  >
                    <RotateCcw size={15} />
                    Razveljavi osnutek
                  </button>
                  <input
                    ref={file}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(event) => void importContent(event)}
                  />
                </div>
                <p className="editor-help">
                  Slike lahko zamenjate z naslovom HTTPS ali lokalno potjo iz
                  mape public. Dodajajte in premikajte storitve, vprašanja ter
                  dodatne vsebinske sekcije. Pravni podatki in besedila so
                  predloga, ki jo dopolnite pred javno objavo.
                </p>
              </>
            )
          )}
        </div>
      </div>
      {deleteId && (
        <div className="modal-backdrop">
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
          >
            <Trash2 size={26} />
            <h2 id="delete-title">Izbrišem povpraševanje?</h2>
            <p>
              Sporočilo in njegovi osebni podatki bodo trajno odstranjeni iz
              baze.
            </p>
            <div>
              <button onClick={() => setDeleteId(null)}>Prekliči</button>
              <button
                className="button"
                disabled={busy}
                onClick={() => void updateInquiry(deleteId, true)}
              >
                Izbriši povpraševanje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
