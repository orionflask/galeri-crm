import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { TenantScopeError } from "@/server/errors";
import { createTenantDb } from "@/server/tenant";

// Runs against the database in DATABASE_URL (`pnpm db:dev`). Creates two throwaway
// organizations and verifies that the tenant client of one never reaches the other.

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let orgA: string;
let orgB: string;
let leadA: string;
let leadB: string;

beforeAll(async () => {
  const [a, b] = await Promise.all([
    db.organization.create({ data: { name: "Test A", slug: `test-a-${suffix}` } }),
    db.organization.create({ data: { name: "Test B", slug: `test-b-${suffix}` } }),
  ]);
  orgA = a.id;
  orgB = b.id;

  const [la, lb] = await Promise.all([
    db.lead.create({
      data: { organizationId: orgA, fullName: "Lead A", phone: "+905000000001", source: "PHONE" },
    }),
    db.lead.create({
      data: { organizationId: orgB, fullName: "Lead B", phone: "+905000000002", source: "PHONE" },
    }),
  ]);
  leadA = la.id;
  leadB = lb.id;
});

afterAll(async () => {
  await db.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await db.$disconnect();
});

describe("tenant-scoped client", () => {
  it("lists only its own leads", async () => {
    const leads = await createTenantDb(orgA).lead.findMany({
      where: { id: { in: [leadA, leadB] } },
    });
    expect(leads.map((l) => l.id)).toEqual([leadA]);
  });

  it("cannot read another tenant's lead by id", async () => {
    const tenant = createTenantDb(orgA);
    expect(await tenant.lead.findUnique({ where: { id: leadB } })).toBeNull();
    expect(await tenant.lead.findFirst({ where: { id: leadB } })).toBeNull();
    expect(await tenant.lead.count({ where: { id: leadB } })).toBe(0);
  });

  it("cannot update or delete another tenant's lead", async () => {
    const tenant = createTenantDb(orgA);

    await expect(
      tenant.lead.update({ where: { id: leadB }, data: { fullName: "hacked" } }),
    ).rejects.toThrow();
    await expect(tenant.lead.delete({ where: { id: leadB } })).rejects.toThrow();

    const updated = await tenant.lead.updateMany({
      where: { id: leadB },
      data: { fullName: "hacked" },
    });
    expect(updated.count).toBe(0);

    const deleted = await tenant.lead.deleteMany({ where: { id: leadB } });
    expect(deleted.count).toBe(0);

    const untouched = await db.lead.findUniqueOrThrow({ where: { id: leadB } });
    expect(untouched.fullName).toBe("Lead B");
  });

  it("stamps organizationId on create", async () => {
    const tenant = createTenantDb(orgA);
    // organizationId is required by the generated types; the client overrides/validates it.
    const created = await tenant.activity.create({
      data: { organizationId: orgA, leadId: leadA, type: "NOTE", body: "test" },
    });
    expect(created.organizationId).toBe(orgA);
  });

  it("refuses to create rows for another tenant", async () => {
    await expect(
      createTenantDb(orgA).lead.create({
        data: { organizationId: orgB, fullName: "X", phone: "+905000000003", source: "PHONE" },
      }),
    ).rejects.toThrow(TenantScopeError);
  });

  it("only sees its own organization row", async () => {
    const tenant = createTenantDb(orgA);
    expect((await tenant.organization.findFirst())?.id).toBe(orgA);
    await expect(tenant.organization.findUnique({ where: { id: orgB } })).rejects.toThrow(
      TenantScopeError,
    );
  });

  it("rejects raw SQL", async () => {
    await expect(createTenantDb(orgA).$queryRaw`SELECT 1`).rejects.toThrow(TenantScopeError);
  });

  it("stays scoped inside interactive transactions", async () => {
    const leads = await createTenantDb(orgA).$transaction((tx) =>
      tx.lead.findMany({ where: { id: { in: [leadA, leadB] } } }),
    );
    expect(leads.map((l) => l.id)).toEqual([leadA]);
  });
});
