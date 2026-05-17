import { expect, test, type APIRequestContext } from '@playwright/test';

const resolveFirstInvestigation = async (request: APIRequestContext) => {
  const response = await request.get('/api/investigations?limit=5');
  if (!response.ok()) return null;
  const payload = await response.json();
  const first = Array.isArray(payload?.data) ? payload.data[0] : null;
  if (!first) return null;
  return String(first.uuid || first.id);
};

test.describe('Investigation deep-link and notebook resilience', () => {
  test('cold-load evidence deep link reconstructs case folder UI', async ({ page, request }) => {
    const investigationId = await resolveFirstInvestigation(request);
    if (!investigationId) {
      expect(true, 'No investigations available').toBeFalsy();
      return;
    }

    const evidenceRes = await request.get(
      `/api/investigations/${investigationId}/evidence-by-type`,
    );
    if (!evidenceRes.ok()) {
      expect(true, 'Investigation evidence endpoint unavailable').toBeFalsy();
      return;
    }
    const evidencePayload = await evidenceRes.json();
    const firstEvidence = Array.isArray(evidencePayload?.all) ? evidencePayload.all[0] : null;
    if (!firstEvidence) {
      expect(true, 'No evidence linked to investigation').toBeFalsy();
      return;
    }
    const evidenceId = String(firstEvidence.investigation_evidence_id || firstEvidence.id);

    await page.goto(`/investigations/${investigationId}/evidence/${evidenceId}`);

    await expect(page.getByRole('button', { name: 'Case Folder' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`[data-evidence-row-id="${evidenceId}"]`)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('#DocumentModal, [role="dialog"][aria-modal="true"]')).toBeVisible({
      timeout: 10000,
    });

    await page.goto(`/investigations/${investigationId}?tab=timeline`);
    await expect(page.getByText('Investigation Timeline')).toBeVisible({ timeout: 10000 });
  });

  test('notebook edits survive save/reload cycle', async ({ page, request }) => {
    const investigationId = await resolveFirstInvestigation(request);
    if (!investigationId) {
      expect(true, 'No investigations available').toBeFalsy();
      return;
    }

    await page.goto(`/investigations/${investigationId}?tab=notebook`);
    const textarea = page.getByTestId('notebook-textarea');
    const visibleFromRoute = await textarea.isVisible({ timeout: 4000 }).catch(() => false);
    if (!visibleFromRoute) {
      await page.getByRole('button', { name: 'Notebook' }).click();
    }
    await expect(textarea).toBeVisible({ timeout: 12000 });

    const text = `Notebook smoke ${Date.now()}`;
    await textarea.fill(text);

    const saveStatus = page.getByTestId('notebook-save-status');
    await expect(saveStatus).toBeVisible();

    await page.waitForTimeout(900);
    await page.reload();
    const textareaAfterReload = page.getByTestId('notebook-textarea');
    const visibleAfterReload = await textareaAfterReload
      .isVisible({ timeout: 4000 })
      .catch(() => false);
    if (!visibleAfterReload) {
      await page.getByRole('button', { name: 'Notebook' }).click();
    }
    await expect(page.getByTestId('notebook-textarea')).toHaveValue(text, { timeout: 12000 });
  });
});
