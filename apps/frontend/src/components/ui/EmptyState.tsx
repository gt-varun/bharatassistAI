import React from 'react';
import { FileSearch, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  /** Say what to do next, not that something is missing. */
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No schemes match these filters',
  description = 'Widen the filters or search in plain language — describing your situation usually works better than a scheme name.',
  action,
  icon: Icon = FileSearch
}) => (
  <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-dashed border-rule-strong bg-surface px-8 py-14 text-center">
    <div className="mb-4 rounded-md border border-rule bg-surface-sunk p-3 text-ink-3">
      <Icon className="h-6 w-6" strokeWidth={1.6} />
    </div>
    <h4 className="mb-1.5 font-display text-lg font-semibold text-ink">{title}</h4>
    <p className="max-w-sm text-[0.875rem] leading-relaxed text-ink-2">{description}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);
