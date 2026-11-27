import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/server/errors";

// Role-based permissions (CLAUDE.md §4–5).
// Pure and dependency-free so it can also be used in UI code to hide unavailable actions;
// the server always re-checks with `assertCan`.

const ALL_ROLES = ["OWNER", "MANAGER", "SALES"] as const satisfies readonly Role[];
const MANAGEMENT = ["OWNER", "MANAGER"] as const satisfies readonly Role[];

export const PERMISSIONS = {
  // Leads: SALES only sees leads assigned to them (see `leadAccessWhere`).
  "lead:read": ALL_ROLES,
  "lead:read:all": MANAGEMENT,
  "lead:create": ALL_ROLES,
  "lead:update": ALL_ROLES,
  "lead:assign": MANAGEMENT,
  "lead:delete": MANAGEMENT,
  "lead:export": MANAGEMENT,

  "customer:read": ALL_ROLES,
  "customer:manage": MANAGEMENT,

  "vehicle:read": ALL_ROLES,
  "vehicle:manage": MANAGEMENT,

  "task:manage": ALL_ROLES,

  "report:read": MANAGEMENT,

  "user:read": MANAGEMENT,
  "user:invite": MANAGEMENT,
  "user:manage": ["OWNER"],

  "organization:manage": ["OWNER"],
  "integration:manage": MANAGEMENT,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Throws {@link ForbiddenError} unless `role` has `permission`. */
export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new ForbiddenError(`Role ${role} lacks permission ${permission}`);
  }
}

/**
 * Roles an actor may grant when inviting or editing users.
 * OWNER can grant any role; MANAGER can only add SALES; SALES cannot grant roles.
 */
export function assignableRoles(actorRole: Role): readonly Role[] {
  switch (actorRole) {
    case "OWNER":
      return ALL_ROLES;
    case "MANAGER":
      return ["SALES"];
    case "SALES":
      return [];
  }
}

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  return assignableRoles(actorRole).includes(targetRole);
}

/**
 * Extra `where` filter for lead queries: SALES only sees leads assigned to them,
 * OWNER and MANAGER see every lead of the organization. Combine with the
 * tenant-scoped client, which adds the `organizationId` filter.
 */
export function leadAccessWhere(actor: { userId: string; role: Role }): { assignedToId?: string } {
  return can(actor.role, "lead:read:all") ? {} : { assignedToId: actor.userId };
}
