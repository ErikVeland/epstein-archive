const DEAD_AFFORDANCE_LABEL_TOKENS = [
  'coming soon',
  'not implemented',
  'placeholder',
  'todo',
  'start analysis',
];

const isDisabled = (el: Element): boolean => {
  const button = el as HTMLButtonElement;
  return (
    button.disabled === true ||
    el.getAttribute('aria-disabled') === 'true' ||
    el.hasAttribute('disabled')
  );
};

const isExplicitlyGated = (el: Element): boolean => {
  const title = (el.getAttribute('title') || '').toLowerCase();
  const reason = (el.getAttribute('data-gated-reason') || '').toLowerCase();
  const ariaDescription = (el.getAttribute('aria-description') || '').toLowerCase();
  return (
    title.includes('not available') ||
    title.includes('requires') ||
    reason.length > 0 ||
    ariaDescription.includes('not available') ||
    ariaDescription.includes('requires')
  );
};

const looksInteractive = (el: Element): boolean => {
  if (el.tagName === 'BUTTON') return true;
  if (el.tagName === 'A' && !!el.getAttribute('href')) return true;
  const role = el.getAttribute('role');
  if (role === 'button' || role === 'tab' || role === 'link') return true;
  const className = (el.getAttribute('class') || '').toLowerCase();
  return (
    className.includes('cursor-pointer') ||
    className.includes('interactive') ||
    className.includes('btn') ||
    className.includes('button')
  );
};

export const runDevAffordanceAudit = (root: ParentNode = document): void => {
  if (!import.meta.env.DEV) return;

  const candidates = Array.from(
    root.querySelectorAll('button, a, [role="button"], [role="tab"], [role="link"]'),
  );

  candidates.forEach((el) => {
    if (!looksInteractive(el)) return;
    if (isDisabled(el)) return;
    if (isExplicitlyGated(el)) return;

    const text = (el.textContent || '').trim().toLowerCase();
    const hasSuspiciousLabel = DEAD_AFFORDANCE_LABEL_TOKENS.some((token) => text.includes(token));

    const href = (el as HTMLAnchorElement).href || '';
    const isAnchorWithoutDestination =
      el.tagName === 'A' && (!href || href.endsWith('#') || href.startsWith('javascript:'));

    if (hasSuspiciousLabel || isAnchorWithoutDestination) {
      // eslint-disable-next-line no-console
      console.warn('[UI dead affordance audit] interactive affordance requires action or gating', {
        text: text || '(icon-only)',
        element: el,
      });
    }
  });
};
