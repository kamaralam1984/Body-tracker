import type { KvlClient } from "./client";
import { KvlApiError, KvlNetworkError, KvlAbortError } from "./errors";
import type { User } from "./resources/users";

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadAvatarOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
}

/**
 * Dedicated file-upload module — wraps the one real upload endpoint this
 * API has (`POST /users/me/avatar`, a single ≤5MB image; see
 * `src/app/api/v1/users/me/avatar/route.ts`). Chunked/resumable/
 * multi-file upload is NOT supported here — there's no server-side
 * endpoint for it, and fabricating a chunked-upload client against a
 * single-shot endpoint would just fail at the first chunk. This exists
 * as its own module (separate from the simpler `client.users.updateAvatar()`)
 * specifically to offer real upload-progress events, which
 * `client.request()`'s `fetch`-based transport can't provide — `fetch` has
 * no request-body progress API. In a browser, this uses `XMLHttpRequest`
 * (which does), giving real byte-level progress; in Node (no `XMLHttpRequest`),
 * it falls back to `fetch` with a single 100% progress event on completion,
 * which is the honest capability Node's fetch actually offers here.
 */
export class UploadsClient {
  constructor(private client: KvlClient) {}

  uploadAvatar(file: File | Blob, options: UploadAvatarOptions = {}): Promise<User> {
    if (typeof XMLHttpRequest !== "undefined") {
      return this.uploadViaXhr(file, options);
    }
    return this.uploadViaFetch(file, options);
  }

  private buildUrl(): string {
    const base = this.client.baseUrl.endsWith("/")
      ? this.client.baseUrl
      : `${this.client.baseUrl}/`;
    return new URL("users/me/avatar", base).toString();
  }

  private async uploadViaFetch(file: File | Blob, options: UploadAvatarOptions): Promise<User> {
    const formData = new FormData();
    formData.append("file", file);
    const authHeader = this.client.auth.getAuthHeader();

    let response: Response;
    try {
      response = await fetch(this.buildUrl(), {
        method: "POST",
        headers: authHeader ? { Authorization: authHeader } : {},
        body: formData,
        signal: options.signal,
      });
    } catch (error) {
      if (options.signal?.aborted) throw new KvlAbortError();
      throw new KvlNetworkError("Avatar upload failed", error);
    }

    const size = file.size;
    options.onProgress?.({ loaded: size, total: size, percent: 100 });

    const body = (await response.json()) as {
      data?: User;
      error?: { code?: string; message?: string; details?: unknown };
    };
    if (!response.ok) {
      throw new KvlApiError({
        code: body.error?.code ?? "internal_error",
        status: response.status,
        message: body.error?.message ?? `Upload failed with status ${response.status}`,
        details: body.error?.details,
      });
    }
    return body.data as User;
  }

  private uploadViaXhr(file: File | Blob, options: UploadAvatarOptions): Promise<User> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", this.buildUrl());

      const authHeader = this.client.auth.getAuthHeader();
      if (authHeader) xhr.setRequestHeader("Authorization", authHeader);

      xhr.upload.onprogress = (event) => {
        if (!options.onProgress) return;
        const total = event.lengthComputable ? event.total : file.size;
        options.onProgress({
          loaded: event.loaded,
          total,
          percent: total > 0 ? Math.round((event.loaded / total) * 100) : 0,
        });
      };

      xhr.onload = () => {
        let body: { data?: User; error?: { code?: string; message?: string; details?: unknown } };
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          reject(
            new KvlApiError({
              code: "internal_error",
              status: xhr.status,
              message: "Upload response was not valid JSON",
            }),
          );
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body.data as User);
        } else {
          reject(
            new KvlApiError({
              code: body.error?.code ?? "internal_error",
              status: xhr.status,
              message: body.error?.message ?? `Upload failed with status ${xhr.status}`,
              details: body.error?.details,
            }),
          );
        }
      };

      xhr.onerror = () => reject(new KvlNetworkError("Avatar upload failed"));
      xhr.onabort = () => reject(new KvlAbortError());

      if (options.signal) {
        if (options.signal.aborted) {
          xhr.abort();
          return;
        }
        options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }

      const formData = new FormData();
      formData.append("file", file);
      xhr.send(formData);
    });
  }
}
