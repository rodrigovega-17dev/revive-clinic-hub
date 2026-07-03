// Google Calendar default color palette, keyed by the string id stored in
// `therapists.calendar_color_id`. Single source of truth — prefer importing
// from here instead of re-declaring the palette in components.
export interface CalendarColor {
  id: string;
  name: string;
  background: string;
  foreground: string;
}

export const GOOGLE_CALENDAR_COLORS: CalendarColor[] = [
  { id: '1', name: 'Lavender', background: '#7986cb', foreground: '#ffffff' },
  { id: '2', name: 'Sage', background: '#33b679', foreground: '#ffffff' },
  { id: '3', name: 'Grape', background: '#8e63ce', foreground: '#ffffff' },
  { id: '4', name: 'Flamingo', background: '#e67c73', foreground: '#ffffff' },
  { id: '5', name: 'Banana', background: '#f6c026', foreground: '#000000' },
  { id: '6', name: 'Tangerine', background: '#f4791f', foreground: '#ffffff' },
  { id: '7', name: 'Peacock', background: '#039be5', foreground: '#ffffff' },
  { id: '8', name: 'Graphite', background: '#616161', foreground: '#ffffff' },
  { id: '9', name: 'Blueberry', background: '#3f51b5', foreground: '#ffffff' },
  { id: '10', name: 'Basil', background: '#0b8043', foreground: '#ffffff' },
  { id: '11', name: 'Tomato', background: '#d60000', foreground: '#ffffff' },
];

/** Resolve a therapist's calendar_color_id to its color; defaults to the first. */
export const getTherapistColor = (colorId?: string | null): CalendarColor =>
  GOOGLE_CALENDAR_COLORS.find((color) => color.id === colorId) || GOOGLE_CALENDAR_COLORS[0];
