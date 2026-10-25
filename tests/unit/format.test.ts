import { describe, expect, it } from "vitest";
import { formatEventTime, istLocalToIso, isoToIstLocal, slugify } from "@/lib/format";
import { friendlyError } from "@/lib/events/errors";

describe("IST conversion", () => {
  it("reads organiser input as India time", () => {
    expect(istLocalToIso("2026-10-26T06:00")).toBe("2026-10-26T00:30:00.000Z");
  });

  it("round-trips for the edit form", () => {
    expect(isoToIstLocal("2026-10-26T00:30:00.000Z")).toBe("2026-10-26T06:00");
  });

  it("rejects malformed input", () => {
    expect(istLocalToIso("26/10/2026 6am")).toBeNull();
    expect(istLocalToIso("")).toBeNull();
  });

  it("formats in IST regardless of server timezone", () => {
    expect(formatEventTime("2026-10-26T00:30:00.000Z")).toMatch(/26 Oct · 6:00\s?am/i);
  });
});

describe("slugify", () => {
  it.each([
    ["CBE Run Club", "cbe-run-club"],
    ["  Sunday 10K -- Race Course! ", "sunday-10k-race-course"],
    ["Café Socials", "cafe-socials"],
    ["தமிழ் only", "only"],
  ])("%s → %s", (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });

  it("respects the max length without a trailing dash", () => {
    expect(slugify("a".repeat(10) + " " + "b".repeat(10), 11)).toBe("aaaaaaaaaa");
  });
});

describe("friendlyError", () => {
  it("maps database codes to readable text", () => {
    expect(friendlyError("EVENT_FULL")).toBe("This event is full.");
    expect(friendlyError("Paid events need a verified payout account")).toMatch(/payout/);
  });

  it("never leaks unknown internals", () => {
    expect(friendlyError('relation "x" does not exist')).toBe("Something went wrong. Please try again.");
  });
});
