# Code Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all issues identified in the full code review of Epstein Archive v17.0.0.

**Architecture:** Targeted fixes across server middleware, auth, routes, and client — no structural refactors, just the 10 high-priority items that were clearly wrong.

**Tech Stack:** Express.js, bcryptjs, jsonwebtoken, React 18, TypeScript

---

### Task 1: Mount dead middleware (pgSaturationShed + retryStormDetector)

**Files:**

- Modify: `src/app.ts` — add imports + mount after rate limiter

- [ ] Add imports for both middleware to app.ts imports block
- [ ] Mount `pgSaturationShed` after rate limiter (section 3), before parsing
- [ ] Mount `retryStormDetector` right after `pgSaturationShed`
- [ ] Verify: `grep -n 'pgSaturationShed\|retryStormDetector' src/app.ts` shows both mounted

---

### Task 2: Fix bcrypt.hashSync → async + standardize cost factor

**Files:**

- Modify: `src/server/routes/users.ts:69,122` — replace hashSync with async hash, unify cost 12

- [ ] Add `const BCRYPT_COST = 12` constant at top of users.ts
- [ ] Replace `bcrypt.hashSync(password, 12)` with `await bcrypt.hash(password, BCRYPT_COST)`
- [ ] Replace `bcrypt.hashSync(password, 10)` with `await bcrypt.hash(password, BCRYPT_COST)`

---

### Task 3: Fix duplicate comment + type safety in auth/middleware.ts

**Files:**

- Modify: `src/server/auth/middleware.ts:3-4,38` — remove dup comment, type jwt.verify properly

- [ ] Remove the duplicate `// Extend Request locally...` comment on line 4
- [ ] Add typed `JwtPayload` interface above `verifyToken`
- [ ] Replace `jwt.verify(token, ACTUAL_SECRET) as any` with typed assertion

---

### Task 4: Fix req: any → AuthRequest in users.ts

**Files:**

- Modify: `src/server/routes/users.ts:44,63,96` — use AuthRequest import

- [ ] Import `AuthRequest` from `../auth/middleware.js`
- [ ] Replace all `req: any` with `req: AuthRequest` in the three handlers

---

### Task 5: Delete dead emails-optimized.ts

**Files:**

- Delete: `src/server/routes/emails-optimized.ts`

- [ ] Confirm it's not imported anywhere: `grep -r 'emails-optimized' src/`
- [ ] Delete the file

---

### Task 6: Remove no-op validateDocumentUpload from validation.ts

**Files:**

- Modify: `src/server/middleware/validation.ts:89-97,114-119`

- [ ] Delete `validateDocumentUpload` function (lines 89–97)
- [ ] Remove `validateDocumentUpload` from the `inputValidationMiddleware` array

---

### Task 7: Cap the in-memory cache in apiClient.ts

**Files:**

- Modify: `src/client/services/apiClient.ts:52,68-74` — add MAX_CACHE_SIZE eviction

- [ ] Add `const MAX_CACHE_SIZE = 200` constant
- [ ] In `setCachedData`, if `cache.size >= MAX_CACHE_SIZE`, evict the oldest entry before inserting

---

### Task 8: Expose isLoading from AuthContext

**Files:**

- Modify: `src/client/contexts/AuthContext.tsx`

- [ ] Add `isLoading: boolean` to `AuthContextType` interface
- [ ] Change `const [, setIsLoading]` to `const [isLoading, setIsLoading]`
- [ ] Add `isLoading` to the context Provider value

---

### Task 9: Move OCR junk labels to a config constant

**Files:**

- Modify: `src/server/routes/graphRoutes.ts` — extract string literals to a named set

- [ ] Extract all OCR-artifact strings into a `const OCR_JUNK_FRAGMENTS` Set at top of file
- [ ] Rewrite the multi-block `v.includes(...)` chain to iterate over the set

---

### Task 10: Type-check pass

- [ ] Run `pnpm type-check` — must pass with 0 errors
- [ ] Run `pnpm lint:fix` — auto-fix any style issues
- [ ] Commit all changes
