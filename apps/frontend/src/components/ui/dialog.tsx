import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-ink/35 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * One component, two shapes.
 *
 * Below `sm` it is a bottom sheet: anchored to the bottom edge, full width,
 * rising from below, never taller than 90% of the *dynamic* viewport, and
 * padded clear of the home indicator. That is the shape a phone expects,
 * and it puts the content within thumb reach instead of stranding it in
 * the middle of the screen behind the keyboard.
 *
 * From `sm` up it is exactly the centred dialog it has always been.
 *
 * Radix still supplies the parts that are easy to get wrong by hand: focus
 * trapping, Escape, restoring focus on close, and locking the page behind
 * it from scrolling.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col gap-4 bg-surface text-ink shadow-pop',

        // --- Phone: a bottom sheet -------------------------------------
        'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-2xl border-t border-rule',
        'px-5 pb-[calc(1.25rem+var(--sab))] pt-3',
        'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4',

        // --- sm and up: the original centred dialog ---------------------
        'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg',
        'sm:max-h-[85vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:border sm:p-6',
        'sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0',
        'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',

        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className
      )}
      {...props}
    >
      {/* Grabber: says "this panel belongs to the bottom edge". Decorative
          only — no drag gesture, because a drag handler here would compete
          with scrolling the sheet's own content. */}
      <div
        aria-hidden
        className="mx-auto h-1 w-9 shrink-0 rounded-full bg-rule-strong sm:hidden"
      />

      {children}

      {/* On a phone the sheet is reached with a thumb, so the close target
          is a full 44px rather than the desktop's 28px corner button. */}
      <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-2.5 text-ink-3 transition-colors hover:bg-rule-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sanction/60 sm:right-4 sm:top-4 sm:p-1.5">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * The scrolling middle of a sheet.
 *
 * A sheet capped at 90dvh has to decide *what* scrolls. Putting the
 * overflow on the whole panel scrolls its action buttons off the bottom,
 * which on a phone is precisely the thing that must stay reachable — so
 * long content goes in here and the header and footer stay put.
 */
const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1', className)}
    {...props}
  />
);
DialogBody.displayName = 'DialogBody';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex shrink-0 flex-col gap-1.5 pr-8', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-lg font-semibold tracking-[-0.015em] text-ink', className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-[0.875rem] leading-relaxed text-ink-2', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogBody,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
};
