# Services

API clients and data-fetching layers live here (e.g. `api-client.ts`, per-resource service
modules). Services are the only layer allowed to perform network I/O — features and components
consume them through hooks, never by calling `fetch` directly.

No services are implemented yet; this directory is scaffolding for future integration work.
