import type { Role } from "@/generated/prisma/enums";

/**
 * Who is acting and on behalf of which organization. Built from the session once per
 * request (Auth.js integration follows) and passed explicitly to every service call.
 */
export type TenantContext = Readonly<{
  userId: string;
  organizationId: string;
  role: Role;
}>;
