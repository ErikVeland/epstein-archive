import * as React from 'react';
import { cn } from '../../../utils/cn';
import './TextInput.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Deprecated compatibility prop. DS input styling is always applied. */
  unstyled?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, unstyled: _unstyled = false, ...props }, ref) => (
    <input ref={ref} className={cn('ds-inputField', className)} {...props} />
  ),
);

Input.displayName = 'Input';
