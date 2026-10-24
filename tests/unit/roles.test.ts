import { describe, expect, it } from "vitest";
import { areaForPath, canAccessArea, homeForRole, isRole, safeNextPath } from "@/lib/auth/roles";

describe("areaForPath", () => {
  it.each([
    ["/me", "me"],
    ["/me/tickets/1", "me"],
    ["/host/events", "host"],
    ["/admin", "admin"],
    ["/", null],
    ["/c/coimbatore-run-club", null],
    ["/administrator", null],
    ["/hosts", null],
    ["/meetups", null],
  ])("%s → %s", (path, area) => {
    expect(areaForPath(path)).toBe(area);
  });
});

describe("canAccessArea", () => {
  it("members only reach their own area", () => {
    expect(canAccessArea("MEMBER", "me")).toBe(true);
    expect(canAccessArea("MEMBER", "host")).toBe(false);
    expect(canAccessArea("MEMBER", "admin")).toBe(false);
  });

  it("organisers host and still attend events", () => {
    expect(canAccessArea("ORGANIZER", "host")).toBe(true);
    expect(canAccessArea("ORGANIZER", "me")).toBe(true);
    expect(canAccessArea("ORGANIZER", "admin")).toBe(false);
  });

  it("admins reach every area", () => {
    expect(canAccessArea("ADMIN", "admin")).toBe(true);
    expect(canAccessArea("ADMIN", "host")).toBe(true);
    expect(canAccessArea("ADMIN", "me")).toBe(true);
  });
});

describe("homeForRole", () => {
  it("maps each role to its dashboard", () => {
    expect(homeForRole("MEMBER")).toBe("/me");
    expect(homeForRole("ORGANIZER")).toBe("/host");
    expect(homeForRole("ADMIN")).toBe("/admin");
  });
});

describe("isRole", () => {
  it("accepts only known roles", () => {
    expect(isRole("ADMIN")).toBe(true);
    expect(isRole("admin")).toBe(false);
    expect(isRole("CUSTOMER")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/me?tab=1")).toBe("/me?tab=1");
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined])(
    "rejects %s",
    (value) => {
      expect(safeNextPath(value, "/fallback")).toBe("/fallback");
    },
  );
});
