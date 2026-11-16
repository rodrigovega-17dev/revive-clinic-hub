import type { Section, SectionType, SiteContent } from './types';

const uid = () => Math.random().toString(36).slice(2, 10);

export const newSection = (type: SectionType, locale: 'es' | 'en' = 'es'): Section => ({
  id: `${type}_${uid()}`,
  type,
  enabled: true,
  data: defaultSectionData(type, locale),
});

const defaultSectionData = (type: SectionType, locale: 'es' | 'en'): Section['data'] => {
  const es = locale === 'es';
  switch (type) {
    case 'hero':
      return {
        eyebrow: es ? 'Bienvenido' : 'Welcome',
        title: es ? 'Te ayudamos a sentirte mejor.' : 'We help you feel better.',
        subtitle: es
          ? 'Atención personalizada con un equipo que te escucha. Reserva tu cita en línea en menos de un minuto.'
          : 'Personal care from a team that listens. Book online in under a minute.',
        ctaLabel: es ? 'Reservar cita' : 'Book a visit',
      };
    case 'services':
      return { eyebrow: es ? 'Servicios' : 'Services', title: es ? 'Tratamientos' : 'Treatments' };
    case 'about':
      return {
        eyebrow: es ? 'Nosotros' : 'About us',
        title: es ? 'Una clínica pensada para ti' : 'A clinic built around you',
        body: es
          ? 'Cuéntale a tus pacientes quiénes son, cómo trabajan y qué los hace diferentes.'
          : 'Tell patients who you are, how you work and what makes you different.',
      };
    case 'team':
      return { eyebrow: es ? 'Equipo' : 'Team', title: es ? 'Quién te atiende' : 'Who will see you' };
    case 'testimonials':
      return {
        eyebrow: es ? 'Testimonios' : 'Testimonials',
        title: es ? 'Lo que dicen nuestros pacientes' : 'What patients say',
        items: [
          { quote: es ? 'Me explicaron todo con calma y salí con un plan claro.' : 'They explained everything calmly and I left with a clear plan.', author: 'María G.' },
          { quote: es ? 'Reservar fue muy fácil y me atendieron puntual.' : 'Booking was easy and they saw me on time.', author: 'Jorge L.' },
        ],
      };
    case 'faq':
      return {
        eyebrow: 'FAQ',
        title: es ? 'Preguntas frecuentes' : 'Frequently asked questions',
        items: [
          { q: es ? '¿Cómo reservo?' : 'How do I book?', a: es ? 'Elige un servicio y un horario aquí mismo. La clínica confirma tu cita por correo o WhatsApp.' : 'Pick a service and a time right here. The clinic confirms by email or WhatsApp.' },
          { q: es ? '¿Puedo cancelar?' : 'Can I cancel?', a: es ? 'Sí, avísanos con al menos 24 horas de anticipación.' : 'Yes, please let us know at least 24 hours ahead.' },
          { q: es ? '¿Emiten factura?' : 'Do you issue invoices?', a: es ? 'Sí, pide tu factura CFDI en recepción.' : 'Yes, ask the front desk for your invoice.' },
        ],
      };
    case 'booking':
      return {
        eyebrow: es ? 'Agenda' : 'Booking',
        title: es ? 'Solicita tu cita' : 'Request an appointment',
        subtitle: es ? 'Elige servicio y horario. Te confirmamos en cuanto la clínica lo apruebe.' : 'Choose a service and a time. We confirm as soon as the clinic approves it.',
      };
    case 'location':
      return { eyebrow: es ? 'Visítanos' : 'Visit us', title: es ? 'Ubicación y horarios' : 'Location and hours' };
    case 'cta':
      return {
        title: es ? '¿Listo para tu primera cita?' : 'Ready for your first visit?',
        subtitle: es ? 'Elige el horario que te acomode.' : 'Pick the time that suits you.',
        ctaLabel: es ? 'Reservar ahora' : 'Book now',
      };
  }
};

export const defaultSiteContent = (clinicName: string, locale: 'es' | 'en' = 'es'): SiteContent => {
  const types: SectionType[] = ['hero', 'services', 'about', 'team', 'testimonials', 'booking', 'faq', 'location', 'cta'];
  const sections = types.map((t) => newSection(t, locale));
  return {
    locale,
    sections,
    seo: {
      title: clinicName,
      description: locale === 'es' ? `${clinicName}: reserva tu cita en línea.` : `${clinicName}: book your visit online.`,
    },
    social: {},
  };
};

/** Static labels used by the public renderer. */
export const SITE_LABELS = {
  es: {
    book: 'Reservar', minutes: 'min', from: 'Desde', closed: 'Cerrado', hours: 'Horario', contact: 'Contacto',
    weekdays: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    chooseService: 'Elige un servicio', chooseDay: 'Elige un día', chooseTime: 'Elige un horario',
    yourData: 'Tus datos', firstName: 'Nombre', lastName: 'Apellidos', phone: 'Teléfono (10 dígitos)', email: 'Correo electrónico',
    notes: 'Comentarios (opcional)', consent: 'Acepto que la clínica use mis datos para gestionar mi cita, conforme a su aviso de privacidad.',
    send: 'Enviar solicitud', sending: 'Enviando…', back: 'Atrás', noSlots: 'No hay horarios libres este día. Prueba otro.',
    loadingSlots: 'Buscando horarios…', successTitle: 'Solicitud enviada',
    successBody: 'La clínica revisará tu solicitud y te confirmará la cita por correo o teléfono.',
    another: 'Hacer otra solicitud', errorGeneric: 'No pudimos enviar tu solicitud. Intenta de nuevo.',
    errorSlot: 'Ese horario se acaba de ocupar. Elige otro.', errorRate: 'Demasiados intentos. Espera unos minutos.',
    errorPending: 'Ya tienes varias solicitudes pendientes. Espera la confirmación de la clínica.',
    bookingOff: 'Por ahora la reserva en línea no está disponible. Contáctanos por teléfono.',
    poweredBy: 'Sitio creado con Cliniker', notFound: 'Este sitio no existe o aún no se ha publicado.', withTherapist: 'Asignaremos al terapeuta disponible.',
  },
  en: {
    book: 'Book', minutes: 'min', from: 'From', closed: 'Closed', hours: 'Hours', contact: 'Contact',
    weekdays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    chooseService: 'Choose a service', chooseDay: 'Choose a day', chooseTime: 'Choose a time',
    yourData: 'Your details', firstName: 'First name', lastName: 'Last name', phone: 'Phone (10 digits)', email: 'Email',
    notes: 'Comments (optional)', consent: 'I agree that the clinic may use my data to manage my appointment, as described in its privacy notice.',
    send: 'Send request', sending: 'Sending…', back: 'Back', noSlots: 'No free times on this day. Try another.',
    loadingSlots: 'Looking for times…', successTitle: 'Request sent',
    successBody: 'The clinic will review your request and confirm by email or phone.',
    another: 'Make another request', errorGeneric: 'We could not send your request. Please try again.',
    errorSlot: 'That time was just taken. Please pick another.', errorRate: 'Too many attempts. Please wait a few minutes.',
    errorPending: 'You already have several pending requests. Please wait for the clinic to confirm.',
    bookingOff: 'Online booking is not available right now. Please call us.',
    poweredBy: 'Built with Cliniker', notFound: 'This site does not exist or has not been published yet.', withTherapist: 'We will assign an available therapist.',
  },
};
export type SiteLabels = (typeof SITE_LABELS)['es'];
