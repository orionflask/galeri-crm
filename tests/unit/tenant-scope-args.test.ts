import { describe, expect, it } from "vitest";

import { TenantScopeError } from "@/server/errors";
import { scopeArgs } from "@/server/tenant/scope-args";

const ORG = "org_a";
const OTHER = "org_b";

describe("scopeArgs — reads and filtered writes", () => {
  const whereOps = [
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
  ];

  it.each(whereOps)("adds organizationId to where for %s", (operation) => {
    const result = scopeArgs("Lead", operation, { where: { id: "lead_1" } }, ORG);
    expect(result.where).toEqual({ id: "lead_1", organizationId: ORG });
  });

  it("adds a where clause when none is given", () => {
    expect(scopeArgs("Lead", "findMany", undefined, ORG)).toEqual({
      where: { organizationId: ORG },
    });
  });

  it("keeps other arguments untouched", () => {
    const args = { where: { status: "NEW" }, orderBy: { createdAt: "desc" }, take: 10 };
    expect(scopeArgs("Lead", "findMany", args, ORG)).toEqual({
      where: { status: "NEW", organizationId: ORG },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  });

  it("does not mutate the input", () => {
    const args = { where: { id: "lead_1" } };
    scopeArgs("Lead", "findUnique", args, ORG);
    expect(args).toEqual({ where: { id: "lead_1" } });
  });

  it("accepts an explicit filter on the same organization", () => {
    const result = scopeArgs("Lead", "findMany", { where: { organizationId: ORG } }, ORG);
    expect(result.where).toEqual({ organizationId: ORG });
  });

  it("rejects a filter on another organization", () => {
    expect(() => scopeArgs("Lead", "findMany", { where: { organizationId: OTHER } }, ORG)).toThrow(
      TenantScopeError,
    );
  });

  it("rejects operator filters on organizationId", () => {
    expect(() =>
      scopeArgs("Lead", "findMany", { where: { organizationId: { in: [ORG, OTHER] } } }, ORG),
    ).toThrow(TenantScopeError);
  });

  it("rejects moving a row to another organization on update", () => {
    expect(() =>
      scopeArgs("Lead", "update", { where: { id: "l1" }, data: { organizationId: OTHER } }, ORG),
    ).toThrow(TenantScopeError);
    expect(() =>
      scopeArgs("Lead", "updateMany", { data: { organization: { connect: { id: OTHER } } } }, ORG),
    ).toThrow(TenantScopeError);
  });

  it("allows ordinary updates", () => {
    const result = scopeArgs(
      "Lead",
      "update",
      { where: { id: "l1" }, data: { status: "CONTACTED" } },
      ORG,
    );
    expect(result).toEqual({
      where: { id: "l1", organizationId: ORG },
      data: { status: "CONTACTED" },
    });
  });
});

describe("scopeArgs — creates", () => {
  it("stamps organizationId on create", () => {
    const result = scopeArgs("Lead", "create", { data: { fullName: "A" } }, ORG);
    expect(result.data).toEqual({ fullName: "A", organizationId: ORG });
  });

  it.each(["createMany", "createManyAndReturn"])("stamps every row for %s", (operation) => {
    const result = scopeArgs(
      "Activity",
      operation,
      { data: [{ type: "NOTE" }, { type: "CALL" }] },
      ORG,
    );
    expect(result.data).toEqual([
      { type: "NOTE", organizationId: ORG },
      { type: "CALL", organizationId: ORG },
    ]);
  });

  it("rejects create data for another organization", () => {
    expect(() => scopeArgs("Lead", "create", { data: { organizationId: OTHER } }, ORG)).toThrow(
      TenantScopeError,
    );
    expect(() =>
      scopeArgs(
        "Lead",
        "createMany",
        { data: [{ organizationId: ORG }, { organizationId: OTHER }] },
        ORG,
      ),
    ).toThrow(TenantScopeError);
  });

  it("rejects the organization relation in create data", () => {
    expect(() =>
      scopeArgs("Lead", "create", { data: { organization: { connect: { id: ORG } } } }, ORG),
    ).toThrow(TenantScopeError);
  });

  it("rejects create without data", () => {
    expect(() => scopeArgs("Lead", "create", {}, ORG)).toThrow(TenantScopeError);
  });
});

describe("scopeArgs — upsert", () => {
  it("scopes where and create, and guards update", () => {
    const result = scopeArgs(
      "Customer",
      "upsert",
      { where: { id: "c1" }, create: { fullName: "A" }, update: { fullName: "B" } },
      ORG,
    );
    expect(result).toEqual({
      where: { id: "c1", organizationId: ORG },
      create: { fullName: "A", organizationId: ORG },
      update: { fullName: "B" },
    });
  });

  it("rejects an update that moves the row", () => {
    expect(() =>
      scopeArgs(
        "Customer",
        "upsert",
        { where: { id: "c1" }, create: {}, update: { organizationId: OTHER } },
        ORG,
      ),
    ).toThrow(TenantScopeError);
  });
});

describe("scopeArgs — Organization model", () => {
  it("scopes reads and updates by id", () => {
    expect(scopeArgs("Organization", "findFirst", undefined, ORG).where).toEqual({ id: ORG });
    expect(
      scopeArgs("Organization", "update", { where: { id: ORG }, data: { name: "X" } }, ORG).where,
    ).toEqual({ id: ORG });
  });

  it("rejects another organization's id", () => {
    expect(() => scopeArgs("Organization", "findUnique", { where: { id: OTHER } }, ORG)).toThrow(
      TenantScopeError,
    );
  });

  it.each(["create", "createMany", "delete", "deleteMany", "findMany", "upsert", "updateMany"])(
    "rejects %s",
    (operation) => {
      expect(() => scopeArgs("Organization", operation, {}, ORG)).toThrow(TenantScopeError);
    },
  );
});

describe("scopeArgs — fail closed", () => {
  it("rejects unknown models", () => {
    expect(() => scopeArgs("Account", "findMany", {}, ORG)).toThrow(TenantScopeError);
  });

  it("rejects unknown operations", () => {
    expect(() => scopeArgs("Lead", "somethingNew", {}, ORG)).toThrow(TenantScopeError);
  });

  it("rejects an empty organizationId", () => {
    expect(() => scopeArgs("Lead", "findMany", {}, "")).toThrow(TenantScopeError);
  });
});
