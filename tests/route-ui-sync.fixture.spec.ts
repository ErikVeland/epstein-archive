import { expect, test } from '@playwright/test';
import {
  emailEvidenceDocumentFixture,
  FIXTURE_DOCUMENT_ID,
  FIXTURE_MESSAGE_ID,
  FIXTURE_THREAD_ID,
  mockDocumentApis,
  mockEmailApis,
  mockHealthyApi,
  mockPeopleEntityApis,
  prepareDesktopPage,
  prepareMobilePage,
} from './helpers/routeUiSyncFixtures';

test.describe('Fixture-backed route sync', () => {
  test('people to entity modal close returns to the originating people surface', async ({
    page,
  }) => {
    await mockHealthyApi(page);
    await mockPeopleEntityApis(page);
    await prepareDesktopPage(page);

    await page.goto('/people');
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });

    await page.getByTestId('subject-card').first().click();
    await expect(page).toHaveURL(/\/entity\/101$/);
    await expect(page.getByTestId('evidence-modal')).toBeVisible({ timeout: 20000 });
    await expect(
      page
        .getByTestId('evidence-modal')
        .getByRole('heading', { name: 'Ada Lovelace', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Close entity profile' }).click();
    await expect(page).toHaveURL(/\/people(?:\?|$)/, { timeout: 20000 });
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });
  });

  test('direct entity deep link close leaves the entity route instead of reopening itself', async ({
    page,
  }) => {
    await mockHealthyApi(page);
    await mockPeopleEntityApis(page);
    await prepareDesktopPage(page);

    await page.goto('/entity/101');
    await expect(page.getByTestId('evidence-modal')).toBeVisible({ timeout: 20000 });
    await expect(
      page
        .getByTestId('evidence-modal')
        .getByRole('heading', { name: 'Ada Lovelace', exact: true }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Close entity profile' }).click();
    await expect(page).toHaveURL(/\/people(?:\?|$)/, { timeout: 20000 });
    await expect(page.getByTestId('evidence-modal')).toHaveCount(0);
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });
  });

  test('escape closes direct entity deep link without reopening itself', async ({ page }) => {
    await mockHealthyApi(page);
    await mockPeopleEntityApis(page);
    await prepareDesktopPage(page);

    await page.goto('/entity/101');
    await expect(page.getByTestId('evidence-modal')).toBeVisible({ timeout: 20000 });

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/people(?:\?|$)/, { timeout: 20000 });
    await expect(page.getByTestId('evidence-modal')).toHaveCount(0);
    await expect(page.getByTestId('subject-card').first()).toBeVisible({ timeout: 20000 });
  });

  test('entity lookup failure shows a retry action instead of an empty profile', async ({
    page,
  }) => {
    await mockHealthyApi(page);
    await mockPeopleEntityApis(page);
    await prepareDesktopPage(page);
    await page.route('**/api/entities/101', (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Entity not found' }),
      }),
    );
    await page.goto('/people');
    await page.getByTestId('subject-card').first().click();
    await expect(page.getByRole('heading', { name: 'Unable to load entity' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Try Again' })).toBeVisible();
    await expect(page.getByText('No biographical data available.')).toHaveCount(0);
    await page.unroute('**/api/entities/101');
    await mockPeopleEntityApis(page);
    await page.getByRole('button', { name: 'Try Again' }).click();
    await expect(
      page
        .getByTestId('evidence-modal')
        .getByRole('heading', { name: 'Ada Lovelace', exact: true }),
    ).toBeVisible();
  });

  test('document modal tab sync works deterministically without live data', async ({ page }) => {
    await mockHealthyApi(page);
    await mockDocumentApis(page);
    await prepareDesktopPage(page);

    await page.goto(`/documents/${FIXTURE_DOCUMENT_ID}?modalTab=analysis`);

    const modal = page.locator('#DocumentModal');
    await expect(modal).toBeVisible({ timeout: 20000 });

    const initialBox = await modal.boundingBox();
    expect(initialBox).toBeTruthy();

    await expect(page.getByTestId('document-modal-scroll-region')).toHaveCount(1);

    await expect(page.getByTestId('document-modal-tabpanel-analysis')).toBeVisible();

    await page.getByText('Clean Text').click();
    await expect(page).toHaveURL(/textMode=clean/);

    await page.getByRole('tab', { name: 'Original Document' }).click();
    await expect(page).toHaveURL(/modalTab=pdf/);

    const finalBox = await modal.boundingBox();
    expect(finalBox?.width).toBeGreaterThan(0);
    expect(Math.abs((finalBox?.width || 0) - (initialBox?.width || 0))).toBeLessThan(4);
  });

  test('mobile email evidence close returns to the originating thread and message', async ({
    page,
  }) => {
    await mockHealthyApi(page);
    await mockEmailApis(page);
    await mockDocumentApis(page, {
      id: FIXTURE_MESSAGE_ID,
      detail: emailEvidenceDocumentFixture,
    });
    await prepareMobilePage(page);

    await page.goto(
      `/emails?mailboxId=all&threadId=${FIXTURE_THREAD_ID}&messageId=${FIXTURE_MESSAGE_ID}&pane=messages`,
    );

    const evidenceButton = page.getByRole('button', { name: 'Evidence' });
    await expect(evidenceButton).toBeVisible({ timeout: 20000 });
    await evidenceButton.click();
    await expect(page).toHaveURL(new RegExp(`/documents/${FIXTURE_MESSAGE_ID}(?:\\?|$)`), {
      timeout: 20000,
    });

    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(
        `/emails\\?[^#]*threadId=${FIXTURE_THREAD_ID}[^#]*messageId=${FIXTURE_MESSAGE_ID}`,
      ),
      { timeout: 20000 },
    );
    await expect(page.getByRole('button', { name: 'Evidence' })).toBeVisible({ timeout: 20000 });
  });
});
