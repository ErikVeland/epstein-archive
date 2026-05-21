import rateLimit from 'express-rate-limit';

const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).send(options.message);
  },
});

export const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isDevOrTest ? 10000 : 10,
  message: { error: 'Too many analytics requests, please try again later.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (_req, res, _next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).send(options.message);
  },
});

export const mapRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 20,
  message: { error: 'Too many map requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).send(options.message);
  },
});

export const graphRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 10,
  message: { error: 'Too many graph requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).send(options.message);
  },
});

export const annotationWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDevOrTest ? 10000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
});

export const vitalsPostLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevOrTest ? 10000 : 10,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── File-serving / media stream limiters ─────────────────────────────────────
// Media downloads and PDF serving are expensive (I/O, large payloads, thumbnail generation).
// These limits prevent bulk scraping and resource exhaustion from burst requests.

export const mediaStreamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 200,
  message: { error: 'Too many file/media requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const documentFileLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 100,
  message: { error: 'Too many document file requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Export / bulk-data limiters ──────────────────────────────────────────────
// Export endpoints are expensive queries (joins, aggregations) and should be
// aggressively throttled to prevent both scraping and accidental runaway queries.

export const exportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 10,
  message: { error: 'Too many export requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res, _next, options) => {
    res.set('Retry-After', Math.ceil(options.windowMs / 1000).toString());
    res.status(options.statusCode).send(options.message);
  },
});

// ─── Intelligence / AI endpoint limiters ──────────────────────────────────────
// AI calls are expensive (LLM inference, slow external APIs) and must be bounded
// to prevent runaway costs and accidental DDoS-through-AI.

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 30,
  message: { error: 'Too many intelligence requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Document listing limiter ─────────────────────────────────────────────────
// Paginated document listings with optional full-text search can be expensive.
// Separate from file serving to allow independent tuning.

export const documentsListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDevOrTest ? 10000 : 60,
  message: { error: 'Too many document listing requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
