import React from 'react';
import Icon from '@client/components/common/Icon';
import { Button, type ButtonProps } from '@client/design-system/lib';
import { cn } from '@client/utils/cn';

type CloseButtonSize = 'sm' | 'md' | 'lg';

interface CloseButtonProps extends Omit<ButtonProps, 'size'> {
  size?: CloseButtonSize;
  label?: string;
}

const iconSizes: Record<CloseButtonSize, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
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
    <Icon name="X" size={iconSizes[size]} ariaHidden />
  </Button>
);

export default CloseButton;
