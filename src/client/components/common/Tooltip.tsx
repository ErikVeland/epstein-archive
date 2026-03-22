import React, { useState, useRef, useEffect, useId } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'top-end' | 'bottom-end';
  delay?: number;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 500,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [delayTimeout, setDelayTimeout] = useState<NodeJS.Timeout | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const showTooltip = () => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setDelayTimeout(timeout);
  };

  const hideTooltip = () => {
    if (delayTimeout) {
      clearTimeout(delayTimeout);
      setDelayTimeout(null);
    }
    setIsVisible(false);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (delayTimeout) {
        clearTimeout(delayTimeout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hideTooltip is stable
  }, [isVisible, delayTimeout]);

  const getPositionClasses = () => {
    const baseClasses =
      'absolute z-[100] px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] rounded-[var(--radius-lg)] shadow-[var(--glass-shadow)] backdrop-blur-md whitespace-normal min-w-[200px] max-w-[300px]';

    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'top-end':
        return `${baseClasses} bottom-full right-0 mb-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'bottom-end':
        return `${baseClasses} top-full right-0 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses =
      'absolute w-2 h-2 bg-[var(--glass-bg-strong)] border-t border-l border-[var(--glass-border)] rotate-45';

    switch (position) {
      case 'top':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
      case 'top-end':
        return `${baseClasses} top-full right-3 transform -translate-y-1/2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 -translate-x-1/2`;
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 translate-y-1/2`;
      case 'bottom-end':
        return `${baseClasses} bottom-full right-3 transform translate-y-1/2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 translate-x-1/2`;
      default:
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
    }
  };

  return (
    <span
      className={`inline-block relative ${className}`}
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      aria-describedby={isVisible ? tooltipId : undefined}
    >
      {children}
      {isVisible && (
        <div ref={tooltipRef} className={getPositionClasses()} role="tooltip" id={tooltipId}>
          <div className={getArrowClasses()}></div>
          <div>{content}</div>
        </div>
      )}
    </span>
  );
};

export default Tooltip;
