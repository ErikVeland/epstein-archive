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

  for (const [layout, preparePage] of [
    ['desktop', prepareDesktopPage],
    ['mobile', prepareMobilePage],
  ] as const) {
    test(`profile controls and section navigation fit the ${layout} dialog`, async ({ page }) => {
      await page.addInitScript(() => {
        let copiedText = '';
        Object.defineProperty(navigator, 'clipboard', {
          value: {
            writeText: async (text: string) => {
              copiedText = text;
            },
            readText: async () => copiedText,
          },
        });
      });
      await mockHealthyApi(page);
      await mockPeopleEntityApis(page);
      await page.route('**/api/entities/101/share-image', (route) =>
        route.fulfill({
          contentType: 'image/png',
          body: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXuoAAAAASUVORK5CYII=',
            'base64',
          ),
        }),
      );
      await preparePage(page);

      await page.goto('/entity/101');
      const share = page.getByRole('button', { name: 'Share Ada Lovelace' });
      const close = page.getByRole('button', { name: 'Close entity profile' });
      await share.click();
      await page.getByRole('menuitem', { name: 'Copy profile link' }).click({ timeout: 5000 });
      await expect(page.getByText('Profile link copied.')).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        'https://epstein.academy/entity/101',
      );

      await share.focus();
      await page.keyboard.press('Enter');
      const download = page.waitForEvent('download');
      await page.getByRole('menuitem', { name: 'Download image' }).click();
      expect((await download).suggestedFilename()).toBe('epstein-profile-101.png');

      const shareBox = (await share.boundingBox())!;
      const closeBox = (await close.boundingBox())!;
      expect(shareBox.y).toBeCloseTo(closeBox.y, 0);
      expect(shareBox.height).toBeCloseTo(closeBox.height, 0);

      const navigation =
        layout === 'desktop'
          ? page.getByRole('tablist')
          : page.getByTestId('mobile-section-trigger');
      const edges = await navigation.evaluate((bar) => {
        const nav = bar.getBoundingClientRect();
        const content =
          bar.parentElement!.parentElement!.nextElementSibling!.getBoundingClientRect();
        return {
          left: Math.abs(nav.left - content.left),
          right: Math.abs(nav.right - content.right),
          gap: Math.abs(nav.bottom - content.top),
        };
      });
      expect(edges.left).toBeLessThanOrEqual(1);
      expect(edges.right).toBeLessThanOrEqual(1);
      expect(edges.gap).toBeLessThanOrEqual(1);

      if (layout === 'desktop') {
        const actions = page.getByRole('group', { name: 'Profile actions' }).getByRole('button');
        const heights = await actions.evaluateAll((buttons) =>
          buttons.map((button) => button.getBoundingClientRect().height),
        );
        expect(heights).toHaveLength(4);
        expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
      }
    });
  }

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
