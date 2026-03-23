import React from 'react';
import Tooltip from './Tooltip';

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
    <div className={`flex items-center gap-[var(--space-2)] ${className}`}>
      <span>{children}</span>
      <Tooltip content={text} position={position} delay={delay}>
        <span
          className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-[var(--text-primary)] bg-[var(--accent)] rounded-full cursor-help"
          aria-label={`Help: ${text}`}
        >
          ?
        </span>
      </Tooltip>
    </div>
  );
};

export default HelpText;
