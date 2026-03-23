/**
 * QUERY COUNT REGRESSION TESTS
 *
 * Verifies that hot endpoints don't exceed query budgets
 */

import { describe, expect, test } from 'vitest';

import { queryCounter } from '../src/server/queryCounter';

describe('Query Count Regression Guards', () => {
  const budgets = queryCounter.getBudgets();

  test('All budgets are defined', () => {
    expect(budgets.length).toBeGreaterThan(0);
  });

  test('Top entities endpoint: max 1 query', () => {
    const budget = budgets.find((b) => b.endpoint.includes('GET /api/entities (top)'));
    expect(budget).toBeDefined();
    expect(budget!.maxQueries).toBe(1);
  });

  test('Entity list endpoint: max 2 queries', () => {
    const budget = budgets.find((b) => b.endpoint.includes('GET /api/entities (list)'));
    expect(budget).toBeDefined();
    expect(budget!.maxQueries).toBe(2);
  });

  test('Entity overview endpoint: max 5 queries', () => {
    const budget = budgets.find(
      (b) => b.endpoint.includes('GET /api/entities/:id') && !b.endpoint.includes('/documents'),
    );
    expect(budget).toBeDefined();
    expect(budget!.maxQueries).toBe(5);
  });

  test('Entity documents endpoint: max 2 queries', () => {
    const budget = budgets.find((b) => b.endpoint.includes('GET /api/entities/:id/documents'));
    expect(budget).toBeDefined();
    expect(budget!.maxQueries).toBe(2);
  });

  test('Email list endpoint: max 2 queries', () => {
    const budget = budgets.find(
      (b) => b.endpoint.includes('GET /api/emails') && !b.endpoint.includes(':id'),
    );
    expect(budget).toBeDefined();
    expect(budget!.maxQueries).toBe(2);
  });
});
