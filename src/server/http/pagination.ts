/** Opaque cursor pagination — cursor is a base64url-encoded index into a stable, sorted list. */

export function encodeCursor(index: number): string {
  return Buffer.from(String(index), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  total: number;
}

export function paginate<T>(
  items: T[],
  cursor: string | null | undefined,
  limit: number,
): PageResult<T> {
  const start = decodeCursor(cursor);
  const page = items.slice(start, start + limit);
  const nextIndex = start + limit;
  return {
    items: page,
    nextCursor: nextIndex < items.length ? encodeCursor(nextIndex) : null,
    total: items.length,
  };
}
