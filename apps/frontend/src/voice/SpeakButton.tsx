import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import { useSpeak } from './useSpeak';

interface SpeakButtonProps {
  /** What to read. Usually a question, an answer or a scheme summary. */
  text: string;
  /** `lg` is for the one-per-screen reader on an onboarding question. */
  size?: 'sm' | 'lg';
  className?: string;
}

/**
 * "Read this to me."
 *
 * Renders nothing where the device cannot speak, so a citizen is never
 * offered a button that does nothing. It is always an explicit tap — the
 * app does not read itself aloud unprompted.
 */
export const SpeakButton: React.FC<SpeakButtonProps> = ({ text, size = 'sm', className }) => {
  const { t } = useTranslation();
  const { supported, speaking, toggle } = useSpeak();

  if (!supported) return null;

  const label = speaking ? t('voice.stopReading') : t('voice.readAloud');

  return (
    <button
      type="button"
      onClick={() => toggle(text)}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border transition-colors',
        speaking
          ? 'border-sanction bg-sanction-tint text-sanction'
          : 'border-rule-strong bg-surface text-ink-2 hover:border-sanction hover:text-sanction',
        size === 'lg' ? 'h-12 px-4 text-[0.875rem] font-medium' : 'h-10 w-10',
        className
      )}
    >
      {speaking ? (
        <Square className="h-4 w-4 fill-current" />
      ) : (
        <Volume2 className={size === 'lg' ? 'h-5 w-5' : 'h-[1.1rem] w-[1.1rem]'} />
      )}
      {size === 'lg' && <span>{label}</span>}
    </button>
  );
};
