import React from 'react';

interface RedFlagIndexProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  showLegend?: boolean;
  variant?: 'emoji' | 'text' | 'icon' | 'combined'; // Added combined variant
  showTextLabel?: boolean; // New prop for color-blind friendly text labels
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// Consistent color scale for all risk levels with better contrast
const colors = {
  0: 'text-[var(--text-muted)]',
  1: 'text-[var(--accent-warning)]',
  2: 'text-[var(--accent-warning)]',
  3: 'text-[var(--accent-danger)]',
  4: 'text-[var(--accent-secondary)]',
  5: 'text-[var(--accent-danger)]',
};

// Standardized labels for consistency
const descriptions = {
  0: 'No Red Flags',
  1: 'Minor Concerns',
  2: 'Moderate Red Flags',
  3: 'Significant Red Flags',
  4: 'High Red Flags',
  5: 'Critical Red Flags',
};

// Risk categories for legend
const riskCategories = {
  0: 'Background noise',
  1: 'Background noise',
  2: 'Relevant',
  3: 'Relevant',
  4: 'Critical attention',
  5: 'Critical attention',
};

// Text-based representations for accessibility
const textLabels = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Very High',
  5: 'Critical',
};

export const RedFlagIndex: React.FC<RedFlagIndexProps> = ({
  value,
  size = 'md',
  showLabel = false,
  showDescription = false,
  showLegend = false,
  variant = 'emoji', // Default to emoji for backward compatibility
  showTextLabel = false, // New prop for color-blind friendly text labels
}) => {
  const normalizedValue = Math.max(0, Math.min(5, Math.round(value)));
  const description = descriptions[normalizedValue as keyof typeof descriptions];
  const colorClass = colors[normalizedValue as keyof typeof colors];
  const textLabel = textLabels[normalizedValue as keyof typeof textLabels];
  const riskCategory = riskCategories[normalizedValue as keyof typeof riskCategories];

  // Show white flag for 0, red flags for 1-5
  const peppers = normalizedValue > 0 ? '🚩'.repeat(normalizedValue) : '🏳️';

  // Render based on variant
  const renderContent = () => {
    switch (variant) {
      case 'text':
        return (
          <span
            className={`${sizeClasses[size]} font-medium`}
            aria-label={`${description} - Risk Level: ${textLabel}`}
          >
            {textLabel}
          </span>
        );
      case 'icon':
        return (
          <span className={`${sizeClasses[size]} ${colorClass}`} aria-hidden="true">
            {peppers}
          </span>
        );
      case 'combined':
        return (
          <div className="inline-flex items-center gap-[var(--space-1)]">
            <span className={`${sizeClasses[size]} ${colorClass}`} aria-hidden="true">
              {peppers}
            </span>
            {showTextLabel && (
              <span
                className={`${sizeClasses[size]} font-medium`}
                aria-label={`${description} - Risk Level: ${textLabel}`}
              >
                {textLabel}
              </span>
            )}
          </div>
        );
      case 'emoji':
      default:
        return (
          <span className={`${sizeClasses[size]} ${colorClass}`} aria-hidden="true">
            {peppers}
          </span>
        );
    }
  };

  return (
    <div className="inline-flex flex-col">
      <div className="inline-flex items-center gap-[var(--space-2)]">
        {renderContent()}
        {showLabel && (
          <span className={`${sizeClasses[size]} text-[var(--text-muted)]`}>
            {normalizedValue}/5
          </span>
        )}
        {showDescription && (
          <span className={`${sizeClasses[size]} ${colorClass}`}>{description}</span>
        )}
      </div>
      {showLegend && (
        <div className="mt-[var(--space-1)] text-xs text-[var(--text-muted)]">{riskCategory}</div>
      )}
    </div>
  );
};
