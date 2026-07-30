import { Request, Response, NextFunction } from "express";

const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * A lightweight in-memory rate limiter middleware.
 * Stores request history in a map keyed by IP.
 * Skips limiting when NODE_ENV is "test".
 */
export const rateLimiter = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === "test") {
      return next();
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const record = ipRequestCounts.get(ip);

    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({
        error: `Too many requests. Please try again after ${retryAfter} seconds.`,
      });
    }

    record.count += 1;
    next();
  };
};
