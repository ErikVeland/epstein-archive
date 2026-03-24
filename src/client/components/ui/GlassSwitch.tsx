import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

export const GlassSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className = '', ...props }, ref) => (
  <SwitchPrimitives.Root
    className={`peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-bg-elevated transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-bg-elevated shadow-inner overflow-hidden ${className}`}
    {...props}
    ref={ref}
  >
    <div className="absolute inset-0 z-0 bg-[var(--glass-shine)] rounded-full pointer-events-none opacity-40 mix-blend-overlay" />
    <SwitchPrimitives.Thumb className="relative z-10 pointer-events-none block h-5 w-5 rounded-full bg-[var(--text-primary)] shadow-md ring-0 transition-transform duration-300 ease-[var(--easing-liquid)] data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-[2px]" />
  </SwitchPrimitives.Root>
));
GlassSwitch.displayName = SwitchPrimitives.Root.displayName;
