
import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const DateFilter = ({ selectedDate, onDateChange }: DateFilterProps) => {
  return (
    <div className="flex items-center space-x-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="space-y-1">
        <Label htmlFor="date-filter" className="text-sm font-medium">
          Filter by Date
        </Label>
        <Input
          id="date-filter"
          type="date"
          value={selectedDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-40"
        />
      </div>
    </div>
  );
};

export default DateFilter;
