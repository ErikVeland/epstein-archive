import { expect, test, type APIRequestContext } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const useProductionBaseUrl = process.env.PW_USE_PROD_BASE_URL === '1';
const API_BASE = useProductionBaseUrl
  ? 'https://epstein.academy/api'
  : `${process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`}/api`;

async function resolveFirstInvestigation(request: APIRequestContext): Promise<string | null> {
  const response = await request.get(`${API_BASE}/investigations?limit=5`);
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  return first ? String(first.uuid || first.id) : null;
}

const UNTESTED_TABS = [
  'board',
  'iceberg',
  'intelligence',
  'overview',
  'activity',
  'evidence',
  'hypotheses',
  'financial',
  'team',
  'analytics',
  'forensic',
] as const;

test.describe('Investigation workspace — tab smoke tests', () => {
  for (const tab of UNTESTED_TABS) {
    test(`${tab} tab renders without crashing`, async ({ page, request, isMobile }) => {
      test.skip(isMobile, 'Desktop workspace smoke — mobile uses a different shell');
      const investigationId = await resolveFirstInvestigation(request);
      if (!investigationId) {
        expect(true, 'No investigations available — skipping smoke test').toBeFalsy();
        return;
      }

      await page.addInitScript(() => {
        window.localStorage.setItem('firstRunOnboardingCompleted', 'true');
        window.localStorage.setItem('board_onboarding_seen', 'true');
        window.localStorage.setItem('hasSeenInvestigationOnboarding', 'true');
      });

      await page.goto(`/investigations/${investigationId}?tab=${tab}`);

      // The "Investigation Board" nav button is always present once the workspace mounts —
      // its visibility confirms the SPA routed correctly and the workspace rendered.
      await expect(page.getByRole('button', { name: 'Investigation Board' })).toBeVisible({
        timeout: 15000,
      });

      // No uncaught React error boundary
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    });
  }
});
