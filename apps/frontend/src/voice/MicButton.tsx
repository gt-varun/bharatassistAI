import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mic, Square } from 'lucide-react';
import { cn } from '../lib/utils';
import { useVoiceInput } from './useVoiceInput';

interface MicButtonProps {
  /** Receives the final transcript. */
  onResult: (text: string) => void;
  /** `lg` is the primary "speak your answer" control on an onboarding step. */
  size?: 'sm' | 'lg';
  /** Show the words as they are recognised, and any error, beneath. */
  showTranscript?: boolean;
  className?: string;
}

/**
 * "Say it instead of typing it."
 *
 * Renders nothing at all when no recognition layer exists on the device, so
 * the surrounding form simply looks like an ordinary form. While listening
 * it shows the words arriving, which is what tells someone the app is
 * actually hearing them — a spinner alone reads as a hang.
 */
export const MicButton: React.FC<MicButtonProps> = ({
  onResult,
  size = 'sm',
  showTranscript = false,
  className
}) => {
  const { t } = useTranslation();
  const { supported, state, partial, error, toggle } = useVoiceInput({ onResult });

  if (!supported) return null;

  const listening = state === 'listening';
  const processing = state === 'processing';

  const label = listening
    ? t('voice.listening')
    : processing
      ? t('voice.understanding')
      : t('voice.tapToSpeak');

  return (
    <div className={cn(size === 'lg' && 'flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={toggle}
        disabled={processing}
        aria-label={label}
        title={label}
        aria-pressed={listening}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-2 rounded-full border transition-colors',
          listening
            ? 'border-seal bg-seal-tint text-seal'
            : 'border-rule-strong bg-surface text-ink-2 hover:border-sanction hover:text-sanction',
          processing && 'opacity-70',
          size === 'lg' ? 'h-14 px-6 text-[0.9375rem] font-semibold' : 'h-11 w-11'
        )}
      >
        {processing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : listening ? (
          <Square className="h-4 w-4 fill-current" />
        ) : (
          <Mic className={size === 'lg' ? 'h-5 w-5' : 'h-[1.15rem] w-[1.15rem]'} />
        )}
        {size === 'lg' && <span>{label}</span>}

        {/* A quiet pulse while listening: the one cue that survives being
            unable to read the label. */}
        {listening && (
          <span aria-hidden className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-seal opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-seal" />
          </span>
        )}
      </button>

      {showTranscript && (partial || error) && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            'max-w-xs text-center text-[0.875rem] leading-relaxed',
            error ? 'text-seal' : 'text-ink-2'
          )}
        >
          {error || partial}
        </p>
      )}
    </div>
  );
};
