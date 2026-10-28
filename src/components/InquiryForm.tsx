import { useState, type SyntheticEvent } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react';
import type { SiteContent } from '../lib/content';
import Turnstile from './Turnstile';

export default function InquiryForm({
  copy: c,
  services,
  siteKey,
  local,
}: {
  copy: SiteContent['form'];
  services: string[];
  siteKey: string;
  local: boolean;
}) {
  const [token, setToken] = useState('');
  const [reset, setReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    type: string;
  } | null>(null);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    let saved = false;
    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          consent: data.consent === 'on',
          token,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || 'Pošiljanje ni uspelo. Poskusite znova.');
      saved = true;
      if (body.demo) {
        setResult({ message: c.demoSuccess, type: 'success' });
        form.reset();
        return;
      }
      const emailResponse = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: body.accessKey,
          subject: 'Novo povpraševanje – Brezmadeža',
          from_name: 'Brezmadeža',
          name: data.name,
          email: data.email,
          telefon: data.phone,
          storitev: data.service,
          kraj: data.location,
          message: data.message,
          referenca: body.id,
        }),
      });
      const emailResult = await emailResponse.json();
      if (!emailResponse.ok || !emailResult.success)
        throw new Error(
          'Povpraševanje smo shranili, e-poštnega obvestila pa ni bilo mogoče poslati. Ne pošiljajte znova; po potrebi nas pokličite.',
        );
      setResult({ message: c.success, type: 'success' });
      form.reset();
    } catch (error) {
      setResult({
        message: saved
          ? 'Povpraševanje smo shranili, e-poštnega obvestila pa ni bilo mogoče poslati. Ne pošiljajte znova; po potrebi uporabite objavljeni kontakt.'
          : error instanceof Error
            ? error.message
            : 'Pošiljanje ni uspelo. Poskusite znova.',
        type: saved ? 'warning' : 'error',
      });
    } finally {
      setBusy(false);
      setToken('');
      setReset((v) => v + 1);
    }
  }
  return (
    <form onSubmit={submit} className="inquiry-form">
      <span className="form-eyebrow">
        <span /> {c.eyebrow}
      </span>
      <h3>{c.title}</h3>
      <p className="form-description">{c.description}</p>
      <div className="form-grid">
        <label>
          {c.name}
          <input
            autoComplete="name"
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder={c.namePlaceholder}
          />
        </label>
        <label>
          {c.email}
          <input
            autoComplete="email"
            type="email"
            name="email"
            required
            maxLength={200}
            placeholder={c.emailPlaceholder}
          />
        </label>
        <label>
          {c.phone}
          <input
            autoComplete="tel"
            type="tel"
            name="phone"
            maxLength={50}
            placeholder={c.phonePlaceholder}
          />
        </label>
        <label>
          {c.location}
          <input
            autoComplete="address-level2"
            name="location"
            required
            minLength={2}
            maxLength={150}
            placeholder={c.locationPlaceholder}
          />
        </label>
      </div>
      <label htmlFor="inquiry-service">{c.service}</label>
      <select id="inquiry-service" name="service" required defaultValue="">
        <option value="" disabled>
          {c.choose}
        </option>
        {services.map((s, i) => (
          <option key={i}>{s}</option>
        ))}
        <option>{c.other}</option>
      </select>
      <label>
        {c.message}
        <textarea
          name="message"
          rows={4}
          required
          minLength={10}
          maxLength={4000}
          placeholder={c.messagePlaceholder}
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Spletna stran
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <label className="consent">
        <input type="checkbox" name="consent" required />
        <span>
          {c.consent}{' '}
          <a href="/zasebnost" target="_blank" rel="noreferrer">
            {c.privacyLink}
          </a>
        </span>
      </label>
      <Turnstile
        siteKey={siteKey}
        action="contact"
        onToken={setToken}
        reset={reset}
      />
      <button
        className="button form-submit"
        disabled={busy || (!!siteKey && !token)}
      >
        {busy ? (
          <>
            <LoaderCircle className="spin" size={19} /> {c.sending}
          </>
        ) : (
          <>
            {c.submit}
            <ArrowUpRight size={20} />
          </>
        )}
      </button>
      <p className="form-security">
        <ShieldCheck size={15} /> {c.security}
      </p>
      {local && (
        <p className="local-notice">
          Lokalni predogled · brez povezanih ključev se povpraševanje samo
          shrani.
        </p>
      )}
      {result && (
        <div
          className={`form-result ${result.type}`}
          role="status"
          tabIndex={-1}
        >
          {result.type === 'success' && <CheckCircle2 size={20} />}
          <span>{result.message}</span>
        </div>
      )}
    </form>
  );
}
