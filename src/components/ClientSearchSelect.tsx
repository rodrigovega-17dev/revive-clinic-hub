import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatPersonName } from '@/lib/names';

type ClientLike = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
};

interface ClientSearchSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  clients: ClientLike[];
  placeholder?: string;
  disabled?: boolean;
  allowNone?: boolean;
  noneValue?: string;
  noneLabel?: string;
}

export const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  value,
  onValueChange,
  clients,
  placeholder,
  disabled = false,
  allowNone = false,
  noneValue = 'none',
  noneLabel,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(() => {
    if (allowNone && value === noneValue) {
      return noneLabel || t('finance.noClient');
    }

    const selected = clients.find((client) => client.id === value);
    if (!selected) return '';
    return formatPersonName(selected.first_name, selected.last_name);
  }, [allowNone, clients, noneLabel, noneValue, t, value]);

  const selectClient = (nextValue: string) => {
    onValueChange(nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-input border-border text-foreground"
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel || placeholder || t('common.selectClient')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter>
          <CommandInput placeholder={`${t('common.search')}...`} />
          <CommandList>
            <CommandEmpty>{t('common.noResults')}</CommandEmpty>
            {allowNone && (
              <CommandItem
                value={`${noneValue} ${(noneLabel || t('finance.noClient')).toLowerCase()}`}
                onSelect={() => selectClient(noneValue)}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === noneValue ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {noneLabel || t('finance.noClient')}
              </CommandItem>
            )}
            {clients.map((client) => {
              const label = formatPersonName(client.first_name, client.last_name);
              return (
                <CommandItem
                  key={client.id}
                  value={`${client.id} ${label.toLowerCase()}`}
                  onSelect={() => selectClient(client.id)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === client.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {label}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default ClientSearchSelect;
