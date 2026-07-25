"use client";

/**
 * Command — compound, generalized command-palette primitive: search input +
 * filtered, keyboard-navigable list + empty state. It renders no Portal or
 * backdrop of its own — embed it inside a Popover's content for an inline
 * searchable list, or inside a custom modal overlay for a full-screen
 * palette (see navigation/command-search.tsx for that overlay shape).
 *
 * @example
 * <Command>
 *   <CommandInput placeholder="Search pages…" autoFocus />
 *   <CommandList>
 *     <CommandEmpty />
 *     <CommandGroup heading="Pages">
 *       <CommandItem value="Dashboard" onSelect={() => go("/dashboard")}>
 *         Dashboard
 *       </CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandRegistryEntry {
  id: string;
  value: string;
  onSelect: () => void;
  order: number;
}

interface CommandContextValue {
  query: string;
  setQuery: (query: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  filteredIds: string[];
  registerItem: (id: string, value: string, onSelect: () => void) => void;
  unregisterItem: (id: string) => void;
  moveActive: (delta: number) => void;
  selectActive: () => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommandContext(component: string) {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error(`${component} must be used within <Command>`);
  return ctx;
}

interface CommandProps {
  className?: string;
  children: ReactNode;
}

export function Command({ className, children }: CommandProps) {
  const [query, setQuery] = useState("");
  const [registry, setRegistry] = useState<CommandRegistryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const orderRef = useRef(0);

  const registerItem = useCallback((id: string, value: string, onSelect: () => void) => {
    setRegistry((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx !== -1) {
        if (prev[idx].value === value && prev[idx].onSelect === onSelect) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], value, onSelect };
        return next;
      }
      return [...prev, { id, value, onSelect, order: orderRef.current++ }];
    });
  }, []);

  const unregisterItem = useCallback((id: string) => {
    setRegistry((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Filtering happens centrally here: a simple case-insensitive substring
  // match of the query against each registered item's `value`.
  const filteredIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registry
      .filter((e) => !q || e.value.toLowerCase().includes(q))
      .sort((a, b) => a.order - b.order)
      .map((e) => e.id);
  }, [registry, query]);

  // Keep the roving active id valid as the filtered set changes. This is
  // genuine state synchronization (the cursor is independently movable via
  // arrow keys, so it can't be a pure render-time derivation of filteredIds).
  useEffect(() => {
    if (filteredIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (activeId !== null) setActiveId(null);
      return;
    }
    if (!activeId || !filteredIds.includes(activeId)) {
      setActiveId(filteredIds[0]);
    }
  }, [filteredIds, activeId]);

  const moveActive = useCallback(
    (delta: number) => {
      if (filteredIds.length === 0) return;
      const currentIndex = activeId ? filteredIds.indexOf(activeId) : -1;
      let nextIndex = (currentIndex + delta) % filteredIds.length;
      if (nextIndex < 0) nextIndex += filteredIds.length;
      setActiveId(filteredIds[nextIndex]);
    },
    [filteredIds, activeId],
  );

  const selectActive = useCallback(() => {
    if (!activeId) return;
    registry.find((e) => e.id === activeId)?.onSelect();
  }, [activeId, registry]);

  const contextValue = useMemo<CommandContextValue>(
    () => ({
      query,
      setQuery,
      activeId,
      setActiveId,
      filteredIds,
      registerItem,
      unregisterItem,
      moveActive,
      selectActive,
    }),
    [query, activeId, filteredIds, registerItem, unregisterItem, moveActive, selectActive],
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      selectActive();
    }
  }

  return (
    <CommandContext.Provider value={contextValue}>
      <div
        onKeyDown={onKeyDown}
        className={cn(
          "border-border bg-surface-elevated flex flex-col overflow-hidden rounded-xl border shadow-lg",
          className,
        )}
      >
        {children}
      </div>
    </CommandContext.Provider>
  );
}

type CommandInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

export function CommandInput({ className, placeholder = "Search…", ...props }: CommandInputProps) {
  const ctx = useCommandContext("CommandInput");
  return (
    <div className="border-border-subtle flex items-center gap-2.5 border-b px-4 py-3">
      <Search className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />
      <input
        value={ctx.query}
        onChange={(e) => ctx.setQuery(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none",
          className,
        )}
        {...props}
      />
    </div>
  );
}

interface CommandListProps {
  className?: string;
  children: ReactNode;
}

export function CommandList({ className, children }: CommandListProps) {
  useCommandContext("CommandList");
  return (
    <div role="listbox" className={cn("max-h-80 overflow-y-auto p-1.5", className)}>
      {children}
    </div>
  );
}

interface CommandGroupProps {
  heading?: string;
  className?: string;
  children: ReactNode;
}

export function CommandGroup({ heading, className, children }: CommandGroupProps) {
  useCommandContext("CommandGroup");
  return (
    <div className={cn("mb-1 last:mb-0", className)}>
      {heading && (
        <div className="text-muted-foreground px-2.5 py-1.5 text-xs font-medium tracking-wide uppercase">
          {heading}
        </div>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

interface CommandItemProps {
  value: string;
  onSelect: () => void;
  icon?: LucideIcon;
  shortcut?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function CommandItem({
  value,
  onSelect,
  icon: Icon,
  shortcut,
  className,
  children,
}: CommandItemProps) {
  const ctx = useCommandContext("CommandItem");
  const id = useId();

  // Keep a stable callback identity registered so re-renders of the parent
  // (e.g. on every keystroke) don't churn the registry, while still always
  // invoking the latest `onSelect` passed in.
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  const stableOnSelect = useCallback(() => onSelectRef.current(), []);

  useEffect(() => {
    ctx.registerItem(id, value, stableOnSelect);
    return () => ctx.unregisterItem(id);
  }, [ctx, id, value, stableOnSelect]);

  if (!ctx.filteredIds.includes(id)) return null;

  const isActive = ctx.activeId === id;

  return (
    <button
      type="button"
      role="option"
      tabIndex={-1}
      aria-selected={isActive}
      data-selected={isActive ? "" : undefined}
      onMouseEnter={() => ctx.setActiveId(id)}
      onClick={() => onSelectRef.current()}
      className={cn(
        "text-foreground flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors duration-100",
        "hover:bg-muted focus-visible:ring-ring/40 focus-visible:ring-2 focus-visible:outline-none",
        isActive && "bg-muted",
        className,
      )}
    >
      {Icon && <Icon className="text-muted-foreground size-4 shrink-0" strokeWidth={1.75} />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {shortcut && <span className="text-muted-foreground shrink-0 text-xs">{shortcut}</span>}
    </button>
  );
}

export function CommandEmpty({ children = "No results found." }: { children?: ReactNode }) {
  const ctx = useCommandContext("CommandEmpty");
  if (ctx.filteredIds.length > 0) return null;
  return <p className="text-muted-foreground px-3 py-6 text-center text-sm">{children}</p>;
}
