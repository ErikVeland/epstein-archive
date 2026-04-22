import React from 'react';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';
import FinancialTransactionMapper from '../components/visualizations/FinancialTransactionMapper';

export const FinancialPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <FinancialTransactionMapper />
    </ScopedErrorBoundary>
  );
};
