# Runbook: Missing Source Asset

**Severity:** P2/P3
**Detection:** 404 on `/api/documents/:id/file` or `/api/media/images/:id/file`, or "file not found" in application logs

## Immediate Triage

For a citation-addressed scan, keep the `assetSha256` query parameter from the citation URL. A
pinned request never falls back to a different local variant or remote file.

1. **Verify asset metadata**

   ```sql
   SELECT id, file_name, file_path, metadata_json->>'source_original_url'
   FROM documents WHERE id = <id>;
   ```

   - Check if `file_path` contains a URL instead of a local path
   - Check if `file_name` exists at the resolved path

2. **Verify file on disk**

   ```bash
   # Resolve the expected path based on DB value
   tsx -e "const { resolveMediaPath } = require('./src/server/utils/pathResolver'); console.log(resolveMediaPath('<file_path>'));"
   ls -la <resolved_path>
   ```

   If the path is a symlink, its resolved target must be inside `data/` or the configured
   `RAW_CORPUS_BASE_PATH`. Configure the raw evidence volume explicitly; do not broaden the allowed
   root beyond the corpus storage boundary.

   Verify pinned bytes before changing any path:

   ```bash
   shasum -a 256 <resolved_path>
   ```

   A pinned endpoint returns `409` when the bytes do not match the requested SHA-256. It returns
   `404` when the asset is not linked to that document or is outside an approved local root.

3. **Check data directory structure**
   ```bash
   ls data/public/
   ls data/ | head -20
   ```

## Restoration Options

1. **Asset exists but path is wrong**
   - Run provenance backfill to update file paths:
     ```bash
     pnpm provenance:backfill
     ```

2. **Asset truly missing from disk**
   - Check if it exists in the raw corpus backup

   ```bash
   # Search in RAW_CORPUS_BASE_PATH
   find "$RAW_CORPUS_BASE_PATH" -name "<file_name>" 2>/dev/null
   ```

   - Restore the exact hash-matching asset from backup. Do not replace bytes behind a published
     citation with a different scan.

3. **Asset never ingested (document record without file)**
   - Re-run ingestion for this document:

   ```bash
   DOCUMENT_ID=<id> pnpm pipeline:backfill
   ```

4. **Remote fallback** (dev/staging only)
   - Enable remote proxy to fetch from justice.gov:
   ```env
   PUBLIC_REMOTE_FILE_FALLBACK=true
   ```
   (⚠️ Production always denies remote fallback)

## Prevention

- Ensure `data/` is included in backup rotation
- Run `pnpm verify:asset-graph` weekly to detect missing assets
- Add missing asset alerting via `scripts/data_integrity_audit.ts`

## Escalation

- If > 1% of assets are missing, notify Data Platform team immediately
- Check disk space: `df -h /data`
- Check recent filesystem changes: `ls -la /data/ — sort=time | head -20`
