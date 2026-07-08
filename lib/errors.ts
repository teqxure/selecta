/**
 * Base class for all expected, handled errors. Anything else that throws is
 * treated as an unexpected 500 and logged with full detail — see logger.ts.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  readonly issues?: Record<string, string[]>;

  constructor(message = "Invalid input", issues?: Record<string, string[]>) {
    super(message, 400, "VALIDATION_ERROR");
    this.issues = issues;
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "AUTH_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many attempts — please slow down and try again shortly") {
    super(message, 429, "RATE_LIMITED");
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
