export { KvlClient, type KvlClientConfig } from "./client";
export { EventEmitter, type EventHandler, type ListenOptions } from "./event-emitter";
export {
  KvlError,
  KvlApiError,
  KvlNetworkError,
  KvlTimeoutError,
  KvlAbortError,
  KvlCircuitOpenError,
  isKvlApiError,
} from "./errors";
export type { ApiErrorCode } from "./generated/error-codes";
export type { AuthMode, AuthResult, LoginResult } from "./auth";
export {
  createLocalStorageTokenStore,
  createMemoryTokenStore,
  type TokenStore,
  type StoredTokens,
} from "./token-store";
export {
  loggingMiddleware,
  type Middleware,
  type RequestContext,
  type ResponseContext,
  type ErrorContext,
} from "./middleware";
export {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type RetryConfig,
  type CircuitBreakerConfig,
} from "./retry";
export type {
  paths as OpenApiPaths,
  components as OpenApiComponents,
} from "./generated/openapi-types";

export * from "./resources/types";
export * from "./resources/sessions";
export * from "./resources/api-keys";
export * from "./resources/tracking";
export * from "./resources/analytics";
export * from "./resources/reports";
export * from "./resources/webhooks";
export * from "./resources/organizations";
export * from "./resources/users";
export * from "./resources/service-accounts";
export * from "./resources/oauth";
export * from "./resources/notifications";
export * from "./resources/security-center";
export * from "./resources/platform-admin";
export { RealtimeClient } from "./realtime";
export { UploadsClient, type UploadProgressEvent, type UploadAvatarOptions } from "./uploads";
