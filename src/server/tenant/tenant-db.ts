import { db } from "@/lib/db";
import { TenantScopeError } from "@/server/errors";

import type { TenantContext } from "./context";
import { scopeArgs } from "./scope-args";

/**
 * Prisma client that can only see and write rows of one organization.
 *
 * Every model query is rewritten by {@link scopeArgs}; raw SQL is rejected because it
 * cannot be scoped. Services must use this client for all tenant data — the global `db`
 * is reserved for genuinely cross-tenant flows (sign-up, sign-in, webhooks resolving a
 * tenant) and is lint-restricted to an allowlist of files.
 *
 * Limitation: nested writes (`create: { activities: { create: [...] } }`) are not
 * rewritten. They still fail at type level unless `organizationId` is passed, but
 * referenced ids (e.g. `assignedToId`) must be validated by the service as belonging
 * to the same tenant.
 */
export function createTenantDb(organizationId: string) {
  return db.$extends({
    name: "tenant-scope",
    query: {
      $allOperations({ model, operation, args, query }) {
        if (!model) {
          throw new TenantScopeError(
            `Raw query "${operation}" is not allowed on the tenant client.`,
          );
        }
        return query(scopeArgs(model, operation, args, organizationId));
      },
    },
  });
}

export type TenantDb = ReturnType<typeof createTenantDb>;

export function getTenantDb(ctx: TenantContext): TenantDb {
  return createTenantDb(ctx.organizationId);
}
