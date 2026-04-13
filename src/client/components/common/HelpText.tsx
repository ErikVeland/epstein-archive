import React from 'react';
import { Tooltip, TooltipTrigger, TooltipPortal, TooltipContent } from '../../design-system/lib';
import s from './HelpText.module.css';

interface HelpTextProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

const HelpText: React.FC<HelpTextProps> = ({
  text,
  children,
  position = 'top',
  className = '',
}) => {
  return (
    <div className={`${s.root} ${className}`}>
      <span>{children}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={s.badge} aria-label={`Help: ${text}`}>
            ?
          </span>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side={position}>{text}</TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </div>
  );
};

export default HelpText;
