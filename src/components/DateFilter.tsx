import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const DateFilter = ({ selectedDate, onDateChange }: DateFilterProps) => {
  const { t } = useTranslation();
  
  // Parse the date string properly to avoid timezone issues
  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined;

  return (
    <div className="flex items-center space-x-2">
      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{t('appointments.filterByDate')}</p>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDateObj && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDateObj ? format(selectedDateObj, "PPP") : <span>{t('appointments.pickADate')}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDateObj}
              onSelect={(date) => date && onDateChange(format(date, 'yyyy-MM-dd'))}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default DateFilter;
