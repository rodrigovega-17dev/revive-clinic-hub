import React from 'react';
import { getTherapistColor } from '@/lib/therapist-colors';

interface TherapistOptionProps {
  therapist: {
    first_name: string;
    last_name: string;
    calendar_color_id?: string | null;
  };
}

/** Renders a therapist's calendar-color dot followed by their name. Use inside <SelectItem>. */
const TherapistOption: React.FC<TherapistOptionProps> = ({ therapist }) => (
  <span className="flex items-center gap-2">
    <span
      className="h-3 w-3 flex-shrink-0 rounded-full border border-border"
      style={{ backgroundColor: getTherapistColor(therapist.calendar_color_id).background }}
    />
    {therapist.first_name} {therapist.last_name}
  </span>
);

export default TherapistOption;
