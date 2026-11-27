import { describe, expect, it } from "vitest";

import { messages } from "@/lib/messages";

describe("messages", () => {
  it("loads Turkish UI strings", () => {
    expect(messages.app.name).toBe("Galeri CRM");
  });
});
