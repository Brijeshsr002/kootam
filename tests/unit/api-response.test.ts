import { describe, expect, it, vi } from "vitest";
import { withApi } from "@/lib/api/handler";
import { ApiError, fail, ok } from "@/lib/api/response";

describe("structured responses", () => {
  it("ok wraps data", async () => {
    const res = ok({ id: 1 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { id: 1 } });
  });

  it("fail uses the spec's error shape and status", async () => {
    const res = fail("EVENT_FULL", "This event is full.");
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      success: false,
      error: { code: "EVENT_FULL", message: "This event is full." },
    });
  });
});

describe("withApi", () => {
  it("turns ApiError into a structured error", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const handler = withApi("TEST", async () => {
      throw new ApiError("FORBIDDEN", "No access.");
    });
    const res = await handler(new Request("http://x"), {});
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("hides internal error details from the client", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApi("TEST", async () => {
      throw new Error('relation "secret_table" does not exist');
    });
    const res = await handler(new Request("http://x"), {});
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret_table");
    expect(spy.mock.calls[0][0]).toContain("secret_table"); // but it is logged server-side
  });

  it("adds a request id header", async () => {
    const handler = withApi("TEST", async () => ok(true));
    const res = await handler(new Request("http://x"), {});
    expect(res.headers.get("x-request-id")).toMatch(/[0-9a-f-]{36}/);
  });
});
