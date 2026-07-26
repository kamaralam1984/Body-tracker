"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ListSessionsParams, UploadProgressEvent } from "@kvl/sdk";
import { useKvlClient } from "./provider";
import { useQuery } from "./use-query";
import { useMutation } from "./use-mutation";

/** Real `POST /auth/login` as a mutation — `mutate({email, password})`. Invalidates every cached query on success, since a new session means every previously-fetched org-scoped data is now stale. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation(
    (client, vars: { email: string; password: string }) => client.login(vars.email, vars.password),
    { onSuccess: () => queryClient.invalidateQueries() },
  );
}

/** Real `POST /auth/logout` as a mutation — clears the entire query cache on success (nothing cached should outlive the session that fetched it). */
export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation((client) => client.logout(), {
    onSuccess: () => queryClient.clear(),
  });
}

const CURRENT_USER_QUERY_KEY = ["kvl", "users", "me"];

/** The real signed-in user (`GET /users/me`). */
export function useCurrentUser() {
  return useQuery(CURRENT_USER_QUERY_KEY, (client) => client.users.me());
}

/** Paginated real session list (`GET /sessions`). */
export function useSessions(params: ListSessionsParams = {}) {
  return useQuery(["kvl", "sessions", params], (client) => client.sessions.list(params));
}

/** A single real session (`GET /sessions/{id}`) — disabled while `id` is falsy. */
export function useSession(id: string | undefined) {
  return useQuery(["kvl", "sessions", id], (client) => client.sessions.get(id as string), {
    enabled: Boolean(id),
  });
}

/** Real notifications list + unread count (`GET /notifications`), polled every 60s — mirrors the same cadence this app's own header bell uses. */
export function useNotifications(params: { limit?: number; unreadOnly?: boolean } = {}) {
  return useQuery(["kvl", "notifications", params], (client) => client.notifications.list(params), {
    refetchInterval: 60_000,
  });
}

/** Real security-center overview (`GET /security-center/overview`). */
export function useSecurityCenter(
  params: { inactiveDays?: number; nearExpirationDays?: number } = {},
) {
  return useQuery(["kvl", "security-center", params], (client) =>
    client.securityCenter.overview(params),
  );
}

/** Real avatar upload with real progress state — `upload(file)`, then read `progress`/`isUploading`/`error`. Invalidates `useCurrentUser()`'s cache on success so the new `avatarUrl` shows up immediately. */
export function useUpload() {
  const client = useKvlClient();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<UploadProgressEvent | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function upload(file: File | Blob) {
    setIsUploading(true);
    setError(null);
    setProgress(null);
    try {
      const user = await client.uploads.uploadAvatar(file, { onProgress: setProgress });
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
      return user;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  return { upload, progress, isUploading, error };
}
