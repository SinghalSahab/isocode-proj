import { describe, it, expect } from "vitest";
import { DEMO_USERS, DEMO_PRODUCTS } from "@/lib/db/demo-fallback";
import { signSession, verifySession } from "@/lib/auth/session";

describe("Demo Fallback & Offline Resilience (lib/db/demo-fallback.ts)", () => {
  it("provides complete seeded profiles for all demo personas", () => {
    // 3 Retailers
    expect(DEMO_USERS["9000000001"].name).toBe("Ramesh Gupta");
    expect(DEMO_USERS["9000000001"].role).toBe("retailer");
    expect(DEMO_USERS["9000000001"].retailer?.shopName).toBe("Gupta Kirana Store");

    expect(DEMO_USERS["9000000002"].name).toBe("Suresh Sharma");
    expect(DEMO_USERS["9000000002"].retailer?.availableCreditPaise).toBe(250000); // ₹2,500 credit hold demo

    expect(DEMO_USERS["9000000003"].name).toBe("Priya Patel");

    // Desk and Salesman
    expect(DEMO_USERS["9000000010"].role).toBe("desk");
    expect(DEMO_USERS["9000000020"].role).toBe("salesman");
  });

  it("signs and verifies JWT session tokens for offline demo logins", async () => {
    const user = DEMO_USERS["9000000001"];
    const token = await signSession({
      userId: user.id,
      phone: user.phone,
      role: user.role,
      retailerId: user.retailerId || null,
      name: user.name,
      preferredLang: user.preferredLang,
    });

    expect(token).toBeTruthy();
    const verified = await verifySession(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(user.id);
    expect(verified?.role).toBe("retailer");
    expect(verified?.retailerId).toBe(user.retailerId);
  });

  it("contains all 3 core brief SKUs in demo products", () => {
    const codes = DEMO_PRODUCTS.map((p) => p.code);
    expect(codes).toContain("SKU-BS-075");
    expect(codes).toContain("SKU-DT-1KG");
    expect(codes).toContain("SKU-TE-250");

    const tea = DEMO_PRODUCTS.find((p) => p.code === "SKU-TE-250");
    expect(tea?.stockCases).toBe(0); // Out of stock as per brief
  });
});

