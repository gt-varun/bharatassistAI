import * as React from 'react';
import { cn } from '../../lib/utils';
import { Label } from './label';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Shown under the field. Says what went wrong and how to fix it. */
  error?: string;
  /** Quiet guidance shown when there is no error. */
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const messageId = `${inputId}-message`;

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <input
          type={type}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          className={cn(
            'h-11 w-full rounded-md border border-rule-strong bg-surface px-3.5 text-[0.9375rem] text-ink',
            'transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4',
            'focus:border-sanction focus:outline-none focus:ring-4 focus:ring-sanction/12',
            'disabled:cursor-not-allowed disabled:bg-surface-sunk disabled:text-ink-3',
            error && 'border-seal focus:border-seal focus:ring-seal/12',
            className
          )}
          ref={ref}
          {...props}
        />
        {(error || hint) && (
          <span id={messageId} className={cn('text-[0.8125rem]', error ? 'text-seal' : 'text-ink-3')}>
            {error || hint}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
