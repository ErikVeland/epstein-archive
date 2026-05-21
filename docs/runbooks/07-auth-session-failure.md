# Runbook: Auth / Session Failure

**Severity:** P1
**Detection:** Users unable to log in, session errors in logs, JWT verification failures, or 401 storms

## Immediate Triage

1. **Check auth middleware**

   ```bash
   # Verify JWT secret is set and consistent
   echo ${#JWT_SECRET}                     # should be > 32 chars
   grep 'JWT_SECRET\|SESSION_SECRET' .env   # verify both are set
   ```

2. **Check auth rate limiters**

   ```bash
   # Are auth endpoints being rate-limited?
   curl -sI -X POST https://archive.example.com/api/auth/login | grep -i ratelimit
   ```

3. **Check session store**
   ```sql
   -- If using DB-backed sessions
   SELECT COUNT(*) FROM sessions WHERE expiry > NOW();
   SELECT pg_size_pretty(pg_total_relation_size('sessions'));
   ```

## JWT Failure Resolution

1. **Check token expiry**

   ```typescript
   // Decode token without verification for inspection
   const claims = JSON.parse(atob(token.split('.')[1]));
   console.log('exp:', new Date(claims.exp * 1000));
   console.log('iat:', new Date(claims.iat * 1000));
   ```

2. **Verify JWT secret rotation**

   ```bash
   # Check if secret was recently changed
   git log --oneline --all -- .env* | head -5
   ```

3. **Regenerate tokens** (admin only)
   ```bash
   # If all sessions are invalidated
   tsx scripts/rotate_jwt_secret.ts
   ```

## Rate Limiting Issues

1. **Identify locked-out users**

   ```sql
   -- Check failed auth attempts
   SELECT ip_address, COUNT(*), MAX(created_at)
   FROM auth_attempts
   WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY ip_address
   ORDER BY COUNT(*) DESC;
   ```

2. **Clear rate limit for specific user/IP**
   - Reset the rate limiter store (memory or Redis)
   - Or increase limit temporarily: `AUTH_RATE_LIMIT_MAX=100`

## CSRF / Origin Failure

1. **Check origin header**

   ```bash
   curl -s -I -H "Origin: https://archive.example.com" https://archive.example.com/api/auth/refresh
   ```

2. **Verify APP_URL matches**

   ```bash
   echo $APP_URL
   grep 'APP_URL' .env
   ```

3. **Check csrfOriginCheck.ts logs**
   ```bash
   grep -i 'csrf' /var/log/app/auth.log
   ```

## Session Store Issues

1. **Check session table health**

   ```sql
   SELECT COUNT(*), MIN(expiry), MAX(expiry) FROM sessions;
   -- Clean expired sessions
   DELETE FROM sessions WHERE expiry < NOW();
   ```

2. **Check session deserialization errors**
   ```bash
   grep -i 'session\|deserialize\|verify' /var/log/app/error.log
   ```

## Emergency Access

If auth system is completely down:

1. **Issue time-limited admin token**

   ```bash
   # Generate a one-time bypass token (requires direct DB access)
   tsx scripts/emergency_access_token.ts --expires-in 30m
   ```

2. **Disable auth for specific IPs** (dev/staging only)
   ```env
   AUTH_BYPASS_IPS=10.0.0.1,10.0.0.2
   ```
   ⚠️ Never use this in production

## Post-Mortem

- Check if JWT secret needs rotation
- Verify all auth middleware is tested in CI
- Add alerting for auth failure rate > 5%
- Review rate limit thresholds against legitimate usage patterns
