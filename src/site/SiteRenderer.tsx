import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import './site.css';
import { fontStack, googleFontsHref } from './fonts';
import { SITE_LABELS, type SiteLabels } from './defaults';
import { resolveTheme } from './themes';
import type {
  FaqItem, PublicSiteData, PublicTherapist, PublicTreatment, Section, SiteTheme, Testimonial,
} from './types';

type Mode = 'live' | 'preview';

interface Ctx {
  site: PublicSiteData;
  theme: SiteTheme;
  L: SiteLabels;
  locale: 'es' | 'en';
  mode: Mode;
  money: (n: number | null) => string;
}

/** Loads the theme's Google Fonts once per font set. */
export const useSiteFonts = (keys: string[]) => {
  const href = googleFontsHref(keys);
  useEffect(() => {
    const id = `cs-fonts-${btoa(href).slice(0, 24)}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
};

export const themeStyle = (t: SiteTheme): CSSProperties =>
  ({
    '--s-bg': t.colors.bg,
    '--s-surface': t.colors.surface,
    '--s-ink': t.colors.ink,
    '--s-muted': t.colors.muted,
    '--s-accent': t.colors.accent,
    '--s-accent-ink': t.colors.accentInk,
    '--s-line': t.colors.line,
    '--s-radius': `${t.radius}px`,
    '--s-font-display': fontStack(t.fonts.display),
    '--s-font-body': fontStack(t.fonts.body),
    '--s-h-weight': String(t.heading.weight),
    '--s-h-track': `${t.heading.tracking}em`,
    '--s-h-case': t.heading.upper ? 'uppercase' : 'none',
    '--s-h-scale': String(t.heading.scale),
    '--s-h-width': `${t.heading.width ?? 100}%`,
    colorScheme: t.dark ? 'dark' : 'light',
  }) as CSSProperties;

const fullName = (th: PublicTherapist) =>
  [th.first_name, th.last_name].filter(Boolean).map((s) => titleCase(s as string)).join(' ');
const titleCase = (s: string) => s.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
const initials = (th: PublicTherapist) => `${th.first_name?.[0] ?? ''}${th.last_name?.[0] ?? ''}`;
const hhmm = (t: string) => t.slice(0, 5);

/** Splits "word *accent* word" so authors can mark one accented phrase in titles. */
const Accent = ({ text }: { text?: string }) => {
  if (!text) return null;
  const parts = text.split(/\*(.+?)\*/g);
  return <>{parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>))}</>;
};

const Media = ({ src, alt, children, className, shape }: { src?: string; alt?: string; children?: ReactNode; className?: string; shape?: string }) => (
  <div className={`cs-media ${className ?? ''}`} data-shape={shape}>{src ? <img src={src} alt={alt ?? ''} loading="lazy" /> : children}</div>
);

const Head = ({ s, center }: { s: Section; center?: boolean }) => (
  <div className="cs-head" style={center ? { marginInline: 'auto', textAlign: 'center' } : undefined}>
    {s.data.eyebrow && <p className="cs-eyebrow">{s.data.eyebrow}</p>}
    {s.data.title && <h2 className="cs-h cs-h2"><Accent text={s.data.title} /></h2>}
    {s.data.subtitle && <p className="cs-lead" style={center ? { marginInline: 'auto' } : undefined}>{s.data.subtitle}</p>}
  </div>
);

const BookLink = ({ label, solid }: { label?: string; solid?: boolean }) => (
  <a className={`cs-btn ${solid ? 'solid' : ''}`} href="#reservar">{label} →</a>
);

/* ------------------------------ HERO ------------------------------ */
const Hero = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = (s.variant || c.theme.variants.hero) as SiteTheme['variants']['hero'];
  const d = s.data;
  const firstBookable = c.site.treatments.find((t) => t.bookable);
  const chips = c.site.treatments.slice(0, 3).map((t) => t.name);
  const text = (
    <div>
      {d.eyebrow && <p className="cs-eyebrow">{d.eyebrow}</p>}
      <h1 className="cs-h cs-h1"><Accent text={d.title} /></h1>
      {d.subtitle && <p className="cs-lead">{d.subtitle}</p>}
      <div className="cs-actions">
        <BookLink label={d.ctaLabel || c.L.book} solid />
        {c.site.clinic.phone && <a className="cs-btn ghost" href={`tel:${c.site.clinic.phone}`}>{c.site.clinic.phone}</a>}
      </div>
    </div>
  );

  if (variant === 'editorial')
    return (
      <div className="cs-hero-editorial">
        {text}
        <figure style={{ margin: 0 }}>
          <Media src={d.imageUrl} alt={d.title} shape={d.imageShape || c.theme.mask} />
          <figcaption>{c.site.clinic.address || c.site.clinic.name}</figcaption>
        </figure>
      </div>
    );
  if (variant === 'centered')
    return (
      <div className="cs-hero-centered">
        {d.eyebrow && <p className="cs-eyebrow">{d.eyebrow}</p>}
        <h1 className="cs-h cs-h1"><Accent text={d.title} /></h1>
        {d.subtitle && <p className="cs-lead">{d.subtitle}</p>}
        <div className="cs-actions"><BookLink label={d.ctaLabel || c.L.book} solid /></div>
        {chips.length > 0 && <div className="cs-chips">{chips.map((n) => <span className="cs-chip" key={n}>{n}</span>)}</div>}
      </div>
    );
  if (variant === 'fullbleed')
    return (
      <div className="cs-hero-full">
        <Media src={d.imageUrl} alt={d.title} shape={d.imageShape || c.theme.mask} />
        <div>
          {d.eyebrow && <p className="cs-eyebrow">{d.eyebrow}</p>}
          <h1 className="cs-h cs-h1"><Accent text={d.title} /></h1>
          {d.subtitle && <p className="cs-lead">{d.subtitle}</p>}
          <div className="cs-actions"><BookLink label={d.ctaLabel || c.L.book} solid /></div>
        </div>
      </div>
    );
  if (variant === 'stacked')
    return (
      <div className="cs-hero-stacked">
        <h1 className="cs-h cs-h1"><Accent text={d.title} /></h1>
        <div className="side">
          <div className="meta">
            {d.eyebrow && <p className="cs-eyebrow" style={{ margin: 0 }}>{d.eyebrow}</p>}
            {d.subtitle && <p style={{ margin: 0 }}>{d.subtitle}</p>}
            {c.site.clinic.address && <p className="cs-muted" style={{ margin: 0, fontSize: 14 }}>{c.site.clinic.address}</p>}
          </div>
          <a className="book" href="#reservar">
            <span>{firstBookable ? `${firstBookable.name}` : c.L.book}</span>
            <strong>{d.ctaLabel || c.L.book} →</strong>
          </a>
        </div>
      </div>
    );
  // split (default)
  return (
    <div className="cs-hero-split">
      {text}
      <div className="cs-mediabox">
        <Media src={d.imageUrl} alt={d.title} shape={d.imageShape || c.theme.mask} />
        {firstBookable && (
          <div className="cs-float">
            <span>{firstBookable.name}</span>
            <b>{firstBookable.duration_minutes ? `${firstBookable.duration_minutes} ${c.L.minutes}` : c.L.book}</b>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------------------------- SERVICES ---------------------------- */
const Services = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = (s.variant || c.theme.variants.services) as SiteTheme['variants']['services'];
  const items = c.site.treatments;
  const meta = (t: PublicTreatment) =>
    [t.duration_minutes ? `${t.duration_minutes} ${c.L.minutes}` : null, t.price != null ? c.money(t.price) : null].filter(Boolean).join(' · ');
  let body: ReactNode;
  if (variant === 'list')
    body = (
      <ul className="cs-svc-list">
        {items.map((t) => (
          <li key={t.id}>
            <span className="name">{t.name}</span>
            <span className="meta">{meta(t)}</span>
            {t.description && <p className="desc">{t.description}</p>}
          </li>
        ))}
      </ul>
    );
  else if (variant === 'table')
    body = (
      <div style={{ overflowX: 'auto' }}>
        <table className="cs-svc-table">
          <thead><tr><th className="hide-sm">#</th><th>{s.data.title}</th><th className="r">{c.L.minutes}</th><th className="r">{c.site.clinic.currency}</th></tr></thead>
          <tbody>
            {items.map((t, i) => (
              <tr key={t.id}>
                <td className="hide-sm cs-num cs-muted">{String(i + 1).padStart(2, '0')}</td>
                <td className="n">{t.name}{t.description && <div className="cs-muted" style={{ fontFamily: 'var(--s-font-body)', fontSize: 14, fontWeight: 400, textTransform: 'none', marginTop: 4 }}>{t.description}</div>}</td>
                <td className="r">{t.duration_minutes ?? '—'}</td>
                <td className="r">{t.price != null ? c.money(t.price) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  else if (variant === 'bento')
    body = (
      <div className="cs-svc-bento">
        {items.map((t) => (
          <div className="cs-card" key={t.id}>
            <h3 className="cs-h cs-h3">{t.name}</h3>
            {t.description && <p className="cs-muted" style={{ margin: 0, fontSize: 14 }}>{t.description}</p>}
            <span className="cs-muted cs-num" style={{ fontSize: 14 }}>{meta(t)}</span>
          </div>
        ))}
      </div>
    );
  else
    body = (
      <div className="cs-svc-cards">
        {items.map((t) => (
          <div className="cs-card" key={t.id}>
            <span className="cs-dot">{t.name.charAt(0)}</span>
            <h3 className="cs-h cs-h3">{t.name}</h3>
            {t.description && <p className="cs-muted" style={{ margin: 0, fontSize: 15 }}>{t.description}</p>}
            <div className="bar">
              <span>{t.duration_minutes ? `${t.duration_minutes} ${c.L.minutes}` : ''}</span>
              {t.price != null && <span className="price cs-num">{c.money(t.price)}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  return (<><Head s={s} />{body}</>);
};

/* ------------------------------ ABOUT ----------------------------- */
const About = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.about;
  if (variant === 'statement')
    return (
      <div>
        {s.data.eyebrow && <p className="cs-eyebrow">{s.data.eyebrow}</p>}
        <p className="cs-statement"><Accent text={s.data.title} /></p>
        {s.data.body && <div className="cs-statement-body">{s.data.body}</div>}
      </div>
    );
  return (
    <div className="cs-about-split">
      <Media src={s.data.imageUrl} alt={s.data.title} shape={s.data.imageShape || c.theme.mask} />
      <div>
        {s.data.eyebrow && <p className="cs-eyebrow">{s.data.eyebrow}</p>}
        <h2 className="cs-h cs-h2"><Accent text={s.data.title} /></h2>
        {s.data.body && <div className="cs-about-body">{s.data.body}</div>}
      </div>
    </div>
  );
};

/* ------------------------------ TEAM ------------------------------ */
const Team = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.team;
  const people = c.site.therapists;
  if (people.length === 0) return null;
  if (variant === 'list')
    return (
      <>
        <Head s={s} />
        <ul className="cs-team-list">
          {people.map((p) => (
            <li key={p.id}>
              <span className="who">{fullName(p)}</span>
              {p.specialties?.length ? <span className="cs-muted" style={{ fontSize: 14 }}>{p.specialties.join(' · ')}</span> : null}
              {p.bio && <span style={{ fontSize: 15 }}>{p.bio}</span>}
            </li>
          ))}
        </ul>
      </>
    );
  return (
    <>
      <Head s={s} />
      <div className="cs-team-grid">
        {people.map((p) => (
          <div key={p.id}>
            <Media src={p.photo_url ?? undefined} alt={fullName(p)} shape={s.data.imageShape || c.theme.mask}>
              <span className="cs-initials">{initials(p)}</span>
            </Media>
            <h3 className="cs-h cs-h3">{fullName(p)}</h3>
            {p.specialties?.length ? <p className="cs-muted" style={{ margin: '4px 0 0', fontSize: 14 }}>{p.specialties.join(' · ')}</p> : null}
            {p.bio && <p style={{ margin: '8px 0 0', fontSize: 15 }}>{p.bio}</p>}
          </div>
        ))}
      </div>
    </>
  );
};

/* -------------------------- TESTIMONIALS -------------------------- */
const Testimonials = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.testimonials;
  const items = (s.data.items ?? []) as Testimonial[];
  if (!items.length) return null;
  if (variant === 'single') {
    const [first, ...rest] = items;
    return (
      <div>
        {s.data.eyebrow && <p className="cs-eyebrow">{s.data.eyebrow}</p>}
        <blockquote className="cs-quote-single">
          <p>{first.quote}</p>
          <cite>— {first.author}</cite>
        </blockquote>
        {rest.length > 0 && (
          <div className="cs-quote-more" style={{ marginTop: 36 }}>
            {rest.map((q, i) => <span key={i}>“{q.quote}” — {q.author}</span>)}
          </div>
        )}
      </div>
    );
  }
  return (
    <>
      <Head s={s} />
      <div className="cs-quotes">
        {items.map((q, i) => (
          <blockquote className="cs-card" key={i}>
            <p>“{q.quote}”</p>
            <cite>— {q.author}</cite>
          </blockquote>
        ))}
      </div>
    </>
  );
};

/* ------------------------------- FAQ ------------------------------ */
const Faq = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.faq;
  const items = (s.data.items ?? []) as FaqItem[];
  if (!items.length) return null;
  return (
    <>
      <Head s={s} />
      {variant === 'columns' ? (
        <div className="cs-faq-cols">
          {items.map((f, i) => (<div key={i}><h4>{f.q}</h4><p>{f.a}</p></div>))}
        </div>
      ) : (
        <div className="cs-faq">
          {items.map((f, i) => (<details key={i}><summary>{f.q}</summary><p>{f.a}</p></details>))}
        </div>
      )}
    </>
  );
};

/* ---------------------------- LOCATION ---------------------------- */
const Location = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.location;
  const { clinic, hours } = c.site;
  const order = [1, 2, 3, 4, 5, 6, 0];
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const hoursTable = (
    <table className="cs-hours">
      <tbody>
        {order.map((d) => {
          const h = byDay.get(d);
          return (<tr key={d}><td>{c.L.weekdays[d]}</td><td>{h ? `${hhmm(h.start)}–${hhmm(h.end)}` : c.L.closed}</td></tr>);
        })}
      </tbody>
    </table>
  );
  const mapUrl = clinic.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.address)}` : null;
  if (variant === 'band')
    return (
      <>
        <Head s={s} />
        <div className="cs-loc-band">
          {clinic.address && <div><span className="cs-eyebrow" style={{ margin: 0 }}>{c.L.contact}</span><span>{clinic.address}</span>{mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}</div>}
          {clinic.phone && <div><span className="cs-eyebrow" style={{ margin: 0 }}>Tel.</span><a href={`tel:${clinic.phone}`}>{clinic.phone}</a></div>}
          {clinic.email && <div><span className="cs-eyebrow" style={{ margin: 0 }}>Email</span><a href={`mailto:${clinic.email}`}>{clinic.email}</a></div>}
          <div><span className="cs-eyebrow" style={{ margin: 0 }}>{c.L.hours}</span>
            {order.filter((d) => byDay.has(d)).length === 7
              ? <span>{c.L.weekdays[1]}–{c.L.weekdays[0]}</span>
              : <span>{order.filter((d) => byDay.has(d)).map((d) => c.L.weekdays[d].slice(0, 3)).join(', ')}</span>}
          </div>
        </div>
      </>
    );
  return (
    <div className="cs-loc-split">
      <div>
        <Head s={s} />
        <div className="cs-contact">
          {clinic.address && <span>{clinic.address}</span>}
          {mapUrl && <a href={mapUrl} target="_blank" rel="noreferrer">Google Maps ↗</a>}
          {clinic.phone && <a href={`tel:${clinic.phone}`}>{clinic.phone}</a>}
          {clinic.email && <a href={`mailto:${clinic.email}`}>{clinic.email}</a>}
        </div>
      </div>
      <div>{hoursTable}</div>
    </div>
  );
};

/* ------------------------------- CTA ------------------------------ */
const Cta = ({ s, c }: { s: Section; c: Ctx }) => {
  const variant = s.variant || c.theme.variants.cta;
  if (variant === 'card')
    return (
      <div className="cs-cta-card">
        <h2 className="cs-h cs-h2"><Accent text={s.data.title} /></h2>
        {s.data.subtitle && <p className="cs-lead" style={{ marginTop: 6 }}>{s.data.subtitle}</p>}
        <div className="cs-actions"><BookLink label={s.data.ctaLabel || c.L.book} solid /></div>
      </div>
    );
  return null; // band is rendered full-width by the section wrapper
};

/* ----------------------------- BOOKING ---------------------------- */
const tzToday = (tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

interface Slot { slot_start: string; slot_end: string }

const Booking = ({ s, c }: { s: Section; c: Ctx }) => {
  const { site, L, locale, mode } = c;
  const tz = site.clinic.timezone;
  const bookable = site.treatments.filter((t) => t.bookable);
  const [treatmentId, setTreatmentId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', notes: '', website: '', consent: false });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const days = useMemo(() => {
    const today = tzToday(tz);
    const horizon = Math.min(site.booking.horizon_days || 30, 30);
    return Array.from({ length: horizon }, (_, i) => addDays(today, i));
  }, [tz, site.booking.horizon_days]);

  const treatment = bookable.find((t) => t.id === treatmentId) ?? null;
  const step = !treatment ? 1 : !slot ? 2 : 3;

  useEffect(() => {
    if (!treatmentId || !day) return;
    let cancelled = false;
    setLoadingSlots(true);
    setSlots(null);
    (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: Slot[] | null; error: unknown }>)(
      'get_public_availability',
      { p_slug: site.slug, p_treatment_id: treatmentId, p_from: day, p_days: 1 },
    ).then(({ data, error: e }) => {
      if (cancelled) return;
      setSlots(e ? [] : data ?? []);
      setLoadingSlots(false);
    });
    return () => { cancelled = true; };
  }, [treatmentId, day, site.slug]);

  const fmtTime = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
  const fmtDay = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    return {
      wd: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(d),
      n: d.getUTCDate(),
      mo: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(d),
    };
  };
  const fmtLong = (iso: string) => new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!treatment || !slot || mode === 'preview') return;
    if (form.phone.replace(/\D/g, '').length < 10) { setError(L.errorPhone); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/website-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: site.slug, treatmentId: treatment.id, start: slot.slot_start, ...form }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = json?.error as string | undefined;
        if (code === 'slot_unavailable') { setSlot(null); setSlots((prev) => prev?.filter((x) => x.slot_start !== slot.slot_start) ?? null); setError(L.errorSlot); }
        else if (code === 'rate_limited') setError(L.errorRate);
        else if (code === 'too_many_pending') setError(L.errorPending);
        else if (code === 'invalid_phone') setError(L.errorPhone);
        else if (code === 'invalid_email') setError(L.errorEmail);
        else if (code === 'invalid_name') setError(L.errorName);
        else if (code === 'consent_required') setError(L.errorConsent);
        else if (code === 'treatment_not_found' || code === 'site_not_found') setError(L.errorService);
        else setError(`${L.errorGeneric} (${code ?? res.status})`);
        return;
      }
      setDone(true);
    } catch {
      setError(L.errorNetwork);
    } finally {
      setSending(false);
    }
  };

  const reset = () => { setDone(false); setSlot(null); setDay(null); setTreatmentId(null); setForm((f) => ({ ...f, notes: '' })); };

  const intro = (
    <div>
      {s.data.eyebrow && <p className="cs-eyebrow">{s.data.eyebrow}</p>}
      <h2 className="cs-h cs-h2"><Accent text={s.data.title} /></h2>
      {s.data.subtitle && <p className="cs-lead">{s.data.subtitle}</p>}
      <p className="cs-muted" style={{ fontSize: 14, marginTop: 18 }}>{L.withTherapist}</p>
    </div>
  );

  if (!site.booking.enabled || bookable.length === 0)
    return (<div className="cs-book">{intro}<div className="cs-book-panel"><p style={{ margin: 0 }}>{L.bookingOff}</p>{site.clinic.phone && <a className="cs-btn solid" href={`tel:${site.clinic.phone}`}>{site.clinic.phone}</a>}</div></div>);

  return (
    <div className="cs-book">
      {intro}
      <div className="cs-book-panel" aria-live="polite">
        {done ? (
          <>
            <h3 className="cs-h cs-h3">{L.successTitle}</h3>
            {treatment && slot && (<div className="cs-summary"><b>{treatment.name}</b><span>{fmtLong(slot.slot_start)}</span></div>)}
            <p style={{ margin: 0 }}>{L.successBody}</p>
            <div><button type="button" className="cs-btn ghost" onClick={reset}>{L.another}</button></div>
          </>
        ) : (
          <>
            <div className="cs-steps">
              <span className={step === 1 ? 'on' : ''}>1 · {L.chooseService}</span>
              <span className={step === 2 ? 'on' : ''}>2 · {L.chooseTime}</span>
              <span className={step === 3 ? 'on' : ''}>3 · {L.yourData}</span>
            </div>

            {step === 1 && (
              <div className="cs-opt-list">
                {bookable.map((t) => (
                  <button type="button" className="cs-opt" key={t.id} aria-pressed={treatmentId === t.id}
                    onClick={() => { setTreatmentId(t.id); setDay(days[0]); setSlot(null); }}>
                    <span><b>{t.name}</b>{t.duration_minutes ? <span className="cs-muted"> · {t.duration_minutes} {L.minutes}</span> : null}</span>
                    {t.price != null && <span className="cs-num">{c.money(t.price)}</span>}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && treatment && (
              <>
                <div className="cs-row"><b>{treatment.name}</b><button type="button" className="cs-linkbtn" onClick={() => setTreatmentId(null)}>{L.back}</button></div>
                <div className="cs-days" role="group" aria-label={L.chooseDay}>
                  {days.map((d) => {
                    const f = fmtDay(d);
                    return (
                      <button type="button" key={d} className="cs-day" aria-pressed={day === d} onClick={() => { setDay(d); setSlot(null); }}>
                        <small>{f.wd}</small><b>{f.n}</b><small>{f.mo}</small>
                      </button>
                    );
                  })}
                </div>
                {loadingSlots && <p className="cs-muted" style={{ margin: 0 }}>{L.loadingSlots}</p>}
                {!loadingSlots && slots && slots.length === 0 && <p className="cs-muted" style={{ margin: 0 }}>{L.noSlots}</p>}
                {!loadingSlots && slots && slots.length > 0 && (
                  <div className="cs-slots">
                    {slots.map((x) => (
                      <button type="button" key={x.slot_start} className="cs-slot" aria-pressed={slot?.slot_start === x.slot_start} onClick={() => setSlot(x)}>
                        {fmtTime(x.slot_start)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {step === 3 && treatment && slot && (
              <form className="cs-form" onSubmit={submit}>
                <div className="cs-summary full">
                  <div className="cs-row"><b>{treatment.name}</b><button type="button" className="cs-linkbtn" onClick={() => setSlot(null)}>{L.back}</button></div>
                  <span>{fmtLong(slot.slot_start)}</span>
                </div>
                <label>{L.firstName}<input id="cs-first" required autoComplete="given-name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
                <label>{L.lastName}<input id="cs-last" required autoComplete="family-name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label>
                <label>{L.phone}<input id="cs-phone" required type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label>{L.email}<input id="cs-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="full">{L.notes}<textarea id="cs-notes" rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
                <label className="cs-hp" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
                <label className="full cs-consent"><input id="cs-consent" type="checkbox" required checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} /><span>{L.consent}</span></label>
                {error && <div className="cs-alert full" role="alert">{error}</div>}
                <div className="full"><button type="submit" className="cs-btn solid" disabled={sending || mode === 'preview'}>{sending ? L.sending : L.send}</button></div>
              </form>
            )}
            {step !== 3 && error && <div className="cs-alert" role="alert">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
};

/* ---------------------------- RENDERER ---------------------------- */
const BLOCKS: Record<Section['type'], (p: { s: Section; c: Ctx }) => JSX.Element | null> = {
  hero: Hero, services: Services, about: About, team: Team, testimonials: Testimonials,
  faq: Faq, booking: Booking, location: Location, cta: Cta,
};

export interface SiteRendererProps {
  site: PublicSiteData;
  mode?: Mode;
  className?: string;
  style?: CSSProperties;
}

export const SiteRenderer = ({ site, mode = 'live', className, style }: SiteRendererProps) => {
  const theme = resolveTheme(site.theme_key, site.theme_overrides);
  useSiteFonts([theme.fonts.display, theme.fonts.body]);
  const locale = site.content?.locale === 'en' ? 'en' : 'es';
  const L = SITE_LABELS[locale];
  const money = useMemo(() => {
    const f = new Intl.NumberFormat(locale === 'es' ? 'es-MX' : 'en-US', { style: 'currency', currency: site.clinic.currency || 'MXN', maximumFractionDigits: 0 });
    return (n: number | null) => (n == null ? '' : f.format(n));
  }, [locale, site.clinic.currency]);
  const c: Ctx = { site, theme, L, locale, mode, money };
  const sections = (site.content?.sections ?? []).filter((s) => s.enabled);
  const hasTeam = sections.some((s) => s.type === 'team') && site.therapists.length > 0;

  return (
    <div
      className={`cs-root ${className ?? ''}`}
      style={{ ...themeStyle(theme), ...style }}
      data-btn={theme.button}
      data-mask={theme.mask}
      data-texture={theme.texture}
      data-dark={theme.dark ? 'true' : 'false'}
      data-italic={theme.heading.italic ? 'true' : 'false'}
      lang={locale}
    >
      <div className="cs-wrap">
        <nav className="cs-nav">
          <a className="cs-brand" href="#top">
            {site.clinic.logo_url && <img src={site.clinic.logo_url} alt="" />}
            <span>{site.clinic.name}</span>
          </a>
          <div className="cs-navlinks">
            {sections.some((s) => s.type === 'services') && <a href="#servicios">{locale === 'es' ? 'Servicios' : 'Services'}</a>}
            {hasTeam && <a href="#equipo">{locale === 'es' ? 'Equipo' : 'Team'}</a>}
            {sections.some((s) => s.type === 'location') && <a href="#ubicacion">{locale === 'es' ? 'Ubicación' : 'Location'}</a>}
            <a className="cs-btn solid" href="#reservar" style={{ padding: '11px 18px', fontSize: 14 }}>{L.book}</a>
          </div>
        </nav>
      </div>
      <main id="top">
        {sections.map((s) => {
          const Block = BLOCKS[s.type];
          const anchor = { services: 'servicios', team: 'equipo', location: 'ubicacion', booking: 'reservar' }[s.type as string];
          const variant = s.variant || (theme.variants as Record<string, string>)[s.type];
          if (s.type === 'cta' && variant === 'band')
            return (
              <section key={s.id} className="cs-cta-band" id={anchor}>
                <div className="cs-wrap inner">
                  <div>
                    <h2 className="cs-h cs-h2"><Accent text={s.data.title} /></h2>
                    {s.data.subtitle && <p className="cs-lead">{s.data.subtitle}</p>}
                  </div>
                  <a className="cs-btn" href="#reservar">{s.data.ctaLabel || L.book} →</a>
                </div>
              </section>
            );
          if (s.type === 'team' && !hasTeam) return null;
          return (
            <section key={s.id} className="cs-section" id={anchor} style={s.type === 'hero' ? { paddingTop: 'clamp(16px, 3cqi, 40px)', borderTop: 0 } : undefined}>
              <div className="cs-wrap"><Block s={s} c={c} /></div>
            </section>
          );
        })}
      </main>
      <div className="cs-wrap">
        <footer className="cs-footer">
          <span>© {new Date().getFullYear()} {site.clinic.name}</span>
          {site.content?.footerNote && <span>{site.content.footerNote}</span>}
          <span style={{ display: 'flex', gap: 16 }}>
            {site.content?.social?.instagram && <a href={site.content.social.instagram} target="_blank" rel="noreferrer">Instagram</a>}
            {site.content?.social?.facebook && <a href={site.content.social.facebook} target="_blank" rel="noreferrer">Facebook</a>}
            {site.content?.social?.whatsapp && <a href={`https://wa.me/${site.content.social.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>}
          </span>
          <a href="/" style={{ opacity: 0.7 }}>{L.poweredBy}</a>
        </footer>
      </div>
    </div>
  );
};

export default SiteRenderer;
