import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  min?: string;
}

const DatePicker = ({ value, onChange, label, id, required, min }: DatePickerProps) => {
  // Parse the date string properly to avoid timezone issues
  const selectedDate = value ? new Date(value + 'T00:00:00') : undefined;
  const today = new Date();
  const minDate = min ? new Date(min + 'T00:00:00') : today;

  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label} {required && '*'}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onChange(format(date, 'yyyy-MM-dd'))}
            disabled={(date) => date < minDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DatePicker;
