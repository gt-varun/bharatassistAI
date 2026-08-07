import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Badges here are register marks, not decoration — each variant means one
 * thing: who issued a scheme, whether it is open, whether the record is old.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-micro uppercase tracking-[0.07em] font-medium select-none',
  {
    variants: {
      variant: {
        default: 'border-rule-strong bg-surface-sunk text-ink-2',
        outline: 'border-rule-strong bg-transparent text-ink-3',
        central: 'border-sanction-edge bg-sanction-tint text-sanction',
        state: 'border-indigo-edge bg-indigo-tint text-indigo',
        open: 'border-sanction-edge bg-sanction-tint text-sanction',
        closed: 'border-rule-strong bg-rule-soft text-ink-3',
        deadline: 'border-seal-edge bg-seal-tint text-seal',
        stale: 'border-ochre-edge bg-ochre-tint text-ochre',
        // Kept for shadcn compatibility.
        secondary: 'border-rule-strong bg-surface-sunk text-ink-2',
        success: 'border-sanction-edge bg-sanction-tint text-sanction',
        destructive: 'border-seal-edge bg-seal-tint text-seal'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
