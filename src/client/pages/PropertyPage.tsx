import React from 'react';
import PropertyBrowser from '@client/components/PropertyBrowser';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import { Surface } from '@client/design-system/lib';
import styles from './PropertyPage.module.css';

export const PropertyPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <Surface variant="panel" className={styles.pageShell}>
        <PropertyBrowser />
      </Surface>
    </ScopedErrorBoundary>
  );
};
