
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  min?: string;
}

const DatePicker = ({ value, onChange, label, id, required, min }: DatePickerProps) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const minDate = min || today;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-foreground">
          {label} {required && '*'}
        </Label>
      )}
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-input border-border text-foreground"
        min={minDate}
        required={required}
      />
    </div>
  );
};

export default DatePicker;
