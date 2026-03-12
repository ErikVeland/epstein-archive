import React from 'react';
import PropertyBrowser from '../components/PropertyBrowser';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const PropertyPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
        <PropertyBrowser />
      </div>
    </ScopedErrorBoundary>
  );
};
