import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  /** Mono eyebrow — names the section this page belongs to. */
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className
}) => (
  <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
    <div className="min-w-0 max-w-2xl">
      {eyebrow && <p className="register mb-1.5">{eyebrow}</p>}
      <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
        {title}
      </h1>
      {description && (
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-2 text-pretty">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/** Standard page gutter — every page inside the shell uses this. */
export const PageBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className
}) => <div className={cn('mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8', className)}>{children}</div>;
