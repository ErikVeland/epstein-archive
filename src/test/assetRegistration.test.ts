import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../server/db/connection.js', () => ({ getApiPool: () => ({ query }) }));
import { AssetService } from '../server/services/assetService.js';
const asset = {
  storagePath: '/source/duplicate.pdf',
  sha256: 'a'.repeat(64),
  mimeType: 'application/pdf',
  fileSize: 100,
};
describe('asset registration under a duplicate hash', () => {
  beforeEach(() => query.mockReset());
  it('uses the existing immutable asset after a competing insert wins', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ id: 77 }] });
    await expect(AssetService.registerAsset(asset)).resolves.toBe(77);
    expect(query.mock.calls[0][0]).toContain('DO NOTHING');
    expect(query.mock.calls[1][1]).toEqual([asset.sha256]);
  });
  it('reports a conflict that cannot resolve to an existing asset', async () => {
    query.mockResolvedValue({ rows: [] });
    await expect(AssetService.registerAsset(asset)).rejects.toThrow('could not be resolved');
  });
});
