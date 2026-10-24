// Structured API responses. Error messages are user-safe; technical details
// go to the server log, never to the client.

export const ERROR_STATUS = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  ACCOUNT_SUSPENDED: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  EVENT_FULL: 409,
  ALREADY_REGISTERED: 409,
  REGISTRATION_CLOSED: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: { code: ErrorCode; message: string } };

export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ success: true, data } satisfies ApiSuccess<T>, init);
}

export function fail(code: ErrorCode, message: string): Response {
  return Response.json({ success: false, error: { code, message } } satisfies ApiFailure, {
    status: ERROR_STATUS[code],
  });
}
