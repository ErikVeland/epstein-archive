import { test, expect } from '@playwright/test';

/**
 * Data Validation Tests - API-Based
 *
 * These tests validate data integrity by testing actual API responses,
 * NOT hardcoded fixtures. This ensures we're testing real production behavior.
 *
 * SECURITY: Previous version imported synthetic data - this has been removed.
 */

const baseUrl = 'http://localhost:3012';

test.describe('Data Validation Tests (API-Based)', () => {
  test('entities should have valid structure', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/entities?limit=50`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    // Validate structure of returned entities
    for (const entity of body.data) {
      // Required fields
      expect(entity.id).toBeDefined();
      expect(typeof entity.name === 'string' || typeof entity.fullName === 'string').toBe(true);

      // Red flag rating should be in valid range if present
      if (entity.red_flag_rating !== undefined) {
        expect(entity.red_flag_rating).toBeGreaterThanOrEqual(0);
        expect(entity.red_flag_rating).toBeLessThanOrEqual(5);
      }

      // Evidence types should be array if present
      if (entity.evidence_types !== undefined) {
        expect(Array.isArray(entity.evidence_types)).toBe(true);
      }
    }
  });

  test('entities should not contain junk names', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/entities?limit=100`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    // Define patterns that indicate NLP extraction failures
    const junkPatterns = [
      /^Professor Of /i,
      /^President .+ To$/i,
      /^.+ As$/i,
      /^Dr\. [A-Z][a-z]+ [A-Z]$/i, // Truncated names
      /^\d+$/, // Pure numbers
      /^[A-Z]{1,2}$/, // Single letters
    ];

    for (const entity of body.data) {
      const name = entity.name || entity.fullName || '';

      for (const pattern of junkPatterns) {
        expect(pattern.test(name), `Entity "${name}" matches junk pattern ${pattern}`).toBe(false);
      }
    }
  });

  test('likelihood scores should be valid values', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/entities?limit=50`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const validScores = ['HIGH', 'MEDIUM', 'LOW', null, undefined];

    for (const entity of body.data) {
      if (entity.likelihood_score !== undefined && entity.likelihood_score !== null) {
        expect(validScores).toContain(entity.likelihood_score);
      }
    }
  });

  test('mention counts should be non-negative', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/entities?limit=50`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();

    for (const entity of body.data) {
      if (entity.mentions !== undefined) {
        expect(entity.mentions).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('documents should have valid structure', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/documents?limit=50`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);

    for (const doc of body.data) {
      expect(doc.id).toBeDefined();

      // File name should exist
      if (doc.fileName !== undefined) {
        expect(typeof doc.fileName === 'string').toBe(true);
        expect(doc.fileName.length).toBeGreaterThan(0);
      }
    }
  });

  test('search should return results for known terms', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/search?q=Epstein`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.entities).toBeDefined();
    expect(body.documents).toBeDefined();

    // Epstein should definitely return results
    expect(body.entities.length > 0 || body.documents.length > 0).toBe(true);
  });

  test('statistics should contain expected fields', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/stats`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.totalEntities).toBeDefined();
    expect(body.totalDocuments).toBeDefined();

    // Counts should be reasonable for a populated database
    if (typeof body.totalEntities === 'number') {
      expect(body.totalEntities).toBeGreaterThan(0);
    }
    if (typeof body.totalDocuments === 'number') {
      expect(body.totalDocuments).toBeGreaterThan(0);
    }
  });

  test('entity IDs should be unique in paginated results', async ({ request }) => {
    const response = await request.get(`${baseUrl}/api/entities?limit=100`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const ids = body.data.map((e: Record<string, unknown>) => e.id);
    const uniqueIds = new Set(ids);

    expect(ids.length).toBe(uniqueIds.size);
  });
});
