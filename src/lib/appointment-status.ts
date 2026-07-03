// Appointment status → dot color, shown on calendar cards (which are filled with the
// therapist's color, so the small dot conveys status instead).
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export const getStatusDotColor = (status?: string): string => {
  switch (status) {
    case 'completed':
      return '#22c55e'; // green
    case 'in_progress':
      return '#f59e0b'; // amber
    case 'confirmed':
      return '#14b8a6'; // teal
    case 'cancelled':
      return '#ef4444'; // red
    case 'no_show':
      return '#9ca3af'; // gray
    default:
      return '#3b82f6'; // scheduled → blue
  }
};
