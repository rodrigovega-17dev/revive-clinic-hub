import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
}

const TimePicker = ({ value, onChange, label, id, required }: TimePickerProps) => {
  const { t } = useTranslation();

  // Generate whole hour options from 00:00 to 23:00
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
  });

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-foreground">
          {label} {required && '*'}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input border-border text-foreground">
          <SelectValue placeholder={t('ui.selectTime')} />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border max-h-60 overflow-y-auto">
          {timeOptions.map((time) => (
            <SelectItem key={time} value={time} className="text-foreground">
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker;
