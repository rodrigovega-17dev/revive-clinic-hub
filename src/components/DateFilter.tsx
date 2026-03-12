import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/hooks/useLanguage';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const DateFilter = ({ selectedDate, onDateChange }: DateFilterProps) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const locale = currentLanguage === 'es' ? es : enUS;

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : undefined;

  return (
    <div className="space-y-2">
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
            {selectedDateObj ? format(selectedDateObj, 'PPP', { locale }) : <span>{t('appointments.pickADate')}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDateObj}
            onSelect={(date) => date && onDateChange(format(date, 'yyyy-MM-dd'))}
            locale={locale}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateFilter;
