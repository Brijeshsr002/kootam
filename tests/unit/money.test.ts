import { describe, expect, it } from "vitest";
import { formatINR, percentageOf, platformFee, rupeesToPaise, ticketTotals } from "@/lib/money";

describe("percentageOf", () => {
  it("rounds half up to the nearest paisa", () => {
    expect(percentageOf(29950, 10)).toBe(2995);
    expect(percentageOf(5, 10)).toBe(1); // 0.5 paise → 1
    expect(percentageOf(4, 10)).toBe(0); // 0.4 paise → 0
  });

  it("supports fractional percentages without float drift", () => {
    expect(percentageOf(29900, 12.5)).toBe(3738); // 3737.5 → 3738
    expect(percentageOf(10000, 0.1)).toBe(10);
  });

  it("rejects non-integer or negative amounts and bad percentages", () => {
    expect(() => percentageOf(299.5, 10)).toThrow(RangeError);
    expect(() => percentageOf(-1, 10)).toThrow(RangeError);
    expect(() => percentageOf(100, 101)).toThrow(RangeError);
  });
});

describe("platform fee", () => {
  it("₹299 ticket at 4% → ₹11.96 fee", () => {
    expect(platformFee(29900, 4)).toBe(1196);
  });

  it("applies the minimum fee to cheap tickets", () => {
    expect(platformFee(4900, 4, 500)).toBe(500); // 4% of ₹49 is ₹1.96 → ₹5 minimum
  });

  it("never charges a fee on free tickets", () => {
    expect(platformFee(0, 4, 500)).toBe(0);
  });

  it("totals always add up", () => {
    for (const ticket of [0, 100, 4900, 29900, 123457]) {
      const t = ticketTotals(ticket, 4, 500);
      expect(t.ticketAmount + t.platformFee).toBe(t.totalAmount);
      expect(t.ticketAmount).toBe(ticket);
    }
  });

  it("rejects a negative minimum", () => {
    expect(() => platformFee(100, 4, -1)).toThrow(RangeError);
  });
});

describe("formatting", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatINR(29900)).toBe("₹299");
  });

  it("shows paise when present", () => {
    expect(formatINR(29950)).toBe("₹299.50");
  });

  it("converts rupees to paise safely", () => {
    expect(rupeesToPaise(19.99)).toBe(1999);
  });
});
