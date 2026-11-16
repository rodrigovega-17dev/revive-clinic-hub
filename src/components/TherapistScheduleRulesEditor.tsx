import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TherapistScheduleRuleInput } from '@/hooks/useTherapists';

type TherapistScheduleRulesEditorProps = {
  rules: TherapistScheduleRuleInput[];
  onChange: (rules: TherapistScheduleRuleInput[]) => void;
  disabled?: boolean;
};

/** A break is ignored on save unless both ends are set, ordered and inside the working window. */
const breakIsInvalid = (rule: TherapistScheduleRuleInput) => {
  if (!rule.break_start && !rule.break_end) return false;
  if (!rule.break_start || !rule.break_end) return true;
  return !(rule.break_start < rule.break_end && rule.break_start >= rule.start_time && rule.break_end <= rule.end_time);
};

const TherapistScheduleRulesEditor = ({
  rules,
  onChange,
  disabled = false,
}: TherapistScheduleRulesEditorProps) => {
  const { t } = useTranslation();

  const dayLabels = useMemo(
    () => [
      t('appointments.days.sun'),
      t('appointments.days.mon'),
      t('appointments.days.tue'),
      t('appointments.days.wed'),
      t('appointments.days.thu'),
      t('appointments.days.fri'),
      t('appointments.days.sat'),
    ],
    [t]
  );

  const handleRuleChange = (
    weekday: number,
    updates: Partial<TherapistScheduleRuleInput>
  ) => {
    onChange(
      rules.map((rule) =>
        rule.weekday === weekday ? { ...rule, ...updates } : rule
      )
    );
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <Label className="text-sm font-medium">{t('therapists.workingHours')}</Label>
        <p className="text-xs text-muted-foreground">
          {t('therapists.workingHoursDescription')} {t('therapists.breakHelp')}
        </p>
      </div>

      <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground">
        <div>{t('therapists.day')}</div>
        <div className="text-center">{t('therapists.scheduleActive')}</div>
        <div>{t('therapists.scheduleStart')}</div>
        <div>{t('therapists.scheduleEnd')}</div>
        <div>{t('therapists.slotMinutes')}</div>
        <div>{t('therapists.bufferMinutes')}</div>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => {
          const isDisabled = disabled || !rule.is_active;
          return (
            <div key={rule.weekday} className="grid grid-cols-6 gap-x-2 gap-y-1 items-center border-b border-border/60 pb-2 last:border-0">
              <div className="text-sm">{dayLabels[rule.weekday]}</div>
              <div className="flex justify-center">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(value) =>
                    handleRuleChange(rule.weekday, { is_active: value })
                  }
                  disabled={disabled}
                />
              </div>
              <Input
                type="time"
                value={rule.start_time}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, { start_time: event.target.value })
                }
                disabled={isDisabled}
              />
              <Input
                type="time"
                value={rule.end_time}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, { end_time: event.target.value })
                }
                disabled={isDisabled}
              />
              <Input
                type="number"
                min="5"
                step="5"
                value={rule.slot_minutes}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, {
                    slot_minutes: Number(event.target.value),
                  })
                }
                disabled={isDisabled}
              />
              <Input
                type="number"
                min="0"
                step="5"
                value={rule.buffer_minutes}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, {
                    buffer_minutes: Number(event.target.value),
                  })
                }
                disabled={isDisabled}
              />
              <div className="col-span-2 text-xs text-muted-foreground pl-1">{t('therapists.break')}</div>
              <Input
                type="time"
                aria-label={`${t('therapists.break')} ${dayLabels[rule.weekday]} ${t('therapists.scheduleStart')}`}
                value={rule.break_start}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, { break_start: event.target.value })
                }
                disabled={isDisabled}
              />
              <Input
                type="time"
                aria-label={`${t('therapists.break')} ${dayLabels[rule.weekday]} ${t('therapists.scheduleEnd')}`}
                value={rule.break_end}
                onChange={(event) =>
                  handleRuleChange(rule.weekday, { break_end: event.target.value })
                }
                disabled={isDisabled}
              />
              <div className="col-span-2">
                {(rule.break_start || rule.break_end) && !isDisabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => handleRuleChange(rule.weekday, { break_start: '', break_end: '' })}
                  >
                    {t('therapists.clearBreak')}
                  </Button>
                )}
                {breakIsInvalid(rule) && !isDisabled && (
                  <span className="text-xs text-destructive">{t('therapists.breakInvalid')}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TherapistScheduleRulesEditor;
