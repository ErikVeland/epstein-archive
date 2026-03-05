import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: CloseButtonSize;
  label?: string;
}

const sizeClassMap: Record<CloseButtonSize, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const iconSizeClassMap: Record<CloseButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export const CloseButton: React.FC<CloseButtonProps> = ({
  size = 'md',
  label = 'Close',
  className,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center shrink-0 leading-none rounded-full border border-slate-600/80 bg-slate-900/70 text-slate-300 transition-colors',
        'hover:bg-slate-800 hover:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        sizeClassMap[size],
        className,
      )}
      {...rest}
    >
      <X className={cn('block shrink-0', iconSizeClassMap[size])} />
    </button>
  );
};

export default CloseButton;
