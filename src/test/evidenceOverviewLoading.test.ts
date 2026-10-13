// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EvidenceOverviewTab } from '../client/components/common/subcomponents/EvidenceOverviewTab';

vi.mock('../client/components/common/FlagButton', () => ({ FlagButton: () => null }));
vi.mock('../client/components/entities/cards/SignalPanel', () => ({ SignalPanel: () => null }));
vi.mock('../client/components/common/subcomponents/EvidenceCard', () => ({
  EvidenceCard: ({ document }: { document: { contentPreview: string } }) =>
    React.createElement('article', null, document.contentPreview),
}));

const props: React.ComponentProps<typeof EvidenceOverviewTab> = {
  entity: { id: '3', fullName: 'Fixture entity', bio: 'Fixture biography' },
  loading: false,
  forensicData: {
    ladder: { level: 'L2', description: 'Fixture analysis' },
    drivers: [],
    signals: { exposure: 0, connectivity: 0, corroboration: 0 },
  },
  totalDocs: 0,
  mediaItems: [],
  overviewEvidenceTypesCount: 0,
  overviewSignificantPassages: [],
  evidenceStatus: 'pending',
  onRetryEvidence: vi.fn(),
  openDocumentFromEvidence: vi.fn(),
  navigateFromModal: vi.fn(),
  blackBookSectionRef: { current: null },
};

const render = (updates: Partial<typeof props> = {}) =>
  renderToStaticMarkup(React.createElement(EvidenceOverviewTab, { ...props, ...updates }));

const emptyMessage = 'No high-significance evidence passages currently extracted';

describe('entity overview evidence states', () => {
  it('keeps the profile visible while evidence is pending, without claiming there is none', () => {
    const html = render();
    expect(html).toContain('Fixture biography');
    expect(html).toContain('Loading evidence passages');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain(emptyMessage);
  });

  it('only reports an empty result after a successful evidence request', () => {
    expect(render({ evidenceStatus: 'success' })).toContain(emptyMessage);
    expect(render({ evidenceStatus: 'error' })).not.toContain(emptyMessage);
  });

  it('shows passages already available in the profile during a summary request', () => {
    const html = render({
      overviewSignificantPassages: [{ documentId: '42', passage: 'Fixture passage' }],
    });
    expect(html).toContain('Fixture passage');
    expect(html).not.toContain('Loading evidence passages');
    expect(html).not.toContain(emptyMessage);
  });

  it('reports failures and lets the user retry the evidence request', async () => {
    const onRetryEvidence = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);
    const actEnvironment = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    try {
      await act(async () => {
        root.render(
          React.createElement(EvidenceOverviewTab, {
            ...props,
            evidenceStatus: 'error',
            onRetryEvidence,
          }),
        );
      });
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'Unable to load evidence passages',
      );
      const retry = Array.from(container.querySelectorAll('button')).find(
        (button) => button.textContent === 'Try again',
      );
      expect(retry).toBeDefined();
      await act(async () => retry?.click());
      expect(onRetryEvidence).toHaveBeenCalledOnce();
    } finally {
      await act(async () => root.unmount());
      delete actEnvironment.IS_REACT_ACT_ENVIRONMENT;
    }
  });
});
