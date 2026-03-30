import React from 'react';
import Tooltip from './Tooltip';
import s from './HelpText.module.css';

interface HelpTextProps {
  text: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

const HelpText: React.FC<HelpTextProps> = ({
  text,
  children,
  position = 'top',
  delay = 500,
  className = '',
}) => {
  return (
    <div className={`${s.root} ${className}`}>
      <span>{children}</span>
      <Tooltip content={text} position={position} delay={delay}>
        <span className={s.badge} aria-label={`Help: ${text}`}>
          ?
        </span>
      </Tooltip>
    </div>
  );
};

export default HelpText;
