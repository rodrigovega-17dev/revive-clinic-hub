// 20 curated themes. Each one fixes a point on six axes — color tokens, type pairing,
// structural variant per block, ornament (mask/texture/button), heading treatment and rhythm —
// so sites differ in structure and personality, not only in color.
// All themes are original to Cliniker (no third-party template code); fonts are OFL from Google Fonts.

import type { SiteTheme, ThemeOverrides, BlockVariants } from './types';

const v = (x: Partial<BlockVariants>): BlockVariants => ({
  hero: 'split', services: 'cards', about: 'split', team: 'grid', testimonials: 'cards',
  faq: 'accordion', booking: 'panel', location: 'split', cta: 'band', ...x,
});

export const SITE_THEMES: SiteTheme[] = [
  {
    key: 'atelier', name: 'Atelier', description: 'Editorial y sereno, con serif expresiva e imágenes en arco.',
    tags: ['editorial', 'psicología', 'estética'],
    colors: { bg: '#E8ECE7', surface: '#F2F4F0', ink: '#1C2A23', muted: '#53625A', accent: '#7B2C3B', accentInk: '#FFFFFF', line: '#B9C4BC' },
    fonts: { display: 'instrument-serif', body: 'instrument-sans' }, radius: 0, button: 'underline',
    heading: { weight: 400, tracking: -0.02, italic: false, scale: 1.15 },
    variants: v({ hero: 'editorial', services: 'list', team: 'list', testimonials: 'single', about: 'statement', faq: 'columns', cta: 'card' }),
    mask: 'arch', texture: 'none',
  },
  {
    key: 'pulso', name: 'Pulso', description: 'Suizo y deportivo: tipografía condensada gigante, retícula visible y tablas.',
    tags: ['deportivo', 'fisioterapia', 'ortopedia'],
    colors: { bg: '#FFFFFF', surface: '#F3F3F4', ink: '#0B0B0C', muted: '#5F5F66', accent: '#1D3BFF', accentInk: '#FFFFFF', line: '#0B0B0C' },
    fonts: { display: 'archivo', body: 'archivo' }, radius: 0, button: 'square',
    heading: { weight: 900, tracking: -0.01, upper: true, scale: 1.35, width: 62 },
    variants: v({ hero: 'stacked', services: 'table', team: 'list', testimonials: 'single', faq: 'columns', location: 'band' }),
    mask: 'none', texture: 'grid',
  },
  {
    key: 'calma', name: 'Calma', description: 'Orgánico y suave: formas blob, tarjetas redondeadas y bento.',
    tags: ['terapia', 'prenatal', 'bienestar'],
    colors: { bg: '#DDE8EC', surface: '#F3F7F8', ink: '#163A41', muted: '#4C6B71', accent: '#1F5C66', accentInk: '#FFFFFF', line: '#BFD2D7' },
    fonts: { display: 'bricolage', body: 'figtree' }, radius: 28, button: 'pill',
    heading: { weight: 700, tracking: -0.035, scale: 1.1 },
    variants: v({ hero: 'split', services: 'bento', team: 'grid', testimonials: 'cards', cta: 'card' }),
    mask: 'blob', texture: 'none',
  },
  {
    key: 'lumen', name: 'Lumen', description: 'Oscuro premium con brillo nacarado y etiquetas monoespaciadas.',
    tags: ['dermatología', 'estética', 'longevidad'], dark: true,
    colors: { bg: '#0F0D15', surface: '#1A1722', ink: '#EEEAF4', muted: '#958DA8', accent: '#B9A4FF', accentInk: '#0F0D15', line: '#2C2838' },
    fonts: { display: 'syne', body: 'plex-sans' }, radius: 16, button: 'pill',
    heading: { weight: 800, tracking: -0.03, scale: 1.15 },
    variants: v({ hero: 'centered', services: 'bento', team: 'grid', testimonials: 'single', about: 'statement' }),
    mask: 'rounded', texture: 'glow',
  },
  {
    key: 'nordico', name: 'Nórdico', description: 'Minimal escandinavo: blanco, gris azulado y mucho aire.',
    tags: ['minimal', 'general', 'odontología'],
    colors: { bg: '#FAFBFC', surface: '#EEF1F4', ink: '#1E2933', muted: '#64707D', accent: '#3E6A8A', accentInk: '#FFFFFF', line: '#D9DFE5' },
    fonts: { display: 'manrope', body: 'manrope' }, radius: 6, button: 'soft',
    heading: { weight: 700, tracking: -0.03, scale: 1 },
    variants: v({ hero: 'split', services: 'cards', team: 'grid' }),
    mask: 'rounded', texture: 'none',
  },
  {
    key: 'botanico', name: 'Botánico', description: 'Verde olivo, grano de papel y serif suave con imagen a sangre.',
    tags: ['naturista', 'nutrición', 'herbolaria'],
    colors: { bg: '#EFEDE4', surface: '#E3E2D4', ink: '#27311F', muted: '#5E6852', accent: '#4F6B2E', accentInk: '#FFFFFF', line: '#C9C8B6' },
    fonts: { display: 'fraunces', body: 'dm-sans' }, radius: 12, button: 'pill',
    heading: { weight: 500, tracking: -0.02, scale: 1.1 },
    variants: v({ hero: 'fullbleed', services: 'list', about: 'split', testimonials: 'single' }),
    mask: 'arch', texture: 'grain',
  },
  {
    key: 'marea', name: 'Marea', description: 'Azules oceánicos, puntos y composición centrada amable.',
    tags: ['hidroterapia', 'rehabilitación', 'familiar'],
    colors: { bg: '#F2F8FB', surface: '#FFFFFF', ink: '#0D2F44', muted: '#4F6B7D', accent: '#0A7FB5', accentInk: '#FFFFFF', line: '#CFE3EE' },
    fonts: { display: 'sora', body: 'inter' }, radius: 20, button: 'pill',
    heading: { weight: 700, tracking: -0.03, scale: 1.05 },
    variants: v({ hero: 'centered', services: 'cards', testimonials: 'cards', location: 'band' }),
    mask: 'circle', texture: 'dots',
  },
  {
    key: 'clinico', name: 'Clínico', description: 'Confiable y claro: azul médico, tarjetas limpias y datos visibles.',
    tags: ['medicina general', 'especialidades', 'laboratorio'],
    colors: { bg: '#FFFFFF', surface: '#F1F5FB', ink: '#0F1E36', muted: '#55657E', accent: '#2563EB', accentInk: '#FFFFFF', line: '#DCE4F0' },
    fonts: { display: 'jakarta', body: 'jakarta' }, radius: 10, button: 'soft',
    heading: { weight: 800, tracking: -0.025, scale: 1 },
    variants: v({ hero: 'split', services: 'cards', team: 'grid', faq: 'accordion' }),
    mask: 'rounded', texture: 'none',
  },
  {
    key: 'grafito', name: 'Grafito', description: 'Oscuro monocromo con acento ámbar, retícula técnica y tablas.',
    tags: ['deportivo', 'quiropráctica', 'alto rendimiento'], dark: true,
    colors: { bg: '#121314', surface: '#1C1D1F', ink: '#ECECEA', muted: '#9A9A96', accent: '#F2A93B', accentInk: '#121314', line: '#2E3033' },
    fonts: { display: 'space-grotesk', body: 'inter' }, radius: 4, button: 'square',
    heading: { weight: 700, tracking: -0.03, upper: true, scale: 1.2 },
    variants: v({ hero: 'stacked', services: 'table', team: 'list', about: 'statement', location: 'band' }),
    mask: 'none', texture: 'grid',
  },
  {
    key: 'lavanda', name: 'Lavanda', description: 'Pastel lila, serif redonda y fotos circulares.',
    tags: ['psicología', 'terapia de pareja', 'mujer'],
    colors: { bg: '#F1EDF7', surface: '#FFFFFF', ink: '#2E2340', muted: '#6B5F80', accent: '#7A4FB8', accentInk: '#FFFFFF', line: '#DCD3EA' },
    fonts: { display: 'young-serif', body: 'nunito' }, radius: 24, button: 'pill',
    heading: { weight: 400, tracking: -0.015, scale: 1.05 },
    variants: v({ hero: 'split', services: 'bento', testimonials: 'cards', about: 'split', cta: 'card' }),
    mask: 'circle', texture: 'none',
  },
  {
    key: 'coral', name: 'Coral', description: 'Energético: coral y azul marino con display ancho.',
    tags: ['pediatría', 'fitness', 'nutrición'],
    colors: { bg: '#FFF6F2', surface: '#FFFFFF', ink: '#14213D', muted: '#56607A', accent: '#E8553E', accentInk: '#FFFFFF', line: '#F2D9CF' },
    fonts: { display: 'unbounded', body: 'work-sans' }, radius: 14, button: 'pill',
    heading: { weight: 700, tracking: -0.02, scale: 0.9 },
    variants: v({ hero: 'centered', services: 'cards', team: 'grid', testimonials: 'cards' }),
    mask: 'rounded', texture: 'dots',
  },
  {
    key: 'bosque', name: 'Bosque', description: 'Verde profundo nocturno con dorado y serif clásica.',
    tags: ['spa', 'medicina integrativa', 'premium'], dark: true,
    colors: { bg: '#0F1F19', surface: '#162A22', ink: '#EDE6D3', muted: '#A5A58F', accent: '#C8A55A', accentInk: '#0F1F19', line: '#2A4036' },
    fonts: { display: 'cormorant', body: 'albert-sans' }, radius: 0, button: 'underline',
    heading: { weight: 500, tracking: -0.01, italic: true, scale: 1.2 },
    variants: v({ hero: 'editorial', services: 'list', team: 'list', testimonials: 'single', about: 'statement', faq: 'columns' }),
    mask: 'arch', texture: 'grain',
  },
  {
    key: 'arena', name: 'Arena', description: 'Tonos desierto, tipografía grotesca pesada e imagen a sangre.',
    tags: ['masaje', 'osteopatía', 'yoga'],
    colors: { bg: '#F4ECE1', surface: '#EADFCF', ink: '#2B2118', muted: '#6E5E4C', accent: '#B5562A', accentInk: '#FFFFFF', line: '#D8C8B2' },
    fonts: { display: 'epilogue', body: 'epilogue' }, radius: 2, button: 'square',
    heading: { weight: 800, tracking: -0.04, scale: 1.1 },
    variants: v({ hero: 'fullbleed', services: 'table', about: 'split', team: 'grid', location: 'band' }),
    mask: 'none', texture: 'grain',
  },
  {
    key: 'aurora', name: 'Aurora', description: 'Luminoso con degradados suaves y tipografía geométrica ligera.',
    tags: ['estética', 'fertilidad', 'moderno'],
    colors: { bg: '#FBFAFF', surface: '#FFFFFF', ink: '#1B1638', muted: '#615B80', accent: '#6D5BFF', accentInk: '#FFFFFF', line: '#E6E2F7' },
    fonts: { display: 'outfit', body: 'outfit' }, radius: 22, button: 'pill',
    heading: { weight: 500, tracking: -0.035, scale: 1.1 },
    variants: v({ hero: 'centered', services: 'bento', testimonials: 'cards', cta: 'card' }),
    mask: 'rounded', texture: 'glow',
  },
  {
    key: 'brutal', name: 'Brutal', description: 'Neobrutalismo: amarillo, bordes negros gruesos y sombras desplazadas.',
    tags: ['joven', 'fitness', 'disruptivo'],
    colors: { bg: '#FFF4CC', surface: '#FFFFFF', ink: '#111111', muted: '#444444', accent: '#FF4F81', accentInk: '#111111', line: '#111111' },
    fonts: { display: 'space-grotesk', body: 'space-grotesk' }, radius: 8, button: 'brutal',
    heading: { weight: 700, tracking: -0.04, scale: 1.15 },
    variants: v({ hero: 'stacked', services: 'cards', team: 'grid', testimonials: 'cards', cta: 'band' }),
    mask: 'rounded', texture: 'none',
  },
  {
    key: 'revista', name: 'Revista', description: 'Magazine de moda: Bodoni de alto contraste y columnas.',
    tags: ['cirugía plástica', 'estética', 'editorial'],
    colors: { bg: '#FFFFFF', surface: '#F5F3F0', ink: '#111111', muted: '#5C5A57', accent: '#9E1B32', accentInk: '#FFFFFF', line: '#1A1A1A' },
    fonts: { display: 'bodoni', body: 'libre-franklin' }, radius: 0, button: 'underline',
    heading: { weight: 500, tracking: -0.025, italic: true, scale: 1.3 },
    variants: v({ hero: 'editorial', services: 'list', team: 'list', testimonials: 'single', about: 'statement', faq: 'columns', cta: 'card' }),
    mask: 'none', texture: 'none',
  },
  {
    key: 'ludico', name: 'Lúdico', description: 'Amigable para niños: colores primarios suaves y formas redondas.',
    tags: ['pediatría', 'terapia de lenguaje', 'familiar'],
    colors: { bg: '#F4FAFF', surface: '#FFFFFF', ink: '#1F2A44', muted: '#5A6782', accent: '#FF8A3D', accentInk: '#FFFFFF', line: '#D8E8F5' },
    fonts: { display: 'fredoka', body: 'nunito' }, radius: 28, button: 'pill',
    heading: { weight: 600, tracking: -0.01, scale: 1.05 },
    variants: v({ hero: 'split', services: 'cards', team: 'grid', testimonials: 'cards', cta: 'card' }),
    mask: 'blob', texture: 'dots',
  },
  {
    key: 'cobre', name: 'Cobre', description: 'Oscuro cálido marrón con cobre y serif display.',
    tags: ['dermatología', 'barbería médica', 'premium'], dark: true,
    colors: { bg: '#1A1411', surface: '#251C18', ink: '#F3E9E1', muted: '#B39F91', accent: '#D08A5C', accentInk: '#1A1411', line: '#3A2D26' },
    fonts: { display: 'dm-serif', body: 'dm-sans' }, radius: 10, button: 'pill',
    heading: { weight: 400, tracking: -0.015, scale: 1.15 },
    variants: v({ hero: 'fullbleed', services: 'cards', team: 'grid', testimonials: 'single' }),
    mask: 'rounded', texture: 'grain',
  },
  {
    key: 'zen', name: 'Zen', description: 'Silencio visual: gris piedra, peso ligero y mucho espacio.',
    tags: ['acupuntura', 'meditación', 'minimal'],
    colors: { bg: '#F2F1EE', surface: '#E8E6E1', ink: '#2A2926', muted: '#75726B', accent: '#5A6B5D', accentInk: '#FFFFFF', line: '#D3D0C8' },
    fonts: { display: 'red-hat-display', body: 'red-hat-text' }, radius: 0, button: 'underline',
    heading: { weight: 300, tracking: -0.02, scale: 1.1 },
    variants: v({ hero: 'centered', services: 'list', team: 'list', about: 'statement', testimonials: 'single', faq: 'columns' }),
    mask: 'circle', texture: 'none',
  },
  {
    key: 'precision', name: 'Precisión', description: 'Tech médico: azul eléctrico, retícula y datos en mono.',
    tags: ['diagnóstico', 'imagenología', 'tecnología'],
    colors: { bg: '#F7F9FC', surface: '#FFFFFF', ink: '#0B1630', muted: '#4D5B78', accent: '#0047FF', accentInk: '#FFFFFF', line: '#D5DDEB' },
    fonts: { display: 'familjen', body: 'plex-sans' }, radius: 6, button: 'square',
    heading: { weight: 700, tracking: -0.03, scale: 1.05 },
    variants: v({ hero: 'split', services: 'table', team: 'grid', location: 'band', faq: 'columns' }),
    mask: 'rounded', texture: 'grid',
  },
];

export const DEFAULT_THEME_KEY = 'atelier';

export const getTheme = (key: string | null | undefined): SiteTheme =>
  SITE_THEMES.find((t) => t.key === key) ?? SITE_THEMES[0];

/** Apply a clinic's customizations on top of a theme. */
export const resolveTheme = (key: string | null | undefined, overrides?: ThemeOverrides | null): SiteTheme => {
  const base = getTheme(key);
  const o = overrides ?? {};
  return {
    ...base,
    colors: { ...base.colors, ...(o.colors ?? {}) },
    fonts: { ...base.fonts, ...(o.fonts ?? {}) },
    radius: o.radius ?? base.radius,
    button: o.button ?? base.button,
    mask: o.mask ?? base.mask,
    texture: o.texture ?? base.texture,
    variants: { ...base.variants, ...(o.variants ?? {}) } as SiteTheme['variants'],
  };
};

/** WCAG relative-luminance contrast ratio between two hex colors. */
export const contrastRatio = (a: string, b: string) => {
  const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const [r, g, bl] = [0, 2, 4].map((i) => {
      const c = parseInt(full.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
