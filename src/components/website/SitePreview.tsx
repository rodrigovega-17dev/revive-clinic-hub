import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SiteRenderer from '@/site/SiteRenderer';
import type { PublicSiteData } from '@/site/types';

const WIDTHS = { desktop: 1280, mobile: 390 } as const;

/** Live preview of the draft, rendered in-page and scaled to fit (no iframe needed). */
export const SitePreview = ({ site }: { site: PublicSiteData }) => {
  const { t } = useTranslation();
  const [device, setDevice] = useState<keyof typeof WIDTHS>('desktop');
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [height, setHeight] = useState(800);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const s = Math.min(1, o.clientWidth / WIDTHS[device]);
      setScale(s);
      setHeight(i.scrollHeight * s);
    };
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    update();
    return () => ro.disconnect();
  }, [device]);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('website.preview.title')}</span>
        <div className="flex gap-1">
          <Button size="sm" variant={device === 'desktop' ? 'secondary' : 'ghost'} onClick={() => setDevice('desktop')} aria-label={t('website.preview.desktop')}>
            <Monitor className="h-4 w-4" />
          </Button>
          <Button size="sm" variant={device === 'mobile' ? 'secondary' : 'ghost'} onClick={() => setDevice('mobile')} aria-label={t('website.preview.mobile')}>
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={outer} className="rounded-lg border bg-muted/30 overflow-y-auto overflow-x-hidden max-h-[78vh]">
        <div style={{ height, overflow: 'hidden', width: device === 'mobile' ? Math.min(WIDTHS.mobile * scale, WIDTHS.mobile) : undefined, margin: device === 'mobile' ? '0 auto' : undefined }}>
          <div ref={inner} style={{ width: WIDTHS[device], transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <SiteRenderer site={site} mode="preview" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitePreview;
