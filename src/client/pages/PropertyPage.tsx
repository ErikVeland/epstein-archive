import React from 'react';
import PropertyBrowser from '../components/PropertyBrowser';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import styles from './PropertyPage.module.css';

export const PropertyPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className={`surface-glass-card ${styles.pageShell}`}>
        <PropertyBrowser />
      </div>
    </ScopedErrorBoundary>
  );
};
