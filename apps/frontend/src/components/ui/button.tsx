import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  // `ba-btn` carries no styles of its own — it is the hook index.css uses to
  // give every button a 44px target on touch screens. A marker class rather
  // than an element selector because `asChild` renders these as <a>, <label>
  // and so on, which no element-based rule would ever catch.
  'ba-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans font-semibold ' +
    'transition-[background-color,border-color,box-shadow,transform] duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sanction/60 focus-visible:ring-offset-2 ' +
    'focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-45 select-none',
  {
    variants: {
      variant: {
        // The sanctioned action. One per screen.
        default: 'bg-sanction text-white shadow-card hover:bg-sanction-hover active:translate-y-px',
        primary: 'bg-sanction text-white shadow-card hover:bg-sanction-hover active:translate-y-px',
        // Secondary: a bordered paper button.
        outline:
          'border border-rule-strong bg-surface text-ink hover:border-ink-4 hover:bg-surface-sunk active:translate-y-px',
        secondary:
          'bg-indigo text-white shadow-card hover:bg-indigo/90 active:translate-y-px',
        soft: 'bg-sanction-tint text-sanction border border-sanction-edge hover:bg-sanction-tint/70',
        ghost: 'text-ink-2 hover:bg-rule-soft hover:text-ink',
        destructive:
          'border border-seal-edge bg-seal-tint text-seal hover:bg-seal hover:text-white hover:border-seal',
        link: 'h-auto p-0 text-sanction underline underline-offset-4 decoration-sanction/35 hover:decoration-sanction'
      },
      size: {
        default: 'h-10 px-4 text-[0.875rem]',
        sm: 'h-8 px-3 text-[0.8125rem]',
        lg: 'h-12 px-6 text-[0.9375rem]',
        icon: 'h-9 w-9 p-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
