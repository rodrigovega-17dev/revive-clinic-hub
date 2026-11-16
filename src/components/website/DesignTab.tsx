import { useTranslation } from 'react-i18next';
import { Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { SITE_FONTS, fontStack } from '@/site/fonts';
import { useSiteFonts } from '@/site/SiteRenderer';
import { SITE_THEMES, contrastRatio, resolveTheme } from '@/site/themes';
import { BLOCK_VARIANTS, type ButtonStyle, type ImageMask, type SectionType, type Texture, type ThemeColors, type ThemeOverrides } from '@/site/types';

interface Props {
  themeKey: string;
  overrides: ThemeOverrides;
  onChange: (themeKey: string, overrides: ThemeOverrides) => void;
}

const COLOR_KEYS: (keyof ThemeColors)[] = ['bg', 'surface', 'ink', 'muted', 'accent', 'accentInk', 'line'];
const BUTTONS: ButtonStyle[] = ['pill', 'soft', 'square', 'underline', 'brutal'];
const MASKS: ImageMask[] = ['none', 'rounded', 'arch', 'circle', 'blob'];
const TEXTURES: Texture[] = ['none', 'grain', 'grid', 'dots', 'glow'];
const VARIANT_BLOCKS = Object.keys(BLOCK_VARIANTS).filter((k) => BLOCK_VARIANTS[k as SectionType].length > 1) as SectionType[];

export const DesignTab = ({ themeKey, overrides, onChange }: Props) => {
  const { t } = useTranslation();
  // Load every theme's display face so the gallery cards show real type.
  useSiteFonts(Array.from(new Set(SITE_THEMES.flatMap((th) => [th.fonts.display]))));
  const theme = resolveTheme(themeKey, overrides);
  const set = (patch: ThemeOverrides) => onChange(themeKey, { ...overrides, ...patch });
  const textContrast = contrastRatio(theme.colors.ink, theme.colors.bg);
  const buttonContrast = contrastRatio(theme.colors.accentInk, theme.colors.accent);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold">{t('website.design.themes')} <span className="text-muted-foreground font-normal">({SITE_THEMES.length})</span></h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SITE_THEMES.map((th) => {
            const active = th.key === themeKey;
            return (
              <button
                key={th.key}
                type="button"
                onClick={() => onChange(th.key, {})}
                className={cn('relative text-left rounded-md overflow-hidden border transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active && 'ring-2 ring-primary')}
                style={{ background: th.colors.bg, color: th.colors.ink, borderColor: th.colors.line }}
                aria-pressed={active}
              >
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: fontStack(th.fonts.display), fontWeight: th.heading.weight, fontSize: 22, letterSpacing: `${th.heading.tracking}em`, textTransform: th.heading.upper ? 'uppercase' : 'none', fontStyle: th.heading.italic ? 'italic' : 'normal', lineHeight: 1.1 }}>
                      {th.name}
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: th.colors.muted }}>{th.description}</p>
                  <div className="flex gap-1 pt-1">
                    {[th.colors.accent, th.colors.ink, th.colors.surface, th.colors.line].map((c, i) => (
                      <span key={i} className="h-3 w-6" style={{ background: c, borderRadius: th.radius > 12 ? 999 : th.radius > 0 ? 3 : 0, outline: `1px solid ${th.colors.line}` }} />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('website.design.customize')}</h3>
          <Button size="sm" variant="ghost" onClick={() => onChange(themeKey, {})} disabled={Object.keys(overrides).length === 0}>
            <RotateCcw className="h-4 w-4 mr-1" />{t('website.design.reset')}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {COLOR_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input
                id={`color-${k}`}
                type="color"
                value={theme.colors[k]}
                onChange={(e) => set({ colors: { ...(overrides.colors ?? {}), [k]: e.target.value } })}
                className="h-8 w-10 rounded border bg-transparent p-0.5 cursor-pointer"
              />
              <span>{t(`website.design.colors.${k}`)}</span>
            </label>
          ))}
        </div>
        {(textContrast < 4.5 || buttonContrast < 3) && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            {t('website.design.lowContrast', { text: textContrast.toFixed(1), button: buttonContrast.toFixed(1) })}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('website.design.displayFont')}</Label>
            <Select value={theme.fonts.display} onValueChange={(v) => set({ fonts: { ...(overrides.fonts ?? {}), display: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SITE_FONTS.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('website.design.bodyFont')}</Label>
            <Select value={theme.fonts.body} onValueChange={(v) => set({ fonts: { ...(overrides.fonts ?? {}), body: v } })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SITE_FONTS.filter((f) => f.kind !== 'display').map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('website.design.button')}</Label>
            <Select value={theme.button} onValueChange={(v) => set({ button: v as ButtonStyle })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BUTTONS.map((b) => <SelectItem key={b} value={b}>{t(`website.design.buttons.${b}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('website.design.mask')}</Label>
            <Select value={theme.mask} onValueChange={(v) => set({ mask: v as ImageMask })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MASKS.map((m) => <SelectItem key={m} value={m}>{t(`website.design.masks.${m}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t('website.design.texture')}</Label>
            <Select value={theme.texture} onValueChange={(v) => set({ texture: v as Texture })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TEXTURES.map((x) => <SelectItem key={x} value={x}>{t(`website.design.textures.${x}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('website.design.radius')}: {theme.radius}px</Label>
            <Slider min={0} max={32} step={2} value={[theme.radius]} onValueChange={([r]) => set({ radius: r })} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">{t('website.design.layouts')}</h3>
        <p className="text-sm text-muted-foreground">{t('website.design.layoutsHelp')}</p>
        <div className="grid grid-cols-2 gap-3">
          {VARIANT_BLOCKS.map((b) => (
            <div key={b} className="space-y-1">
              <Label>{t(`website.sections.${b}`)}</Label>
              <Select
                value={(theme.variants as Record<string, string>)[b]}
                onValueChange={(v) => set({ variants: { ...(overrides.variants ?? {}), [b]: v } })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BLOCK_VARIANTS[b].map((v) => <SelectItem key={v} value={v}>{t(`website.variants.${v}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DesignTab;
