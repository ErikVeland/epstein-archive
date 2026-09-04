export type InvestigationProductEvent =
  | 'investigation_list_loaded'
  | 'investigation_case_opened'
  | 'investigation_create_started'
  | 'investigation_created'
  | 'investigation_view_opened'
  | 'investigation_evidence_added'
  | 'investigation_export_completed';

type EventMetadata = Record<string, string | number | boolean>;

const SESSION_KEY = 'investigation_product_session_id';

const getSessionId = () => {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, next);
  return next;
};

export const trackInvestigationEvent = (
  event: InvestigationProductEvent,
  options: { caseId?: string; metadata?: EventMetadata } = {},
) => {
  try {
    const payload = {
      event,
      sessionId: getSessionId(),
      route: window.location.pathname,
      caseId: options.caseId,
      metadata: options.metadata,
      timestamp: Date.now(),
    };
    window.dispatchEvent(new CustomEvent('investigation:product-event', { detail: payload }));
    void fetch('/api/product-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Product telemetry must never block the investigation workflow.
  }
};
