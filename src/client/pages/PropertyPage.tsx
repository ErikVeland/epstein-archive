import React from 'react';
import PropertyBrowser from '../components/PropertyBrowser';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const PropertyPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className="surface-glass-card p-6 min-h-[500px]">
        <PropertyBrowser />
      </div>
    </ScopedErrorBoundary>
  );
};
