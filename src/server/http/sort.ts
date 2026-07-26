import { ApiError } from "./errors";

/**
 * Parses `?sort=name,-createdAt` into a Prisma `orderBy` array. A leading
 * `-` means descending; fields not in `allowedFields` are rejected (rather
 * than silently ignored) so a typo'd sort field surfaces as a real 400
 * instead of quietly sorting by the wrong thing.
 */
export function parseSort(
  sort: string | undefined,
  allowedFields: readonly string[],
): Array<Record<string, "asc" | "desc">> {
  if (!sort) return [];
  return sort.split(",").map((rawField) => {
    const trimmed = rawField.trim();
    const descending = trimmed.startsWith("-");
    const field = descending ? trimmed.slice(1) : trimmed;
    if (!field || !allowedFields.includes(field)) {
      throw new ApiError(
        "bad_request",
        `Invalid sort field "${field}" — allowed: ${allowedFields.join(", ")}`,
      );
    }
    return { [field]: descending ? "desc" : "asc" };
  });
}

/** Builds a Prisma `OR` clause doing a case-insensitive substring match of `search` across `fields`, or `undefined` when there's nothing to search for. */
export function searchWhere(
  search: string | undefined,
  fields: readonly string[],
): { OR: Array<Record<string, { contains: string; mode: "insensitive" }>> } | undefined {
  if (!search) return undefined;
  return { OR: fields.map((field) => ({ [field]: { contains: search, mode: "insensitive" } })) };
}
