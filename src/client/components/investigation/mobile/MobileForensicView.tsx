import { useState } from 'react';
import { Investigation } from '../../../types/investigation';
import { MultiSourceCorrelationEngine } from '../MultiSourceCorrelationEngine';
import ForensicReportGenerator from '../ForensicReportGenerator';
import FinancialTransactionMapper from '../../visualizations/FinancialTransactionMapper';
import { CommunicationAnalysis } from '../CommunicationAnalysis';
import styles from './MobileForensicView.module.css';

type ForensicTab = 'documents' | 'correlation' | 'financial' | 'reports' | 'communication';

interface Tab {
  id: ForensicTab;
  label: string;
}

const TABS: Tab[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'correlation', label: 'Correlation' },
  { id: 'financial', label: 'Financial' },
  { id: 'reports', label: 'Reports' },
  { id: 'communication', label: 'Communication' },
];

interface MobileForensicViewProps {
  investigation: Investigation;
}

export function MobileForensicView({ investigation }: MobileForensicViewProps) {
  const [activeTab, setActiveTab] = useState<ForensicTab>('documents');

  const renderContent = () => {
    switch (activeTab) {
      case 'documents':
        return <div className={styles.placeholder}>Select a document to analyze</div>;
      case 'correlation':
        return <MultiSourceCorrelationEngine mobileMode />;
      case 'financial':
        return <FinancialTransactionMapper investigationId={investigation.id} />;
      case 'reports':
        return (
          <ForensicReportGenerator
            investigationId={
              typeof investigation.id === 'string' ? Number(investigation.id) : investigation.id
            }
            mobileMode
          />
        );
      case 'communication':
        return <CommunicationAnalysis investigation={investigation} evidence={[]} mobileMode />;
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab}${activeTab === tab.id ? ` ${styles.tabActive}` : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content} role="tabpanel">
        {renderContent()}
      </div>
    </div>
  );
}
