// Sample site used only in development (/s/__demo?theme=<key>) to review themes without a database.
import { defaultSiteContent } from './defaults';
import type { PublicSiteData } from './types';

export const demoSite = (themeKey: string): PublicSiteData => {
  const content = defaultSiteContent('Raíz Fisioterapia');
  const hero = content.sections.find((s) => s.type === 'hero');
  if (hero) {
    hero.data.title = 'El cuerpo *recuerda* cómo moverse.';
    hero.data.subtitle = 'Fisioterapia y terapia manual en Providencia, Guadalajara. Sesiones uno a uno con el mismo terapeuta de principio a fin.';
  }
  return {
    slug: '__demo',
    theme_key: themeKey,
    theme_overrides: {},
    content,
    booking: { enabled: true, horizon_days: 14 },
    clinic: {
      name: 'Raíz Fisioterapia', logo_url: null, phone: '33 1234 5678', email: 'hola@ejemplo.mx',
      address: 'Av. Providencia 2450, Guadalajara, Jal.', timezone: 'America/Mexico_City', currency: 'MXN',
    },
    treatments: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'Fisioterapia deportiva', description: 'Valoración, tratamiento manual y plan de ejercicio.', duration_minutes: 60, price: 750, bookable: true },
      { id: '00000000-0000-0000-0000-000000000002', name: 'Punción seca', description: 'Para puntos gatillo y tensión muscular persistente.', duration_minutes: 45, price: 700, bookable: true },
      { id: '00000000-0000-0000-0000-000000000003', name: 'Rehabilitación postquirúrgica', description: 'Recuperación guiada después de una cirugía.', duration_minutes: 60, price: 800, bookable: true },
      { id: '00000000-0000-0000-0000-000000000004', name: 'Masaje descontracturante', description: null, duration_minutes: 50, price: 650, bookable: true },
    ],
    therapists: [
      { id: 't1', first_name: 'ANA LUCÍA', last_name: 'ORTEGA', specialties: ['Deportiva', 'Punción seca'], bio: 'Fisioterapeuta con 9 años de experiencia en lesiones deportivas.', photo_url: null },
      { id: 't2', first_name: 'DIEGO', last_name: 'MARTÍNEZ', specialties: ['Rehabilitación'], bio: null, photo_url: null },
      { id: 't3', first_name: 'SOFÍA', last_name: 'RAMÍREZ', specialties: ['Masaje', 'Prenatal'], bio: null, photo_url: null },
    ],
    hours: [1, 2, 3, 4, 5].map((d) => ({ weekday: d, start: '08:00:00', end: '20:00:00' })).concat([{ weekday: 6, start: '09:00:00', end: '14:00:00' }]),
  };
};
