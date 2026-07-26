import type { KvlClient } from "../client";
import type { ListParams, PageResult, Session, TrackingStatus } from "./types";

export interface ListSessionsParams extends ListParams {
  status?: TrackingStatus;
  activityKind?: string;
}

export interface CreateSessionInput {
  title: string;
  activityKind: string;
}

export interface UpdateSessionInput {
  title?: string;
}

/**
 * `client.sessions` — tracking session records (start/pause/resume/stop
 * live under `client.tracking`; this is the session resource itself:
 * list/get/create/update). Mirrors `GET|POST /api/v1/sessions` and
 * `GET|PATCH /api/v1/sessions/{id}`.
 */
export class SessionsResource {
  constructor(private client: KvlClient) {}

  list(params: ListSessionsParams = {}): Promise<PageResult<Session>> {
    return this.client.request({ method: "GET", path: "/sessions", query: { ...params } });
  }

  get(id: string): Promise<Session> {
    return this.client.request({ method: "GET", path: `/sessions/${id}` });
  }

  create(input: CreateSessionInput): Promise<Session> {
    return this.client.request({ method: "POST", path: "/sessions", body: input });
  }

  update(id: string, input: UpdateSessionInput): Promise<Session> {
    return this.client.request({ method: "PATCH", path: `/sessions/${id}`, body: input });
  }
}
