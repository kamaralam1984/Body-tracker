"use client";

/**
 * Generic, composable data table: client-side sort, selection, search, and pagination
 * on top of the existing Table primitives.
 *
 * <DataTable
 *   data={sessions}
 *   getRowId={(row) => row.id}
 *   columns={[
 *     { key: "member", header: "Member", render: (row) => row.member, sortable: true },
 *     { key: "score", header: "Score", render: (row) => row.score, sortable: true, align: "right" },
 *   ]}
 *   searchable
 *   searchPlaceholder="Search sessions…"
 *   selectable
 *   pageSize={10}
 * />
 */

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search as SearchIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Pagination } from "./pagination";
import { Skeleton } from "./skeleton";
import { EmptyState } from "./empty-state";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sortable?: boolean;
  /** Used for sorting when `sortable` is true; falls back to the rendered node's string value. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (selected: Set<string>) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T>({
  data,
  columns,
  getRowId,
  searchable,
  searchPlaceholder = "Search…",
  searchKeys,
  selectable,
  selected,
  onSelectedChange,
  pageSize = 10,
  loading,
  emptyTitle = "No results",
  emptyDescription = "There's nothing to show yet.",
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [page, setPage] = useState(1);
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());

  const selectedIds = selected ?? internalSelected;
  const setSelectedIds = (next: Set<string>) => {
    onSelectedChange?.(next);
    if (!selected) setInternalSelected(next);
  };

  const filtered = useMemo(() => {
    if (!searchable || !query.trim() || !searchKeys) return data;
    const q = query.trim().toLowerCase();
    return data.filter((row) => searchKeys(row).toLowerCase().includes(q));
  }, [data, query, searchable, searchKeys]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDirection) return filtered;
    const column = columns.find((c) => c.key === sortKey);
    if (!column) return filtered;
    const getValue = column.sortValue ?? ((row: T) => String(column.render(row) ?? ""));
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDirection, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function toggleSort(key: string) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortKey(null);
      setSortDirection(null);
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleAllOnPage() {
    const pageIds = pageRows.map(getRowId);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    setSelectedIds(next);
  }

  const pageIds = pageRows.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someOnPageSelected = !allOnPageSelected && pageIds.some((id) => selectedIds.has(id));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {searchable && (
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          startIcon={<SearchIcon />}
          className="sm:max-w-xs"
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someOnPageSelected;
                  }}
                  onChange={toggleAllOnPage}
                  aria-label="Select all rows on this page"
                />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  column.align === "right" && "text-right",
                  column.align === "center" && "text-center",
                  column.className,
                )}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="hover:text-foreground inline-flex items-center gap-1 tracking-wide uppercase transition-colors"
                  >
                    {column.header}
                    {sortKey === column.key ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="size-3" strokeWidth={2} />
                      ) : (
                        <ArrowDown className="size-3" strokeWidth={2} />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 opacity-40" strokeWidth={2} />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: Math.min(pageSize, 5) }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                {selectable && (
                  <TableCell>
                    <Skeleton className="size-4 rounded-[5px]" />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : pageRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </TableCell>
            </TableRow>
          ) : (
            pageRows.map((row) => {
              const id = getRowId(row);
              const isSelected = selectedIds.has(id);
              return (
                <TableRow key={id} data-state={isSelected ? "selected" : undefined}>
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleRow(id)}
                        aria-label={`Select row ${id}`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === "right" && "text-right",
                        column.align === "center" && "text-center",
                        column.className,
                      )}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      {!loading && sorted.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Showing {pageRows.length} of {sorted.length} {sorted.length === 1 ? "row" : "rows"}
          </p>
          {totalPages > 1 && (
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
          )}
        </div>
      )}
    </div>
  );
}
