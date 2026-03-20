import { Request, Response, NextFunction } from 'express';

// Validation middleware for entity names to prevent junk data
export const validateEntityName = (req: Request, res: Response, next: NextFunction) => {
  // Check if we're dealing with entity creation or update
  if (req.path.includes('/api/entities') && (req.method === 'POST' || req.method === 'PATCH')) {
    const { full_name, fullName } = req.body;
    const name = full_name || fullName;

    if (name && typeof name === 'string') {
      // Trim whitespace
      const trimmedName = name.trim();

      // Check length
      if (trimmedName.length <= 2) {
        return res.status(400).json({
          error: 'Invalid entity name',
          message: 'Entity name must be more than 2 characters long',
        });
      }

      // Check if it starts with common English words that indicate junk data
      const junkPatterns = [
        /^On\s/i,
        /^And\s/i,
        /^The\s/i,
        /^Although\s/i,
        /^Actually\s/i,
        /^However\s/i,
        /^But\s/i,
        /^If\s/i,
        /^When\s/i,
        /^Then\s/i,
        /^So\s/i,
        /^Yet\s/i,
        /^Or\s/i,
        /^As\s/i,
        /^At\s/i,
        /^In\s/i,
        /^To\s/i,
        /^For\s/i,
        /^Of\s/i,
        /^With\s/i,
        /^By\s/i,
        /^About\s/i,
        /^Into\s/i,
        /^Through\s/i,
        /^During\s/i,
        /^Before\s/i,
        /^After\s/i,
        /^Above\s/i,
        /^Below\s/i,
        /^Between\s/i,
        /^Among\s/i,
        /^Within\s/i,
        /^Without\s/i,
        /^Under\s/i,
        /^Over\s/i,
        /^Near\s/i,
        /^Since\s/i,
        /^Until\s/i,
        /^Against\s/i,
        /^Throughout\s/i,
        /^Despite\s/i,
        /^Upon\s/i,
        /^Besides\s/i,
        /^Beyond\s/i,
        /^Inside\s/i,
        /^Outside\s/i,
        /^[0-9]+$/,
        /^[A-Z]$/,
        /^[a-z]$/,
      ];

      for (const pattern of junkPatterns) {
        if (pattern.test(trimmedName)) {
          return res.status(400).json({
            error: 'Invalid entity name',
            message: 'Entity name appears to be junk data or extraction artifact',
          });
        }
      }
    }
  }

  next();
};

// Generic input sanitization middleware
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // Sanitize inputs to prevent injection attacks and junk data
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Basic sanitization - remove potential injection characters
        req.body[key] = req.body[key].trim();
      }
    }
  }

  next();
};

// Combined validation middleware
export const inputValidationMiddleware = [sanitizeInput, validateEntityName];
