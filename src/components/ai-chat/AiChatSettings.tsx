import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Select value={model} onValueChange={(value) => onModelChange(value as AiChatModel)} disabled={disabled}>
        <SelectTrigger className="h-8 w-[190px] text-xs bg-input border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="claude-haiku-5-5">{t('aiChat.modelHaiku')}</SelectItem>
          <SelectItem value="claude-sonnet-5-5">{t('aiChat.modelSonnet')}</SelectItem>
        </SelectContent>
      </Select>

      <Select value={effort} onValueChange={(value) => onEffortChange(value as AiChatEffort)} disabled={disabled}>
        <SelectTrigger className="h-8 w-[140px] text-xs bg-input border-border text-foreground">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="low">{t('aiChat.effortLow')}</SelectItem>
          <SelectItem value="medium">{t('aiChat.effortMedium')}</SelectItem>
          <SelectItem value="high">{t('aiChat.effortHigh')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AiChatSettings;
