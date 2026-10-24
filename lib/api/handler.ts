import { unstable_rethrow } from "next/navigation";
import { ApiError, fail } from "./response";
import { log, newRequestId } from "@/lib/logger";

type Handler<Ctx> = (request: Request, ctx: Ctx & { requestId: string }) => Promise<Response>;

/**
 * Wraps a route handler: known ApiErrors become structured responses,
 * anything else is logged server-side and returned as a generic 500.
 */
export function withApi<Ctx extends object = object>(action: string, handler: Handler<Ctx>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    const requestId = newRequestId();
    try {
      const response = await handler(request, { ...ctx, requestId });
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (err) {
      // Let Next.js control flow (redirect, notFound, dynamic rendering) pass through.
      unstable_rethrow(err);
      if (err instanceof ApiError) {
        log.warn({ action, status: "failure", request_id: requestId, error_code: err.code });
        return fail(err.code, err.message);
      }
      log.error({
        action,
        status: "failure",
        request_id: requestId,
        error_code: "INTERNAL_ERROR",
        error: err instanceof Error ? err.message : String(err),
      });
      return fail("INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}
