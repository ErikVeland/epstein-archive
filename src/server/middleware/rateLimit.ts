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
