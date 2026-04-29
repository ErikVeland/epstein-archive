import React from 'react';
import ScopedErrorBoundary from '@client/components/common/ScopedErrorBoundary';
import FinancialTransactionMapper from '@client/components/visualizations/FinancialTransactionMapper';

export const FinancialPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <FinancialTransactionMapper />
    </ScopedErrorBoundary>
  );
};
