import { format } from "date-fns";

export function formatReleaseDate(iso: string): string {
  return format(new Date(iso), "MMMM d, yyyy");
}
