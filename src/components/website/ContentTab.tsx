import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ChevronDown, ImagePlus, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { uploadSiteImage } from '@/hooks/useWebsite';
import { cn } from '@/lib/utils';
import { newSection } from '@/site/defaults';
import { BLOCK_VARIANTS, SECTION_TYPES, type FaqItem, type Section, type SectionType, type SiteContent, type Testimonial } from '@/site/types';

interface Props {
  content: SiteContent;
  onChange: (c: SiteContent) => void;
}

const FIELDS: Record<SectionType, ('eyebrow' | 'title' | 'subtitle' | 'body' | 'ctaLabel' | 'imageUrl' | 'items')[]> = {
  hero: ['eyebrow', 'title', 'subtitle', 'ctaLabel', 'imageUrl'],
  services: ['eyebrow', 'title', 'subtitle'],
  about: ['eyebrow', 'title', 'body', 'imageUrl'],
  team: ['eyebrow', 'title', 'subtitle'],
  testimonials: ['eyebrow', 'title', 'items'],
  faq: ['eyebrow', 'title', 'items'],
  booking: ['eyebrow', 'title', 'subtitle'],
  location: ['eyebrow', 'title'],
  cta: ['title', 'subtitle', 'ctaLabel'],
};

export const ContentTab = ({ content, onChange }: Props) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [open, setOpen] = useState<string | null>(content.sections[0]?.id ?? null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [addType, setAddType] = useState<SectionType>('about');
  const locale = content.locale ?? 'es';

  const sections = content.sections;
  const setSections = (next: Section[]) => onChange({ ...content, sections: next });
  const update = (id: string, patch: Partial<Section>) => setSections(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const updateData = (s: Section, patch: Partial<Section['data']>) => update(s.id, { data: { ...s.data, ...patch } });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
  };

  const upload = async (s: Section, file?: File) => {
    if (!file || !clinicId) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: t('website.content.imageTooBig'), variant: 'destructive' }); return; }
    setUploading(s.id);
    try {
      const url = await uploadSiteImage(clinicId, file);
      updateData(s, { imageUrl: url });
    } catch (e) {
      toast({ title: t('website.content.uploadError'), description: String((e as Error).message), variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const itemsEditor = (s: Section) => {
    if (s.type === 'testimonials') {
      const items = (s.data.items ?? []) as Testimonial[];
      const setItems = (next: Testimonial[]) => updateData(s, { items: next });
      return (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="grid gap-2 rounded-md border p-3">
              <Textarea id={`${s.id}-q-${i}`} rows={2} value={it.quote} placeholder={t('website.content.quote')} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, quote: e.target.value } : x)))} />
              <div className="flex gap-2">
                <Input id={`${s.id}-a-${i}`} value={it.author} placeholder={t('website.content.author')} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, author: e.target.value } : x)))} />
                <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setItems([...items, { quote: '', author: '' }])}><Plus className="h-4 w-4 mr-1" />{t('website.content.addTestimonial')}</Button>
        </div>
      );
    }
    const items = (s.data.items ?? []) as FaqItem[];
    const setItems = (next: FaqItem[]) => updateData(s, { items: next });
    return (
      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3">
            <div className="flex gap-2">
              <Input id={`${s.id}-fq-${i}`} value={it.q} placeholder={t('website.content.question')} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
              <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea id={`${s.id}-fa-${i}`} rows={2} value={it.a} placeholder={t('website.content.answer')} onChange={(e) => setItems(items.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setItems([...items, { q: '', a: '' }])}><Plus className="h-4 w-4 mr-1" />{t('website.content.addQuestion')}</Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t('website.content.help')}</p>
      <div className="space-y-2">
        {sections.map((s, i) => {
          const isOpen = open === s.id;
          const variants = BLOCK_VARIANTS[s.type] as readonly string[];
          return (
            <div key={s.id} className={cn('rounded-md border', !s.enabled && 'opacity-60')}>
              <div className="flex items-center gap-2 p-2 pl-3">
                <button type="button" className="flex-1 min-w-0 flex items-center gap-2 text-left" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                  <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform', !isOpen && '-rotate-90')} />
                  <span className="font-medium">{t(`website.sections.${s.type}`)}</span>
                  <span className="truncate text-sm text-muted-foreground">{s.data.title}</span>
                </button>
                <Switch checked={s.enabled} onCheckedChange={(v) => update(s.id, { enabled: v })} aria-label={t('website.content.visible')} />
                <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('website.content.moveUp')}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => move(i, 1)} disabled={i === sections.length - 1} aria-label={t('website.content.moveDown')}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setSections(sections.filter((x) => x.id !== s.id))} aria-label={t('common.delete')}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {isOpen && (
                <div className="border-t p-3 grid gap-3">
                  {variants.length > 1 && (
                    <div className="space-y-1">
                      <Label>{t('website.content.layout')}</Label>
                      <Select value={s.variant ?? '__theme'} onValueChange={(v) => update(s.id, { variant: v === '__theme' ? undefined : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__theme">{t('website.content.themeLayout')}</SelectItem>
                          {variants.map((v) => <SelectItem key={v} value={v}>{t(`website.variants.${v}`)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {FIELDS[s.type].map((f) => {
                    if (f === 'items') return <div key={f}>{itemsEditor(s)}</div>;
                    if (f === 'imageUrl')
                      return (
                        <div key={f} className="space-y-1">
                          <Label>{t('website.content.image')}</Label>
                          <div className="flex items-center gap-2">
                            {s.data.imageUrl && <img src={s.data.imageUrl} alt="" className="h-12 w-16 object-cover rounded" />}
                            <label className="inline-flex items-center gap-1 text-sm cursor-pointer rounded-md border px-3 py-2 hover:bg-accent">
                              {uploading === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                              {t('website.content.upload')}
                              <input id={`${s.id}-img`} type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={(e) => upload(s, e.target.files?.[0])} />
                            </label>
                            {s.data.imageUrl && <Button size="sm" variant="ghost" onClick={() => updateData(s, { imageUrl: undefined })}>{t('website.content.removeImage')}</Button>}
                          </div>
                          <p className="text-xs text-muted-foreground">{t('website.content.imageHelp')}</p>
                        </div>
                      );
                    const multiline = f === 'subtitle' || f === 'body';
                    return (
                      <div key={f} className="space-y-1">
                        <Label htmlFor={`${s.id}-${f}`}>{t(`website.content.fields.${f}`)}</Label>
                        {multiline ? (
                          <Textarea id={`${s.id}-${f}`} rows={f === 'body' ? 6 : 3} value={(s.data[f] as string) ?? ''} onChange={(e) => updateData(s, { [f]: e.target.value })} />
                        ) : (
                          <Input id={`${s.id}-${f}`} value={(s.data[f] as string) ?? ''} onChange={(e) => updateData(s, { [f]: e.target.value })} />
                        )}
                        {f === 'title' && <p className="text-xs text-muted-foreground">{t('website.content.accentHelp')}</p>}
                      </div>
                    );
                  })}
                  {(s.type === 'services' || s.type === 'team') && <p className="text-xs text-muted-foreground">{t('website.content.catalogHint')}</p>}
                  {s.type === 'location' && <p className="text-xs text-muted-foreground">{t('website.content.locationHint')}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Select value={addType} onValueChange={(v) => setAddType(v as SectionType)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>{SECTION_TYPES.map((x) => <SelectItem key={x} value={x}>{t(`website.sections.${x}`)}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={() => { const s = newSection(addType, locale); setSections([...sections, s]); setOpen(s.id); }}>
          <Plus className="h-4 w-4 mr-1" />{t('website.content.addSection')}
        </Button>
      </div>

      <div className="space-y-3 border-t pt-6">
        <h3 className="font-semibold">{t('website.content.seoTitle')}</h3>
        <div className="space-y-1">
          <Label htmlFor="seo-title">{t('website.content.metaTitle')}</Label>
          <Input id="seo-title" maxLength={70} value={content.seo?.title ?? ''} onChange={(e) => onChange({ ...content, seo: { ...content.seo, title: e.target.value } })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="seo-desc">{t('website.content.metaDescription')}</Label>
          <Textarea id="seo-desc" rows={2} maxLength={170} value={content.seo?.description ?? ''} onChange={(e) => onChange({ ...content, seo: { ...content.seo, description: e.target.value } })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['instagram', 'facebook', 'whatsapp'] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`social-${k}`} className="capitalize">{k}</Label>
              <Input id={`social-${k}`} value={content.social?.[k] ?? ''} placeholder={k === 'whatsapp' ? '+52 33 1234 5678' : 'https://'} onChange={(e) => onChange({ ...content, social: { ...content.social, [k]: e.target.value } })} />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>{t('website.content.language')}</Label>
            <Select value={locale} onValueChange={(v) => onChange({ ...content, locale: v as 'es' | 'en' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="es">Español</SelectItem><SelectItem value="en">English</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="footer-note">{t('website.content.footerNote')}</Label>
            <Input id="footer-note" value={content.footerNote ?? ''} onChange={(e) => onChange({ ...content, footerNote: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentTab;
