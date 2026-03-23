import React from 'react';

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showPercentage = false,
  label,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const strokeDashoffset = 100 - percentage;

  const sizeClasses = {
    sm: { container: 'w-12 h-12', text: 'text-xs' },
    md: { container: 'w-16 h-16', text: 'text-sm' },
    lg: { container: 'w-20 h-20', text: 'text-base' },
    xl: { container: 'w-24 h-24', text: 'text-lg' },
  };

  const colorClasses = {
    primary: 'stroke-blue-500',
    secondary: 'stroke-purple-500',
    success: 'stroke-green-500',
    warning: 'stroke-yellow-500',
    danger: 'stroke-red-500',
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`relative ${sizeClasses[size].container}`}>
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle className="stroke-gray-700" cx="50" cy="50" r="45" fill="none" strokeWidth="8" />
          {/* Progress circle */}
          <circle
            className={`${colorClasses[color]} transition-all duration-300 ease-out`}
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeDasharray="100"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
        {showPercentage && (
          <div
            className={`absolute inset-0 flex items-center justify-center ${sizeClasses[size].text} font-bold text-[var(--text-primary)]`}
          >
            {Math.round(percentage)}%
          </div>
        )}
      </div>
      {label && (
        <span className="mt-[var(--space-2)] text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularProgress;
