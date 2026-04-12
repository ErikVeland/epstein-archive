import React from 'react';
import { X } from 'lucide-react';
import { Button, type ButtonProps } from '../../design-system/lib';
import { cn } from '../../utils/cn';

type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps extends Omit<ButtonProps, 'size'> {
  size?: CloseButtonSize;
  label?: string;
}

const iconSizes: Record<CloseButtonSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
};

export const CloseButton: React.FC<CloseButtonProps> = ({
  size = 'md',
  label = 'Close',
  className,
  type = 'button',
  ...rest
}) => (
  <Button
    type={type}
    variant="secondary"
    size={size}
    iconOnly
    aria-label={label}
    title={label}
    className={cn('rounded-full', className)}
    {...rest}
  >
    <X size={iconSizes[size]} aria-hidden="true" />
  </Button>
);

export default CloseButton;
