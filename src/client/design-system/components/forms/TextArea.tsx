import * as React from 'react';
import { cn } from '../../../utils/cn';
import './TextInput.css';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Deprecated compatibility prop. DS textarea styling is always applied. */
  unstyled?: boolean;
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, unstyled: _unstyled = false, ...props }, ref) => (
    <textarea ref={ref} className={cn('ds-inputField', 'ds-inputTextarea', className)} {...props} />
  ),
);

TextArea.displayName = 'TextArea';
