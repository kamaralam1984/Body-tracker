# Features

Feature-based modules live here, one directory per domain (e.g. `sessions/`, `analytics/`).

Each feature is self-contained and typically includes its own `components/`, `hooks/`, `api/`,
and `types.ts`. Features may depend on `src/components`, `src/hooks`, and `src/lib`, but never
on each other directly — shared logic gets promoted to those top-level directories instead.

No feature modules exist yet; this directory is scaffolding for future business logic.
