import { describe, expect, it } from "vitest";
import {
  calculateBadge,
  calculateDiscountAmount,
  calculateOrderTotals,
  createSessionExpiry,
  isSessionExpired
} from "../src/lib/logic";

describe("badge calculation", () => {
  it("returns highest badge within points", () => {
    const badges = [
      { key: "NEWBIE", minPoints: 1, discountPercent: 0 },
      { key: "PLATINUM", minPoints: 1000, discountPercent: 5 },
      { key: "CROWN", minPoints: 10000, discountPercent: 10 }
    ];
    const badge = calculateBadge(1500, badges);
    expect(badge.key).toBe("PLATINUM");
  });
});

describe("discount calculation", () => {
  it("calculates percent discount", () => {
    expect(calculateDiscountAmount(1000, 10)).toBe(100);
  });
});

describe("order totals", () => {
  it("calculates subtotal and total", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 200, qty: 2 },
        { unitPrice: 150, qty: 1 }
      ],
      10
    );
    expect(totals.subtotal).toBe(550);
    expect(totals.discountAmount).toBe(55);
    expect(totals.totalAfter).toBe(495);
  });
});

describe("session expiry", () => {
  it("detects expired sessions", () => {
    const now = new Date("2024-01-10T00:00:00.000Z");
    expect(isSessionExpired("2024-01-09T00:00:00.000Z", now)).toBe(true);
    expect(isSessionExpired("2024-01-11T00:00:00.000Z", now)).toBe(false);
  });

  it("creates expiry dates", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const expiry = createSessionExpiry(1, now);
    expect(expiry.startsWith("2024-01-02")).toBe(true);
  });
});
