import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '../lib';

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-[var(--bg-elevated)]',
      'transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/70',
      'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-[var(--accent)] data-[state=unchecked]:bg-[var(--bg-elevated)] shadow-inner',
      className,
    )}
    {...props}
  >
    <div className="pointer-events-none absolute inset-0 rounded-full bg-[var(--glass-shine)] opacity-40 mix-blend-overlay" />
    <SwitchPrimitives.Thumb className="pointer-events-none relative z-10 block h-5 w-5 rounded-full bg-[var(--text-primary)] shadow-md transition-transform duration-300 ease-[var(--easing-liquid)] data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-[2px]" />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;
