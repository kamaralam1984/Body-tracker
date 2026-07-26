import type { KvlClient } from "../client";
import type { ListParams } from "./types";

/** Event a webhook can subscribe to. Mirrors the app-facing `WebhookEvent` union in `src/server/services/webhooks-service.ts`. */
export type WebhookEvent =
  "session.started" | "session.completed" | "tracking.form-alert" | "report.ready" | "user.invited";

/** Webhook registration status. Mirrors `Webhook.status` (Prisma `WebhookStatus`). */
export type WebhookStatus = "active" | "disabled";

/**
 * A registered webhook, as returned by `GET /webhooks`, `GET /webhooks/{id}`,
 * and `PATCH /webhooks/{id}`. Mirrors the `Webhook` Prisma model with its
 * `secret` stripped by `sanitizeWebhook()` and `events` mapped back to their
 * app-facing dot/hyphen-separated strings.
 */
export interface Webhook {
  id: string;
  orgId: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  createdAt: string;
}

/** Only present on the one response that ever includes it — the real plaintext secret, shown exactly once at creation. */
export interface WebhookWithSecret extends Webhook {
  secret: string;
}

/** Outcome of a single delivery attempt. Mirrors `WebhookDelivery` (Prisma), with `event` mapped back to its app-facing string and `payload` re-typed from `Json`. */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  attempt: number;
  status: "pending" | "success" | "failed";
  responseStatus: number | null;
  durationMs: number | null;
  createdAt: string;
}

export interface CreateWebhookInput {
  url: string;
  /** At least one event; see `createSchema` in `src/app/api/v1/webhooks/route.ts`. */
  events: WebhookEvent[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: WebhookEvent[];
  status?: WebhookStatus;
}

export interface ListDeliveriesParams {
  cursor?: string;
  limit?: number;
}

export interface TestWebhookInput {
  /** Defaults to the webhook's first subscribed event if omitted. */
  event?: WebhookEvent;
}

export class WebhooksResource {
  constructor(private client: KvlClient) {}

  /** Lists webhooks for the caller's organization (secrets omitted). Mirrors `GET /webhooks`. */
  /** The real route puts `nextCursor`/`total` in the response envelope's `meta`, not `data` — since `client.request()` only ever returns `body.data`, this honestly returns a plain array rather than a `PageResult` this SDK can't actually populate. */
  list(params: ListParams = {}): Promise<Webhook[]> {
    return this.client.request({ method: "GET", path: "/webhooks", query: { ...params } });
  }

  /** Fetches a single webhook by id (secret omitted). Mirrors `GET /webhooks/{id}`. */
  get(id: string): Promise<Webhook> {
    return this.client.request({ method: "GET", path: `/webhooks/${id}` });
  }

  /**
   * Registers a new webhook. The response's `secret` field is only ever
   * returned in full here — subsequent reads always omit it. Mirrors
   * `POST /webhooks`.
   */
  create(input: CreateWebhookInput): Promise<WebhookWithSecret> {
    return this.client.request({ method: "POST", path: "/webhooks", body: input });
  }

  /** Updates a webhook's URL, subscribed events, and/or status. Mirrors `PATCH /webhooks/{id}`. */
  update(id: string, input: UpdateWebhookInput): Promise<Webhook> {
    return this.client.request({ method: "PATCH", path: `/webhooks/${id}`, body: input });
  }

  /** Deletes a webhook and its delivery history (cascades). Mirrors `DELETE /webhooks/{id}`. */
  delete(id: string): Promise<{ deleted: true; id: string }> {
    return this.client.request({ method: "DELETE", path: `/webhooks/${id}` });
  }

  /** Lists delivery attempts for a webhook, newest first. Mirrors `GET /webhooks/{id}/deliveries`. Real route puts `nextCursor`/`total` in `meta`, not `data` — same honest plain-array return as `list()` above. */
  deliveries(id: string, params: ListDeliveriesParams = {}): Promise<WebhookDelivery[]> {
    return this.client.request({
      method: "GET",
      path: `/webhooks/${id}/deliveries`,
      query: { ...params },
    });
  }

  /**
   * Sends a real test delivery: builds a sample payload for one of the
   * webhook's subscribed events, signs it, and performs a genuine HTTP POST
   * to the webhook's URL. Returns the recorded delivery outcome — including
   * network failures and non-2xx responses — as a normal, successful call.
   * Mirrors `POST /webhooks/{id}/test`.
   */
  test(id: string, input: TestWebhookInput = {}): Promise<WebhookDelivery> {
    return this.client.request({
      method: "POST",
      path: `/webhooks/${id}/test`,
      body: input.event !== undefined ? input : undefined,
    });
  }
}
