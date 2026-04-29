import React from 'react';
import PropertyBrowser from '@client/components/PropertyBrowser';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import styles from './PropertyPage.module.css';

export const PropertyPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <div className={`surface-panel ${styles.pageShell}`}>
        <PropertyBrowser />
      </div>
    </ScopedErrorBoundary>
  );
};
