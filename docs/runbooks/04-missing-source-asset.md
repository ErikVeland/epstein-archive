# Runbook: Missing Source Asset

**Severity:** P2/P3
**Detection:** 404 on `/api/documents/:id/file` or `/api/media/images/:id/file`, or "file not found" in application logs

## Immediate Triage

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

   - Copy from backup: `cp <backup_path> data/public/<dataset>/`

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
