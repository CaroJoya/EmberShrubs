// lib/rate-limit.ts
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
// For production, use Redis or similar
const store: RateLimitStore = {};

// Configuration
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute
const BAN_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5; // 5 failed attempts triggers ban

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client identifier (IP + User-Agent fingerprint)
 */
export function getClientIdentifier(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  // Use a simpler fingerprint for rate limiting
  return `${ip}`;
}

/**
 * Check if client is rate limited
 */
export function checkRateLimit(request: NextRequest): {
  limited: boolean;
  remaining: number;
  resetTime: number;
  isBanned: boolean;
} {
  const key = getClientIdentifier(request);
  const now = Date.now();
  
  // Check if banned
  const banKey = `ban_${key}`;
  const banEntry = store[banKey];
  if (banEntry && banEntry.resetTime > now) {
    return {
      limited: true,
      remaining: 0,
      resetTime: banEntry.resetTime,
      isBanned: true,
    };
  }
  
  // Remove expired ban
  if (banEntry && banEntry.resetTime <= now) {
    delete store[banKey];
  }

  // Get or create rate limit entry
  let entry = store[key];
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    store[key] = entry;
  }

  const remaining = Math.max(0, MAX_REQUESTS_PER_WINDOW - entry.count);
  const limited = entry.count >= MAX_REQUESTS_PER_WINDOW;

  return {
    limited,
    remaining,
    resetTime: entry.resetTime,
    isBanned: false,
  };
}

/**
 * Increment request count for client
 */
export function incrementRequestCount(request: NextRequest): void {
  const key = getClientIdentifier(request);
  const now = Date.now();
  
  let entry = store[key];
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + WINDOW_MS,
    };
    store[key] = entry;
  }
  
  entry.count += 1;
}

/**
 * Track failed request and potentially ban
 */
export function trackFailedRequest(request: NextRequest): void {
  const key = getClientIdentifier(request);
  const failKey = `fail_${key}`;
  const now = Date.now();
  
  let failEntry = store[failKey];
  if (!failEntry || failEntry.resetTime < now) {
    failEntry = {
      count: 0,
      resetTime: now + WINDOW_MS * 5, // Track failures over 5 minutes
    };
    store[failKey] = failEntry;
  }
  
  failEntry.count += 1;
  
  // If too many failures, ban
  if (failEntry.count >= MAX_FAILED_ATTEMPTS) {
    const banKey = `ban_${key}`;
    store[banKey] = {
      count: 0,
      resetTime: now + BAN_DURATION_MS,
    };
    // Clean up failure tracking
    delete store[failKey];
  }
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Check rate limit
    const { limited, remaining, resetTime, isBanned } = checkRateLimit(request);
    
    // Increment request count (even if limited, for tracking)
    if (!isBanned) {
      incrementRequestCount(request);
    }
    
    // If banned, return 429 with retry-after
    if (isBanned) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed attempts. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime),
          },
        }
      );
    }
    
    // If limited, return 429
    if (limited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(MAX_REQUESTS_PER_WINDOW),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetTime),
          },
        }
      );
    }
    
    // Call the handler
    const response = await handler(request);
    
    // Add rate limit headers to response
    if (response.headers) {
      response.headers.set('X-RateLimit-Limit', String(MAX_REQUESTS_PER_WINDOW));
      response.headers.set('X-RateLimit-Remaining', String(remaining));
      response.headers.set('X-RateLimit-Reset', String(resetTime));
    }
    
    return response;
  };
}

/**
 * Validate input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove any potential control characters
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 1000); // Max length
}

/**
 * Validate prompt length
 */
export function isValidPrompt(prompt: string): boolean {
  const clean = sanitizeInput(prompt);
  return clean.length >= 5 && clean.length <= 500;
}

/**
 * Validate language selection
 */
export function isValidLanguage(language: string): boolean {
  const validLanguages = ['C', 'Python', 'Java', 'C++'];
  return validLanguages.includes(language);
}