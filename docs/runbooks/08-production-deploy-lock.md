# Production Deploy Lock

**Detection:** `deploy.sh` fails with "Another production deploy appears to be active."

**Purpose:** prevent GitHub Actions and manual deploys from mutating the production checkout at the same time.

## First Response

1. Check whether a deploy is currently running.

   ```bash
   gh run list --workflow "Production Deploy" --limit 5
   ```

2. Inspect the remote lock owner.

   ```bash
   ssh svc_epstein@<prod-host> 'cd /home/svc_epstein/epstein-archive && ls -la .deploy.lock && cat .deploy.lock/owner && cat .deploy.lock/started_at'
   ```

3. If GitHub Actions or a manual shell is still deploying, wait. Do not remove the lock.

## Clearing A Stale Lock

Only clear the lock after confirming no production deploy is running.

```bash
ssh svc_epstein@<prod-host> 'cd /home/svc_epstein/epstein-archive && rm -rf .deploy.lock'
```

Then rerun the deploy through the normal path.

## Notes

- `deploy.sh` removes stale locks automatically after `EPSTEIN_DEPLOY_LOCK_TTL_SECONDS` seconds. The default is four hours.
- The lock token prevents one deploy from deleting another deploy's active lock during normal exit cleanup.
- `git clean` preserves `.deploy.lock` during DB and code phases.
