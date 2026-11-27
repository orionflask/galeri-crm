import { describe, expect, it } from "vitest";

import {
  assertCan,
  assignableRoles,
  can,
  canAssignRole,
  leadAccessWhere,
  PERMISSIONS,
  type Permission,
} from "@/lib/permissions";
import { ForbiddenError } from "@/server/errors";

describe("can", () => {
  it("lets every role read and create leads", () => {
    for (const role of ["OWNER", "MANAGER", "SALES"] as const) {
      expect(can(role, "lead:read")).toBe(true);
      expect(can(role, "lead:create")).toBe(true);
    }
  });

  it("restricts management actions to OWNER and MANAGER", () => {
    const managementOnly: Permission[] = [
      "lead:read:all",
      "lead:assign",
      "lead:delete",
      "lead:export",
      "vehicle:manage",
      "report:read",
      "user:invite",
    ];
    for (const permission of managementOnly) {
      expect(can("OWNER", permission)).toBe(true);
      expect(can("MANAGER", permission)).toBe(true);
      expect(can("SALES", permission)).toBe(false);
    }
  });

  it("restricts organization and user management to OWNER", () => {
    for (const permission of ["organization:manage", "user:manage"] as const) {
      expect(can("OWNER", permission)).toBe(true);
      expect(can("MANAGER", permission)).toBe(false);
      expect(can("SALES", permission)).toBe(false);
    }
  });

  it("grants OWNER every permission", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(can("OWNER", permission)).toBe(true);
    }
  });
});

describe("assertCan", () => {
  it("throws ForbiddenError when the role lacks the permission", () => {
    expect(() => assertCan("SALES", "lead:delete")).toThrow(ForbiddenError);
  });

  it("does not throw when the role has the permission", () => {
    expect(() => assertCan("MANAGER", "lead:delete")).not.toThrow();
  });
});

describe("role assignment", () => {
  it("lets OWNER assign any role", () => {
    expect(assignableRoles("OWNER")).toEqual(["OWNER", "MANAGER", "SALES"]);
  });

  it("lets MANAGER only add SALES users", () => {
    expect(canAssignRole("MANAGER", "SALES")).toBe(true);
    expect(canAssignRole("MANAGER", "MANAGER")).toBe(false);
    expect(canAssignRole("MANAGER", "OWNER")).toBe(false);
  });

  it("does not let SALES assign roles", () => {
    expect(assignableRoles("SALES")).toEqual([]);
  });
});

describe("leadAccessWhere", () => {
  it("limits SALES to their own leads", () => {
    expect(leadAccessWhere({ userId: "u1", role: "SALES" })).toEqual({ assignedToId: "u1" });
  });

  it("does not limit OWNER or MANAGER", () => {
    expect(leadAccessWhere({ userId: "u1", role: "OWNER" })).toEqual({});
    expect(leadAccessWhere({ userId: "u1", role: "MANAGER" })).toEqual({});
  });
});
