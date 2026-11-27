// Domain errors thrown by the service layer. Each carries a stable `code` that the UI
// maps to a Turkish message from messages/tr.json; `message` is for developers/logs only
// and must never contain personal data (KVKK).

export type AppErrorCode = "FORBIDDEN" | "TENANT_SCOPE_VIOLATION";

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = new.target.name;
    this.code = code;
  }
}

/** The current user's role does not allow the requested action. */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message);
  }
}

/**
 * A query through the tenant-scoped client tried to leave its organization, or used an
 * operation the tenant client does not support. This always indicates a programming error.
 */
export class TenantScopeError extends AppError {
  constructor(message: string) {
    super("TENANT_SCOPE_VIOLATION", message);
  }
}
