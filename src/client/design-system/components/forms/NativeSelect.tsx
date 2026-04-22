import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../../utils/cn';
import './Select.css';

export interface NativeSelectProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'size'
> {
  /** Deprecated compatibility prop. DS select styling is always applied. */
  unstyled?: boolean;
  size?: 'sm' | 'md';
  rootClassName?: string;
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { className, unstyled: _unstyled = false, size = 'md', rootClassName, id, children, ...props },
    ref,
  ) => {
    return (
      <div className={cn('ds-selectRoot', rootClassName)}>
        <div className="ds-selectControl" data-size={size}>
          <select
            ref={ref}
            id={id}
            data-size={size}
            className={cn('ds-selectField', className)}
            {...props}
          >
            {children}
          </select>
          <ChevronDown aria-hidden="true" className="ds-selectIcon" size={16} />
        </div>
      </div>
    );
  },
);

NativeSelect.displayName = 'NativeSelect';
