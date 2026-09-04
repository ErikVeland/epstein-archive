import { expect, test } from '@playwright/test';

const apiPort = Number(process.env.PW_API_PORT || 3312);
const API_BASE = process.env.PW_API_BASE_URL || `http://127.0.0.1:${apiPort}`;
test.describe('Investigation access policy', () => {
  test('keeps public case discovery readable without authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/investigations?limit=1`);
    expect(response.ok()).toBeTruthy();
  });

  test('rejects case creation without authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/investigations`, {
      data: { title: 'Unauthorized test case' },
    });
    expect(response.status()).toBe(401);
  });

  test('keeps guest sessions read-only', async ({ request }) => {
    const guestResponse = await request.post(`${API_BASE}/api/auth/guest`);
    expect(guestResponse.ok()).toBeTruthy();
    const guest = await guestResponse.json();
    const response = await request.post(`${API_BASE}/api/investigations`, {
      headers: { Authorization: `Bearer ${guest.accessToken}` },
      data: { title: 'Guest write test case' },
    });
    expect(response.status()).toBe(403);
  });
});
