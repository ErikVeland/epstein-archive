import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import s from './CloseButton.module.css';

type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: CloseButtonSize;
  label?: string;
}

const sizeMap: Record<CloseButtonSize, string> = {
  sm: s.sm,
  md: s.md,
  lg: s.lg,
};

const iconSizeMap: Record<CloseButtonSize, string> = {
  sm: s.iconSm,
  md: s.iconMd,
  lg: s.iconLg,
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
      className={cn(s.root, sizeMap[size], className)}
      {...rest}
    >
      <X className={cn(s.icon, iconSizeMap[size])} />
    </button>
  );
};

export default CloseButton;
