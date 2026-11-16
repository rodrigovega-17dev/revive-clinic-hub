// Curated font catalog for clinic sites. All families are on Google Fonts (SIL Open Font License).

export interface SiteFont {
  key: string;
  label: string;
  family: string; // CSS family name
  query: string; // Google Fonts css2 "family=" value
  fallback: string;
  kind: 'serif' | 'sans' | 'display' | 'mono';
}

const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

export const SITE_FONTS: SiteFont[] = [
  { key: 'instrument-serif', label: 'Instrument Serif', family: 'Instrument Serif', query: 'Instrument+Serif:ital@0;1', fallback: SERIF, kind: 'serif' },
  { key: 'instrument-sans', label: 'Instrument Sans', family: 'Instrument Sans', query: 'Instrument+Sans:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'archivo', label: 'Archivo', family: 'Archivo', query: 'Archivo:wdth,wght@62..125,400..900', fallback: SANS, kind: 'sans' },
  { key: 'bricolage', label: 'Bricolage Grotesque', family: 'Bricolage Grotesque', query: 'Bricolage+Grotesque:opsz,wght@12..96,400..800', fallback: SANS, kind: 'display' },
  { key: 'figtree', label: 'Figtree', family: 'Figtree', query: 'Figtree:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'syne', label: 'Syne', family: 'Syne', query: 'Syne:wght@500;600;700;800', fallback: SANS, kind: 'display' },
  { key: 'plex-sans', label: 'IBM Plex Sans', family: 'IBM Plex Sans', query: 'IBM+Plex+Sans:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'plex-mono', label: 'IBM Plex Mono', family: 'IBM Plex Mono', query: 'IBM+Plex+Mono:wght@400;500;600', fallback: 'ui-monospace, Menlo, monospace', kind: 'mono' },
  { key: 'fraunces', label: 'Fraunces', family: 'Fraunces', query: 'Fraunces:opsz,wght@9..144,400..800', fallback: SERIF, kind: 'serif' },
  { key: 'dm-sans', label: 'DM Sans', family: 'DM Sans', query: 'DM+Sans:opsz,wght@9..40,400..700', fallback: SANS, kind: 'sans' },
  { key: 'dm-serif', label: 'DM Serif Display', family: 'DM Serif Display', query: 'DM+Serif+Display:ital@0;1', fallback: SERIF, kind: 'serif' },
  { key: 'manrope', label: 'Manrope', family: 'Manrope', query: 'Manrope:wght@400;500;600;700;800', fallback: SANS, kind: 'sans' },
  { key: 'sora', label: 'Sora', family: 'Sora', query: 'Sora:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'inter', label: 'Inter', family: 'Inter', query: 'Inter:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'jakarta', label: 'Plus Jakarta Sans', family: 'Plus Jakarta Sans', query: 'Plus+Jakarta+Sans:wght@400;500;600;700;800', fallback: SANS, kind: 'sans' },
  { key: 'space-grotesk', label: 'Space Grotesk', family: 'Space Grotesk', query: 'Space+Grotesk:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'young-serif', label: 'Young Serif', family: 'Young Serif', query: 'Young+Serif', fallback: SERIF, kind: 'serif' },
  { key: 'nunito', label: 'Nunito', family: 'Nunito', query: 'Nunito:wght@400;600;700;800', fallback: SANS, kind: 'sans' },
  { key: 'unbounded', label: 'Unbounded', family: 'Unbounded', query: 'Unbounded:wght@500;600;700;800', fallback: SANS, kind: 'display' },
  { key: 'work-sans', label: 'Work Sans', family: 'Work Sans', query: 'Work+Sans:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'cormorant', label: 'Cormorant Garamond', family: 'Cormorant Garamond', query: 'Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500', fallback: SERIF, kind: 'serif' },
  { key: 'albert-sans', label: 'Albert Sans', family: 'Albert Sans', query: 'Albert+Sans:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'epilogue', label: 'Epilogue', family: 'Epilogue', query: 'Epilogue:wght@400;500;600;700;800;900', fallback: SANS, kind: 'sans' },
  { key: 'outfit', label: 'Outfit', family: 'Outfit', query: 'Outfit:wght@300;400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'bodoni', label: 'Bodoni Moda', family: 'Bodoni Moda', query: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900', fallback: SERIF, kind: 'serif' },
  { key: 'libre-franklin', label: 'Libre Franklin', family: 'Libre Franklin', query: 'Libre+Franklin:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'fredoka', label: 'Fredoka', family: 'Fredoka', query: 'Fredoka:wght@400;500;600;700', fallback: SANS, kind: 'display' },
  { key: 'red-hat-display', label: 'Red Hat Display', family: 'Red Hat Display', query: 'Red+Hat+Display:wght@300;400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'red-hat-text', label: 'Red Hat Text', family: 'Red Hat Text', query: 'Red+Hat+Text:wght@400;500;600', fallback: SANS, kind: 'sans' },
  { key: 'familjen', label: 'Familjen Grotesk', family: 'Familjen Grotesk', query: 'Familjen+Grotesk:wght@400;500;600;700', fallback: SANS, kind: 'sans' },
  { key: 'lora', label: 'Lora', family: 'Lora', query: 'Lora:ital,wght@0,400..700;1,400..700', fallback: SERIF, kind: 'serif' },
];

const BY_KEY = new Map(SITE_FONTS.map((f) => [f.key, f]));

export const getFont = (key: string): SiteFont => BY_KEY.get(key) ?? BY_KEY.get('inter')!;

export const fontStack = (key: string) => {
  const f = getFont(key);
  return `"${f.family}", ${f.fallback}`;
};

/** Google Fonts stylesheet URL for a set of font keys. */
export const googleFontsHref = (keys: string[]) => {
  const unique = Array.from(new Set(keys)).map(getFont);
  const families = unique.map((f) => `family=${f.query}`).join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};
