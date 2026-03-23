import React from 'react';

export function PropertyBrowserStyles(): React.ReactElement {
  return (
    <style>{`
      .property-browser {
        padding: 20px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .browser-header {
        margin-bottom: 24px;
      }

      .header-content h1 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 1.75rem;
        margin: 0 0 8px 0;
      }

      .subtitle {
        color: var(--text-secondary, #888);
        margin: 0;
      }

      .stats-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
        margin-top: 20px;
      }

      .stat-card {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .stat-card.flagged {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
      }

      .stat-label {
        font-size: 0.85rem;
        color: var(--text-secondary, #888);
      }

      .view-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--border-color, #2a2a4a);
        padding-bottom: 12px;
      }

      .tab {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: transparent;
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 8px;
        color: var(--text-secondary, #888);
        cursor: pointer;
        transition: all 0.2s;
      }

      .tab:hover {
        background: var(--card-bg, #1a1a2e);
        color: var(--text-primary, #fff);
      }

      .tab.active {
        background: var(--primary-color, #6366f1);
        border-color: var(--primary-color, #6366f1);
        color: #fff;
      }

      .property-filters {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
      }

      .filter-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: flex-end;
      }

      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .filter-group label {
        font-size: 0.85rem;
        color: var(--text-secondary, #888);
      }

      .filter-group.checkbox {
        flex-direction: row;
        align-items: center;
      }

      .filter-group.checkbox label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .filter-input, .filter-select {
        background: var(--bg-secondary, #0a0a1a);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--text-primary, #fff);
        min-width: 200px;
      }

      .filter-input.small {
        min-width: 120px;
      }

      .property-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }

      .property-list-section {
        padding-top: 12px;
      }

      .property-card {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 12px;
        padding: 16px;
        position: relative;
        transition: all 0.2s;
      }

      .property-card:hover {
        border-color: var(--primary-color, #6366f1);
        transform: translateY(-2px);
      }

      .property-card.flagged {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.05);
      }

      .associate-badge {
        position: absolute;
        top: -8px;
        right: 12px;
        background: #f59e0b;
        color: #000;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 4px 8px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .property-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .property-header h4 {
        margin: 0;
        font-size: 1rem;
        flex: 1;
      }

      .property-value {
        font-weight: 700;
        color: #10b981;
        white-space: nowrap;
        margin-left: 12px;
      }

      .property-address {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary, #888);
        font-size: 0.9rem;
        margin-bottom: 12px;
      }

      .property-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 0.85rem;
        margin-bottom: 12px;
      }

      .property-values {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color, #2a2a4a);
      }

      .property-values .label {
        display: block;
        font-size: 0.75rem;
        color: var(--text-secondary, #888);
      }

      .property-values .value {
        font-weight: 600;
      }

      .associate-link {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color, #2a2a4a);
        color: var(--primary-color, #6366f1);
        text-decoration: none;
        font-size: 0.9rem;
      }

      .associate-link:hover {
        text-decoration: underline;
      }

      .pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        margin-top: 24px;
      }

      .page-btn {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--text-primary, #fff);
        cursor: pointer;
      }

      .page-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .page-info {
        color: var(--text-secondary, #888);
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 60px;
        color: var(--text-secondary, #888);
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Associates View */
      .associates-header {
        margin-bottom: 24px;
      }

      .associates-header h3 {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #f59e0b;
      }

      .associates-description {
        color: var(--text-secondary, #888);
      }

      .associates-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
        gap: 16px;
      }

      .associate-property-card {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid #f59e0b;
        border-radius: 12px;
        overflow: hidden;
      }

      .associate-info {
        background: rgba(245, 158, 11, 0.15);
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .associate-name {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        color: #f59e0b;
      }

      .view-profile-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.85rem;
        color: var(--text-secondary, #888);
        text-decoration: none;
      }

      .view-profile-btn:hover {
        color: var(--primary-color, #6366f1);
      }

      .property-info {
        padding: 16px;
      }

      .property-info h4 {
        margin: 0 0 8px 0;
      }

      .property-info .address {
        color: var(--text-secondary, #888);
        margin: 0 0 12px 0;
        font-size: 0.9rem;
      }

      .value-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .total-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #10b981;
      }

      .property-type {
        background: var(--bg-secondary, #0a0a1a);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.85rem;
      }

      /* Analytics View */
      .analytics-section {
        background: var(--card-bg, #1a1a2e);
        border: 1px solid var(--border-color, #2a2a4a);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .analytics-section h3 {
        margin: 0 0 16px 0;
      }

      .value-chart {
        display: flex;
        align-items: flex-end;
        gap: 12px;
        height: 200px;
        padding-top: 20px;
      }

      .chart-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        height: 100%;
      }

      .bar-fill {
        width: 100%;
        background: linear-gradient(180deg, var(--primary-color, #6366f1), #818cf8);
        border-radius: 4px 4px 0 0;
        min-height: 4px;
        margin-top: auto;
      }

      .bar-label {
        font-size: 0.7rem;
        color: var(--text-secondary, #888);
        margin-top: 8px;
        text-align: center;
      }

      .bar-count {
        font-size: 0.75rem;
        font-weight: 600;
      }

      .top-owners-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .owner-row {
        display: grid;
        grid-template-columns: 40px 1fr auto auto;
        gap: 16px;
        align-items: center;
        padding: 12px;
        background: var(--bg-secondary, #0a0a1a);
        border-radius: 8px;
      }

      .rank {
        font-weight: 700;
        color: var(--primary-color, #6366f1);
      }

      .owner-name {
        font-weight: 500;
      }

      .property-count {
        color: var(--text-secondary, #888);
        font-size: 0.9rem;
      }

      .type-breakdown {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .type-item {
        display: grid;
        grid-template-columns: 150px 1fr 80px;
        gap: 12px;
        align-items: center;
      }

      .type-name {
        font-size: 0.9rem;
      }

      .type-bar {
        height: 8px;
        background: var(--bg-secondary, #0a0a1a);
        border-radius: 4px;
        overflow: hidden;
      }

      .type-fill {
        height: 100%;
        background: var(--primary-color, #6366f1);
        border-radius: 4px;
      }

      .type-count {
        text-align: right;
        font-size: 0.9rem;
        color: var(--text-secondary, #888);
      }

      @media (max-width: 768px) {
        .filter-row {
          flex-direction: column;
        }

        .filter-input, .filter-select {
          min-width: 100%;
        }

        .stats-summary {
          grid-template-columns: repeat(2, 1fr);
        }

        .property-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}
