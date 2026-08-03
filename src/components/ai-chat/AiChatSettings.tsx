import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { AiChatEffort, AiChatModel } from '@/hooks/useAiChat';

interface AiChatSettingsProps {
  model: AiChatModel;
  effort: AiChatEffort;
  onModelChange: (model: AiChatModel) => void;
  onEffortChange: (effort: AiChatEffort) => void;
  disabled?: boolean;
}

const AiChatSettings = ({ model, effort, onModelChange, onEffortChange, disabled }: AiChatSettingsProps) => {
  const { t } = useTranslation();
  const isOpus = model === 'claude-opus-5';

  const effortSelect = (
    <Select
      value={effort}
      onValueChange={(value) => onEffortChange(value as AiChatEffort)}
      disabled={disabled || !isOpus}
    >
      <SelectTrigger className="h-8 w-[140px] text-xs bg-input border-border text-foreground">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        <SelectItem value="low">{t('aiChat.effortLow')}</SelectItem>
        <SelectItem value="medium">{t('aiChat.effortMedium')}</SelectItem>
        <SelectItem value="high">{t('aiChat.effortHigh')}</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Select value={model} onValueChange={(value) => onModelChange(value as AiChatModel)} disabled={disabled}>
        <SelectTrigger className="h-8 w-[190px] text-xs bg-input border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="claude-haiku-4-5-20251001">{t('aiChat.modelHaiku')}</SelectItem>
          <SelectItem value="claude-opus-5">{t('aiChat.modelOpus')}</SelectItem>
        </SelectContent>
      </Select>

      {isOpus ? (
        effortSelect
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>{effortSelect}</span>
          </TooltipTrigger>
          <TooltipContent>{t('aiChat.effortOnlyAppliesToOpus')}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default AiChatSettings;
