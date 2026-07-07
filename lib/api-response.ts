import { NextResponse } from "next/server";
import { isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: string;
    message: string;
    issues?: Record<string, string[]>;
  };
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

/**
 * Converts any thrown error into a consistent JSON error envelope. Known
 * `AppError` subclasses map to their status code; anything else is logged
 * with full detail and returned to the client as an opaque 500.
 */
export function apiError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json<ApiFailure>(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          issues: "issues" in error ? (error as { issues?: Record<string, string[]> }).issues : undefined,
        },
      },
      { status: error.statusCode },
    );
  }

  logger.error("Unhandled error in API route", error);

  return NextResponse.json<ApiFailure>(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 },
  );
}
