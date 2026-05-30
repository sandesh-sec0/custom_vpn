/**
 * Error Handling Utilities
 *
 * Converts raw API/network errors into user-friendly messages.
 */

import { ApiException } from '@/api/types';

/**
 * Extract a user-friendly error message from any thrown value.
 * Works with ApiException, native Error, or plain strings.
 */
export function parseError(err: unknown): string {
  if (err instanceof ApiException) {
    return err.detail;
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError') return 'Request timed out. Please try again.';
    return err.message || 'An unexpected error occurred.';
  }
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred.';
}

/**
 * Returns true if the error is a 404 Not Found.
 */
export function isNotFound(err: unknown): boolean {
  return err instanceof ApiException && err.status === 404;
}

/**
 * Returns true if the error is a 401 Unauthorized.
 */
export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiException && err.status === 401;
}

/**
 * Returns true if the error is a 403 Forbidden.
 */
export function isForbidden(err: unknown): boolean {
  return err instanceof ApiException && err.status === 403;
}

/**
 * Returns true if the error is a 422 Validation Error.
 */
export function isValidationError(err: unknown): boolean {
  return err instanceof ApiException && err.status === 422;
}
