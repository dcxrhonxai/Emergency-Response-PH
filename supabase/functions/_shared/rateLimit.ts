// Simple in-memory rate limiter for edge functions
// Uses a Map to track request counts per identifier (IP or user ID)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxRequests: number;    // Maximum requests allowed
  windowMs: number;       // Time window in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Clean up expired entries periodically
const cleanupExpired = () => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupExpired, 60000);

export const checkRateLimit = (
  identifier: string,
  config: RateLimitConfig
): RateLimitResult => {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // If no entry or entry has expired, create new entry
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs
    };
    rateLimitStore.set(identifier, newEntry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: newEntry.resetAt
    };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(identifier, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
};

// Get client IP from request headers
export const getClientIP = (req: Request): string => {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
};

// Rate limit response helper
export const rateLimitResponse = (resetAt: number): Response => {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    }
  );
};

// Default rate limit configurations
export const RATE_LIMITS = {
  // Strict limit for emergency endpoints
  emergency: { maxRequests: 10, windowMs: 60000 },      // 10 per minute
  // Standard limit for authenticated endpoints  
  standard: { maxRequests: 60, windowMs: 60000 },       // 60 per minute
  // Strict limit for auth-related endpoints
  auth: { maxRequests: 5, windowMs: 300000 },           // 5 per 5 minutes
  // Very lenient for read-only endpoints
  readonly: { maxRequests: 200, windowMs: 60000 }       // 200 per minute
};
