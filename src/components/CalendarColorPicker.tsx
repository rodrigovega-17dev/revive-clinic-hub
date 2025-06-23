import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

// Google Calendar default colors
const GOOGLE_CALENDAR_COLORS = [
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

interface CalendarColorPickerProps {
  value?: string;
  onChange: (colorId: string) => void;
  label?: string;
  disabled?: boolean;
}

const CalendarColorPicker: React.FC<CalendarColorPickerProps> = ({
  value = '1',
  onChange,
  label,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(value);

  useEffect(() => {
    setSelectedColor(value);
  }, [value]);

  const handleColorSelect = (colorId: string) => {
    setSelectedColor(colorId);
    onChange(colorId);
    setOpen(false);
  };

  const currentColor = GOOGLE_CALENDAR_COLORS.find(color => color.id === selectedColor) || GOOGLE_CALENDAR_COLORS[0];

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !currentColor && "text-muted-foreground"
            )}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full border border-border"
                style={{ backgroundColor: currentColor.background }}
              />
              <span>{currentColor.name}</span>
            </div>
            <Palette className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4">
            <h4 className="font-medium leading-none mb-4">
              {t('therapists.selectCalendarColor')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {GOOGLE_CALENDAR_COLORS.map((color) => (
                <Button
                  key={color.id}
                  variant="ghost"
                  className={cn(
                    "h-auto p-3 justify-start",
                    selectedColor === color.id && "bg-accent"
                  )}
                  onClick={() => handleColorSelect(color.id)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div
                      className="w-6 h-6 rounded-full border border-border flex-shrink-0"
                      style={{ backgroundColor: color.background }}
                    />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{color.name}</div>
                      <div className="text-xs text-muted-foreground">
                        ID: {color.id}
                      </div>
                    </div>
                    {selectedColor === color.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CalendarColorPicker; 