import React from 'react';
import { cn } from '@client/utils/cn';
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
  variant?:
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'display'
    | 'bombastic'
    | 'symbolic'
    | 'body'
    | 'subtitle'
    | 'small'
    | 'xs'
    | 'xxs'
    | 'xxxs';
  color?:
    | 'primary'
    | 'secondary'
    | 'muted'
    | 'accent'
    | 'danger'
    | 'success'
    | 'warning'
    | 'foreground';
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  as?: TextTag;
  align?: 'left' | 'center' | 'right' | 'justify';
  mt?: string;
  ml?: string;
  py?: string;
  lineHeight?: string;
  italic?: boolean;
}

export const LqText: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  weight,
  as: Component = 'p',
  align,
  className,
  children,
  mt,
  ml,
  py,
  lineHeight,
  italic,
  style,
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
      style={{
        ...(mt && { marginTop: mt }),
        ...(ml && { marginLeft: ml }),
        ...(py && { paddingTop: py, paddingBottom: py }),
        ...(lineHeight && { lineHeight }),
        ...(italic && { fontStyle: 'italic' }),
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  );
};

export const Text = LqText;
