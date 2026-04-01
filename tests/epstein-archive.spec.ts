import { test, expect } from '@playwright/test';
// SECURITY: Removed unused import of hardcoded peopleData (file deleted)

test.skip(true, 'Legacy UI suite is outdated and superseded by targeted route/golden-path tests');

async function navigateTo(page: any, label: string) {
  const desktopBtn = page.locator(`button:has-text("${label}")`).first();
  if (await desktopBtn.isVisible()) {
    await desktopBtn.click();
    return;
  }
  const mobileToggle = page.locator('button.mobile-menu');
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    // Mobile menu buttons live under .mobile-nav
    const mobileBtn = page.locator(`.mobile-nav button:has-text("${label}")`).first();
    await mobileBtn.click();
    return;
  }
  await page.click(`text=${label}`);
}

test.describe('Epstein Archive - UI and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Basic Navigation', () => {
    test('should load the main page', async ({ page }) => {
      await expect(page).toHaveTitle(/Epstein Files Archive/);
      await expect(page.locator('h1')).toContainText('THE EPSTEIN FILES');
    });

    test('should navigate through all top-level tabs', async ({ page }) => {
      // Subjects
      await navigateTo(page, 'Subjects');
      await expect(page.locator('h2:has-text("Investigation Subjects")').first()).toBeVisible();

      // Search → Evidence Search header inside
      await navigateTo(page, 'Search');
      await expect(page.locator('h2:has-text("Evidence Search")').first()).toBeVisible();

      // Documents
      await navigateTo(page, 'Documents');
      await expect(page.locator('h1:has-text("Document Browser")').first()).toBeVisible();

      // Investigations
      await navigateTo(page, 'Investigations');
      await expect(page.locator('.investigation-workspace')).toBeVisible();

      // Black Book
      await navigateTo(page, 'Black Book');
      await expect(page.locator('text=Black Book').first()).toBeVisible();

      // Timeline
      await navigateTo(page, 'Timeline');
      await expect(page.locator('h2:has-text("Investigation Timeline")').first()).toBeVisible();

      // Media & Articles
      await navigateTo(page, 'Media & Articles');
      await expect(page.locator('button:has-text("Articles")').first()).toBeVisible();

      // Photos
      await navigateTo(page, 'Photos');
      await expect(page.locator('text=Photo').first()).toBeVisible({ timeout: 5000 });

      // Analytics
      await navigateTo(page, 'Analytics');
      await expect(page.locator('h2:has-text("Data Analytics")').first()).toBeVisible();

      // About
      await navigateTo(page, 'About');
      await expect(
        page.locator('h1:has-text("Epstein Archive Investigation Platform")').first(),
      ).toBeVisible();
    });
  });

  test.describe('Red Flag Index', () => {
    test('should display spice ratings on person cards', async ({ page }) => {
      await page.click('button:has-text("Subjects")');

      // Check for Donald Trump (should have 5 peppers)
      const trumpCard = page.locator('text=Donald Trump').first().locator('..').locator('..');
      await expect(trumpCard).toContainText('🌶️🌶️🌶️🌶️🌶️');

      // Check for Ghislaine Maxwell (should have 5 peppers)
      const maxwellCard = page
        .locator('text=Ghislaine Maxwell')
        .first()
        .locator('..')
        .locator('..');
      await expect(maxwellCard).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });

    test('should filter by spice rating in search', async ({ page }) => {
      await navigateTo(page, 'Search');

      // Set minimum spice rating to 4
      await page.selectOption('select >> nth=2', '4'); // Min Spice Rating

      // Should show only highly spicy people
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Donald Trump');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Ghislaine Maxwell');
    });

    test('should sort by spice level', async ({ page }) => {
      await navigateTo(page, 'Search');

      // Sort by spice level
      await page.selectOption('select >> nth=4', 'spice'); // Sort By

      // First result should be Donald Trump (highest spice score)
      const firstResult = page.locator('.bg-gray-800 >> nth=1');
      await expect(firstResult).toContainText('Donald Trump');
      await expect(firstResult).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });
  });

  test.describe('Search Functionality', () => {
    test('should search for people by name', async ({ page }) => {
      await navigateTo(page, 'Search');

      await page.fill(
        'input[placeholder="Search names, contexts, or evidence..."]',
        'Donald Trump',
      );

      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Donald Trump');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('🌶️🌶️🌶️🌶️🌶️');
    });

    test('should search by evidence type', async ({ page }) => {
      await navigateTo(page, 'Search');

      await page.selectOption('select >> nth=1', 'flight_log'); // Evidence Type

      // Should show people with flight log evidence
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('FLIGHT_LOG');
    });

    test('should search by risk level', async ({ page }) => {
      await page.click('button:has-text("Search")');

      await page.selectOption('select >> nth=0', 'HIGH'); // Risk Level

      // Should show only high risk people
      const results = page.locator('.bg-gray-800');
      await expect(results.first()).toContainText('HIGH RISK');
    });

    test('should combine multiple search filters', async ({ page }) => {
      await page.click('button:has-text("Search")');

      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'Clinton');
      await page.selectOption('select >> nth=0', 'HIGH'); // Risk Level
      await page.selectOption('select >> nth=2', '4'); // Min Spice Rating

      // Should show high-risk, spicy Clinton-related results
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('Clinton');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('HIGH RISK');
      await expect(page.locator('.bg-gray-800 >> nth=1')).toContainText('🌶️🌶️🌶️🌶️');
    });
  });

  test.describe('Data Visualization', () => {
    test('should display analytics charts', async ({ page }) => {
      await page.click('button:has-text("Analytics")');

      // Check for chart containers
      await expect(page.locator('text=Risk Level Distribution')).toBeVisible();
      await expect(page.locator('text=Top People by Mentions')).toBeVisible();
      await expect(page.locator('text=Evidence Types')).toBeVisible();
      await expect(page.locator('text=Timeline of Events')).toBeVisible();

      // Check for chart elements
      await expect(page.locator('.recharts-pie')).toBeVisible();
      await expect(page.locator('.recharts-bar')).toBeVisible();
      await expect(page.locator('.recharts-area')).toBeVisible();
    });

    test('should display timeline header', async ({ page }) => {
      await navigateTo(page, 'Timeline');
      await expect(page.locator('h2:has-text("Investigation Timeline")')).toBeVisible();
    });

    test('should open a document and show viewer', async ({ page }) => {
      await navigateTo(page, 'Documents');
      // Click first document card and expect modal viewer header
      await page.click('text=Document Browser'); // ensure section is visible
      const anyCard = page.locator('.bg-gray-900').first();
      if (await anyCard.isVisible()) {
        await anyCard.click();
        await expect(page.locator('h2:has-text("Text Content").visible')).toBeTruthy();
      }
    });
  });

  // Removed deprecated export menu tests; export now lives under Investigation workspace

  test.describe('Data Integrity', () => {
    test('should have valid spice ratings for all people', async ({ page }) => {
      await page.click('button:has-text("Subjects")');

      // Check that all displayed people have valid spice ratings
      const peopleCards = page.locator('.bg-gray-800');
      const count = await peopleCards.count();

      for (let i = 0; i < count; i++) {
        const card = peopleCards.nth(i);
        const text = (await card.textContent()) || '';

        // Should have at least one pepper emoji or "No Spice" text
        const hasPeppers = text.includes('🌶️') || text.includes('No Spice');
        expect(hasPeppers).toBeTruthy();
      }
    });

    test('should have consistent data across views', async ({ page }) => {
      // Get Donald Trump's data from People view
      await page.click('button:has-text("Subjects")');
      const trumpMentions = await page
        .locator('text=Donald Trump')
        .first()
        .locator('..')
        .locator('..')
        .locator('text=/\\d+ mentions/')
        .textContent();

      // Check same data in Search view
      await page.click('button:has-text("Search")');
      await page.fill(
        'input[placeholder="Search names, contexts, or evidence..."]',
        'Donald Trump',
      );
      const searchTrumpMentions = await page
        .locator('.bg-gray-800 >> nth=1')
        .locator('text=/\\d+ mentions/')
        .textContent();

      expect(trumpMentions).toBe(searchTrumpMentions);
    });
  });

  test.describe('Performance', () => {
    test('should load data quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await page.click('button:has-text("Search")');

      // Search for a common term that should return many results
      await page.fill('input[placeholder="Search names, contexts, or evidence..."]', 'president');

      // Should display results quickly
      await expect(page.locator('.bg-gray-800 >> nth=1')).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty search results gracefully', async ({ page }) => {
      await page.click('button:has-text("Search")');

      await page.fill(
        'input[placeholder="Search names, contexts, or evidence..."]',
        'xyznonexistent',
      );

      await expect(page.locator('text=No results found')).toBeVisible();
      await expect(page.locator('text=Try adjusting your search terms')).toBeVisible();
    });

    test('should handle invalid filter combinations', async ({ page }) => {
      await page.click('button:has-text("Evidence Search")');

      // Set conflicting filters (very high spice rating with low risk)
      await page.selectOption('select >> nth=0', 'LOW'); // Risk Level
      await page.selectOption('select >> nth=2', '5'); // Min Spice Rating

      // Should show appropriate message or empty results
      await expect(page.locator('text=results found')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await expect(
        page.locator('input[placeholder="Search names, contexts, or evidence..."]'),
      ).toHaveAttribute('aria-label', /search/i);

      const selects = page.locator('select');
      const count = await selects.count();
      for (let i = 0; i < count; i++) {
        const select = selects.nth(i);
        await expect(select).toHaveAttribute('aria-label', /.*/);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      // Focus the search input directly
      const searchInput = page.locator('input[aria-label="Search names, contexts, or evidence"]');
      await searchInput.focus();

      // Should be able to navigate to search input
      await expect(searchInput).toBeFocused();
    });
  });
});
