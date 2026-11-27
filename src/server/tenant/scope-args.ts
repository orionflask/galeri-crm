import { TenantScopeError } from "@/server/errors";

// Pure argument rewriting for the tenant-scoped Prisma client (see ./tenant-db.ts).
// Kept free of Prisma runtime imports so it can be unit tested exhaustively.
//
// Design: fail closed. Unknown models and unknown operations throw instead of passing
// through, so a new model or Prisma operation can never silently bypass tenant filtering.

type Args = Record<string, unknown>;

/** Models that carry an `organizationId` column. */
const TENANT_MODELS: ReadonlySet<string> = new Set([
  "User",
  "Lead",
  "Activity",
  "Task",
  "TradeIn",
  "Vehicle",
  "VehiclePhoto",
  "Customer",
]);

/** Operations whose `where` must be narrowed to the tenant. */
const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

/** Operations whose `data` must be stamped with the tenant. */
const CREATE_OPERATIONS: ReadonlySet<string> = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
]);

/**
 * A tenant may read and update its own Organization row, but never create or delete
 * organizations through the tenant client (sign-up uses the global client explicitly).
 */
const ORGANIZATION_OPERATIONS: ReadonlySet<string> = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "update",
]);

function isRecord(value: unknown): value is Args {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Narrows a `where` clause to the tenant, rejecting filters that point elsewhere. */
function scopeWhere(where: unknown, field: string, organizationId: string): Args {
  const base = isRecord(where) ? where : {};
  if (field in base && base[field] !== organizationId) {
    throw new TenantScopeError(`Filter on "${field}" outside the current organization.`);
  }
  return { ...base, [field]: organizationId };
}

/** Stamps create data with the tenant, rejecting data that targets another tenant. */
function scopeCreateData(data: unknown, organizationId: string): Args | Args[] {
  if (Array.isArray(data)) {
    return data.map((item) => scopeCreateData(item, organizationId) as Args);
  }
  if (!isRecord(data)) {
    throw new TenantScopeError("Create data must be an object.");
  }
  if ("organization" in data) {
    throw new TenantScopeError(
      'Use the "organizationId" scalar, not the "organization" relation, in tenant writes.',
    );
  }
  if ("organizationId" in data && data.organizationId !== organizationId) {
    throw new TenantScopeError("Create data targets another organization.");
  }
  return { ...data, organizationId };
}

/** Rejects update data that would move a row to another tenant. */
function assertUpdateStaysInTenant(data: unknown, field: string, organizationId: string): void {
  if (!isRecord(data)) return;
  if ("organization" in data) {
    throw new TenantScopeError('Updating the "organization" relation is not allowed.');
  }
  if (field in data && data[field] !== organizationId) {
    throw new TenantScopeError(`Updating "${field}" to another organization is not allowed.`);
  }
}

/**
 * Returns a copy of `args` restricted to `organizationId`.
 * Throws {@link TenantScopeError} for unsupported models/operations or cross-tenant input.
 */
export function scopeArgs(
  model: string,
  operation: string,
  args: unknown,
  organizationId: string,
): Args {
  if (!organizationId) {
    throw new TenantScopeError("Missing organizationId.");
  }

  const isOrganization = model === "Organization";
  if (!isOrganization && !TENANT_MODELS.has(model)) {
    throw new TenantScopeError(`Model "${model}" is not tenant-scoped; use the global client.`);
  }
  if (isOrganization && !ORGANIZATION_OPERATIONS.has(operation)) {
    throw new TenantScopeError(`Operation "${operation}" on Organization is not allowed.`);
  }

  // The Organization row is matched by its own id; every other model by organizationId.
  const field = isOrganization ? "id" : "organizationId";
  const scoped: Args = isRecord(args) ? { ...args } : {};

  if (WHERE_OPERATIONS.has(operation)) {
    scoped.where = scopeWhere(scoped.where, field, organizationId);
    if ("data" in scoped) assertUpdateStaysInTenant(scoped.data, field, organizationId);
    return scoped;
  }

  if (CREATE_OPERATIONS.has(operation)) {
    scoped.data = scopeCreateData(scoped.data, organizationId);
    return scoped;
  }

  if (operation === "upsert") {
    scoped.where = scopeWhere(scoped.where, field, organizationId);
    scoped.create = scopeCreateData(scoped.create, organizationId);
    assertUpdateStaysInTenant(scoped.update, field, organizationId);
    return scoped;
  }

  throw new TenantScopeError(`Operation "${operation}" is not supported by the tenant client.`);
}
