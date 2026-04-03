import React from 'react';
import { cn } from '../../lib';
import './Text.css';

type TextTag =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'p'
  | 'span'
  | 'div'
  | 'label'
  | 'dt'
  | 'dd'
  | 'li';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'display' | 'body' | 'small' | 'xs';
  color?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  as?: TextTag;
  align?: 'left' | 'center' | 'right' | 'justify';
}

export const LqText: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  as: Component = 'p',
  align,
  className,
  children,
  ...props
}) => {
  return (
    <Component
      className={cn(
        'lq-text',
        `lq-text--${variant}`,
        `lq-text--color-${color}`,
        weight && `lq-text--weight-${weight}`,
        align && `lq-text--align-${align}`,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
};
