// Shared types for clinic public websites (renderer, editor and public page).

export type SectionType =
  | 'hero'
  | 'services'
  | 'about'
  | 'team'
  | 'testimonials'
  | 'faq'
  | 'booking'
  | 'location'
  | 'cta';

export const SECTION_TYPES: SectionType[] = [
  'hero', 'services', 'about', 'team', 'testimonials', 'faq', 'booking', 'location', 'cta',
];

/** Structural variants per block. Each one is a different component layout, not a CSS tweak. */
export const BLOCK_VARIANTS = {
  hero: ['split', 'editorial', 'centered', 'fullbleed', 'stacked'],
  services: ['list', 'cards', 'table', 'bento'],
  about: ['split', 'statement'],
  team: ['grid', 'list'],
  testimonials: ['cards', 'single'],
  faq: ['accordion', 'columns'],
  booking: ['panel'],
  location: ['split', 'band'],
  cta: ['band', 'card'],
} as const satisfies Record<SectionType, readonly string[]>;

export type BlockVariants = { [K in SectionType]: (typeof BLOCK_VARIANTS)[K][number] };

export interface Testimonial { quote: string; author: string }
export interface FaqItem { q: string; a: string }

export interface SectionData {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  /** Overrides the theme's image mask for this section's images. */
  imageShape?: ImageMask;
  ctaLabel?: string;
  items?: Testimonial[] | FaqItem[];
}

export interface Section {
  id: string;
  type: SectionType;
  enabled: boolean;
  /** Overrides the theme's default variant for this block. */
  variant?: string;
  data: SectionData;
}

export interface SiteContent {
  sections: Section[];
  seo?: { title?: string; description?: string };
  social?: { instagram?: string; facebook?: string; whatsapp?: string };
  locale?: 'es' | 'en';
  footerNote?: string;
}

export type ButtonStyle = 'pill' | 'square' | 'soft' | 'underline' | 'brutal';
export type ImageMask = 'none' | 'arch' | 'blob' | 'circle' | 'rounded' | 'square' | 'full';
export const IMAGE_SHAPES: ImageMask[] = ['circle', 'blob', 'square', 'full', 'rounded', 'arch', 'none'];
export type Texture = 'none' | 'grain' | 'grid' | 'glow' | 'dots';

export interface ThemeColors {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  line: string;
}

export interface SiteTheme {
  key: string;
  name: string;
  description: string;
  tags: string[];
  dark?: boolean;
  colors: ThemeColors;
  fonts: { display: string; body: string };
  radius: number;
  button: ButtonStyle;
  heading: { weight: number; tracking: number; upper?: boolean; italic?: boolean; scale: number; width?: number };
  variants: BlockVariants;
  mask: ImageMask;
  texture: Texture;
}

/** What a clinic may customize on top of a theme. */
export interface ThemeOverrides {
  colors?: Partial<ThemeColors>;
  fonts?: Partial<SiteTheme['fonts']>;
  radius?: number;
  button?: ButtonStyle;
  mask?: ImageMask;
  texture?: Texture;
  variants?: Partial<BlockVariants>;
}

export interface PublicTreatment {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price: number | null;
  bookable: boolean;
}

export interface PublicTherapist {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialties: string[] | null;
  bio: string | null;
  photo_url: string | null;
}

export interface PublicSiteData {
  slug: string;
  theme_key: string;
  theme_overrides: ThemeOverrides;
  content: SiteContent;
  published_at?: string | null;
  booking: { enabled: boolean; horizon_days: number };
  clinic: {
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    timezone: string;
    currency: string;
  };
  treatments: PublicTreatment[];
  therapists: PublicTherapist[];
  hours: { weekday: number; start: string; end: string }[];
}
