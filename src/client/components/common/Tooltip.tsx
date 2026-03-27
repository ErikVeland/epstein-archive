import React from 'react';
import {
  Tooltip as TooltipRoot,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@design-system';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'top-end' | 'bottom-end';
  delay?: number;
  className?: string;
}

const sideMap = {
  top: 'top',
  'top-end': 'top',
  right: 'right',
  bottom: 'bottom',
  'bottom-end': 'bottom',
  left: 'left',
} as const;

const alignMap = {
  top: 'center',
  'top-end': 'end',
  right: 'center',
  bottom: 'center',
  'bottom-end': 'end',
  left: 'center',
} as const;

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className = '',
}) => {
  return (
    <TooltipProvider delayDuration={delay}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <span className={`relative inline-block ${className}`}>{children}</span>
        </TooltipTrigger>
        <TooltipContent
          side={sideMap[position]}
          align={alignMap[position]}
          sideOffset={8}
          className="max-w-[300px] whitespace-normal"
        >
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  );
};

export default Tooltip;
