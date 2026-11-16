import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SiteRenderer from '@/site/SiteRenderer';
import { SITE_LABELS } from '@/site/defaults';
import type { PublicSiteData } from '@/site/types';
import { demoSite } from '@/site/demo';

const setMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
};

/** Public clinic website: /s/:slug */
const PublicSite = () => {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const isDemo = import.meta.env.DEV && slug === '__demo';
  const { data: remote, isLoading } = useQuery({
    enabled: !isDemo,
    queryKey: ['public-site', slug],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: PublicSiteData | null; error: unknown }>)(
        'get_public_site', { p_slug: slug },
      );
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
    retry: 1,
  });
  const demoTheme = params.get('theme') || 'atelier';
  const demo = useMemo(() => (isDemo ? demoSite(demoTheme) : null), [isDemo, demoTheme]);
  const data = demo ?? remote;

  useEffect(() => {
    if (!data) return;
    const title = data.content?.seo?.title || data.clinic.name;
    const description = data.content?.seo?.description || '';
    document.title = title;
    setMeta('description', description);
    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    document.documentElement.lang = data.content?.locale === 'en' ? 'en' : 'es';
  }, [data]);

  if (isLoading && !isDemo) return <div style={{ minHeight: '100vh' }} aria-busy="true" />;

  if (!data)
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui, sans-serif', color: '#334155', textAlign: 'center' }}>
        <p>{SITE_LABELS.es.notFound}</p>
      </div>
    );

  return <SiteRenderer site={data} mode="live" style={{ minHeight: '100vh' }} />;
};

export default PublicSite;
