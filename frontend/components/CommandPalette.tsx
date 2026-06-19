"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Clock3,
  FileSearch,
  Grid3X3,
  HelpCircle,
  KeyRound,
  Library,
  ListFilter,
  MessageSquareText,
  Search,
  Settings2,
  ShieldAlert,
  UploadCloud,
  type LucideIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command";
import { useDemoRole } from "@/components/RoleProvider";
import { routeWithRole } from "@/lib/role-routes";
import { cn } from "@/lib/utils";
import type { DemoRole, SearchResult, StockMediaAsset } from "@/lib/types";

type CommandGroupName = "Navigate" | "Actions";

type DamCommand = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  group: CommandGroupName;
  keywords: string[];
  shortcut?: string;
  roles?: DemoRole[];
  badge?: string;
  suggestion?: boolean;
};

type AssetSearchState =
  | { status: "idle"; assets: StockMediaAsset[]; message?: undefined }
  | { status: "loading"; assets: StockMediaAsset[]; message?: undefined }
  | { status: "results"; assets: StockMediaAsset[]; message?: undefined }
  | { status: "empty"; assets: StockMediaAsset[]; message: string }
  | { status: "error"; assets: StockMediaAsset[]; message: string };

type AssetSearchPayload = Pick<SearchResult, "assets" | "source" | "total">;

type CommandPaletteVariant = "compact" | "bar" | "shortcut" | "headless";

const commandGroups: CommandGroupName[] = ["Navigate", "Actions"];

const damCommands: DamCommand[] = [
  {
    id: "nav-library",
    label: "Media Library",
    description: "Browse cleared media with use guidance",
    href: "/library",
    icon: Library,
    group: "Navigate",
    keywords: ["photos", "find", "search", "media", "library", "browse"],
    shortcut: "G L",
    suggestion: true
  },
  {
    id: "nav-collections",
    label: "Albums & Events",
    description: "Open media grouped by ministry, event, or gathering",
    href: "/collections",
    icon: Grid3X3,
    group: "Navigate",
    keywords: ["collections", "ministries", "events", "channels", "review"],
    shortcut: "G C",
    suggestion: true
  },
  {
    id: "nav-review",
    label: "Review Uploads",
    description: "Review submitted photos before approval",
    href: "/review?queue=pending",
    icon: ShieldAlert,
    group: "Navigate",
    keywords: ["review", "approval", "queue", "pending", "uploads"],
    shortcut: "G R",
    roles: ["Reviewer", "DAM Admin"],
    badge: "Reviewer",
    suggestion: true
  },
  {
    id: "nav-upload",
    label: "Upload Photos",
    description: "Send event photos to the media team",
    href: "/upload",
    icon: UploadCloud,
    group: "Navigate",
    keywords: ["upload", "send", "submit", "event photos", "contributor"],
    shortcut: "G U",
    roles: ["Contributor", "Reviewer", "DAM Admin"],
    suggestion: true
  },
  {
    id: "nav-admin",
    label: "Support Zone",
    description: "Open readiness, role, and support checks",
    href: "/admin",
    icon: Settings2,
    group: "Navigate",
    keywords: ["admin", "settings", "roles", "safety"],
    shortcut: "G A",
    roles: ["DAM Admin"],
    badge: "Admin",
    suggestion: true
  },
  {
    id: "nav-requests",
    label: "Requests",
    description: "Ask for help, respond to media requests, or report an issue",
    href: "/requests",
    icon: MessageSquareText,
    group: "Navigate",
    keywords: ["requests", "ticket", "help", "rights issue", "media request"],
    shortcut: "G Q",
    suggestion: true
  },
  {
    id: "nav-my-uploads",
    label: "My Work",
    description: "Follow up on assigned uploads, reviews, and requests",
    href: "/my-tasks",
    icon: Clock3,
    group: "Navigate",
    keywords: ["my work", "my uploads", "inbox", "tasks", "uploads", "submitted"],
    shortcut: "G N",
    roles: ["Contributor", "Reviewer", "DAM Admin"],
    suggestion: true
  },
  {
    id: "nav-help",
    label: "Help Center",
    description: "Find media-use guidance and review help",
    href: "/help",
    icon: HelpCircle,
    group: "Navigate",
    keywords: ["help", "guide", "usage"],
    shortcut: "G ?"
  },
  {
    id: "action-search",
    label: "Search media",
    description: "Find church media by title, event, tag, or use guidance",
    href: "/library",
    icon: Search,
    group: "Actions",
    keywords: ["search", "find", "photos", "event", "tag"],
    shortcut: "/",
    suggestion: true
  },
  {
    id: "action-upload",
    label: "Upload Photos",
    description: "Start a photo submission",
    href: "/upload",
    icon: UploadCloud,
    group: "Actions",
    keywords: ["upload", "send", "new photos", "submission"],
    shortcut: "U",
    roles: ["Contributor", "Reviewer", "DAM Admin"],
    suggestion: true
  },
  {
    id: "action-review",
    label: "Review Uploads",
    description: "Open photos waiting for review",
    href: "/review?queue=pending",
    icon: ListFilter,
    group: "Actions",
    keywords: ["review", "pending", "uploads", "approval"],
    shortcut: "R",
    roles: ["Reviewer", "DAM Admin"],
    badge: "Reviewer",
    suggestion: true
  },
  {
    id: "action-admin",
    label: "Support Zone",
    description: "Open admin readiness checks",
    href: "/admin",
    icon: Settings2,
    group: "Actions",
    keywords: ["admin", "settings", "roles"],
    shortcut: "S",
    roles: ["DAM Admin"],
    badge: "Admin",
    suggestion: true
  }
];

function canUseCommand(command: DamCommand, role: DemoRole) {
  return !command.roles || command.roles.includes(role);
}

function roleAwareCommand(command: DamCommand, role: DemoRole): DamCommand {
  if (command.id !== "nav-my-uploads") return command;

  if (role === "Contributor") {
    return {
      ...command,
      label: "My Uploads",
      description: "Follow up on photos you submitted for review",
      href: "/recent-uploads"
    };
  }

  return {
    ...command,
    label: "My Work",
    description: "Follow up on assigned uploads, reviews, and requests",
    href: "/my-tasks"
  };
}

function commandMatches(command: DamCommand, terms: string[]) {
  if (!terms.length) return command.suggestion;
  const haystack = `${command.label} ${command.description} ${command.group} ${command.keywords.join(" ")}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

function assetStatusTone(asset: StockMediaAsset) {
  if (asset.reuseDecision?.downloadable) return "border-[#b9d8c6] bg-[#eff8f3] text-[#194f34]";
  if (asset.status === "Needs Review" || asset.status === "Possible Minors") return "border-[#e5cf93] bg-[#fff8e8] text-[#71500f]";
  if (asset.status === "Do Not Use") return "border-[#dfb9b5] bg-[#fff1ef] text-[#7b332f]";
  return "border-[#d2dbe6] bg-[#f2f6fa] text-[#27435b]";
}

function TriggerButton({
  variant,
  className,
  onOpen
}: {
  variant: CommandPaletteVariant;
  className?: string;
  onOpen: () => void;
}) {
  if (variant === "headless") return null;

  if (variant === "bar") {
    return (
      <button
        type="button"
        className={cn(
          "group grid h-11 w-full min-w-0 grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-[#c9d6ce] bg-white px-3 text-left text-sm font-black text-tjc-evergreen shadow-[0_10px_26px_rgba(15,61,46,.07)] transition hover:border-[#9ebdac] hover:bg-[#f7fbf8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/18 active:translate-y-px",
          className
        )}
        onClick={onOpen}
        aria-label="Open command palette"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#edf7f3] text-tjc-evergreen transition group-hover:bg-[#dff3ed]">
          <Search size={16} strokeWidth={1.9} aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-sm font-black text-[#2f3b34]">Search media, albums, requests...</span>
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
          <kbd className="rounded-md border border-[#c7d2ca] bg-[#f4f7f4] px-1.5 py-0.5 text-[11px] font-black text-tjc-muted">⌘K</kbd>
          <kbd className="rounded-md border border-[#c7d2ca] bg-[#f4f7f4] px-1.5 py-0.5 text-[11px] font-black text-tjc-muted">Ctrl K</kbd>
        </span>
      </button>
    );
  }

  if (variant === "shortcut") {
    return (
      <button
        type="button"
        className={cn(
          "inline-grid h-10 min-w-14 place-items-center rounded-lg border border-[#c9d6ce] bg-white px-3 text-sm font-black text-tjc-evergreen shadow-none transition hover:border-[#9ebdac] hover:bg-[#f7fbf8] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[#0d7970]/18 active:translate-y-px",
          className
        )}
        onClick={onOpen}
        aria-label="Open command palette"
        aria-keyshortcuts="Meta+K Control+K"
        title="Open command palette"
      >
        <kbd className="font-black tracking-[0]">⌘K</kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "group inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d3ded7] bg-white px-3 text-left text-sm font-black text-tjc-evergreen transition hover:border-[#a8c7bb] hover:bg-[#f7fbf8] active:translate-y-px md:w-10 md:px-0 2xl:w-auto 2xl:px-3",
        className
      )}
      onClick={onOpen}
      aria-label="Open command palette"
      aria-keyshortcuts="Meta+K Control+K"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#edf7f3] text-tjc-evergreen transition group-hover:bg-[#dff3ed]">
        <Search size={16} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span className="hidden text-sm font-black text-tjc-ink 2xl:inline">Search</span>
      <kbd className="hidden shrink-0 rounded-md border border-[#c7d2ca] bg-[#f4f7f4] px-1.5 py-0.5 text-[11px] font-black text-tjc-muted 2xl:inline">⌘K</kbd>
    </button>
  );
}

function CommandRow({
  command,
  current,
  onRun
}: {
  command: DamCommand;
  current: boolean;
  onRun: (href: string) => void;
}) {
  const Icon = command.icon;
  return (
    <CommandItem
      value={`${command.id} ${command.label} ${command.description} ${command.keywords.join(" ")}`}
      onSelect={() => onRun(command.href)}
      className="min-h-16 gap-3 rounded-lg border border-transparent px-3 py-2 data-selected:border-[#9bc6b5] data-selected:bg-[#edf7f1] data-selected:text-tjc-ink"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#c5d0c8] bg-white text-tjc-evergreen">
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <strong className="truncate text-[15px] font-black text-tjc-ink">{command.label}</strong>
          {current ? <Badge className="border-[#b9d8c6] bg-[#eff8f3] text-[#194f34]" variant="outline">Current</Badge> : null}
          {command.badge ? <Badge className="border-[#cbd8cf] bg-white text-tjc-muted" variant="outline">{command.badge}</Badge> : null}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-tjc-muted">{command.description}</span>
      </span>
      {command.shortcut === "Enter" ? <CommandShortcut className="rounded-md border border-[#d7e0da] bg-white px-2 py-1 text-[11px] font-black tracking-[0] text-tjc-muted">{command.shortcut}</CommandShortcut> : null}
    </CommandItem>
  );
}

function AssetRow({
  asset,
  showOpsMetadata,
  onRun
}: {
  asset: StockMediaAsset;
  showOpsMetadata: boolean;
  onRun: (href: string) => void;
}) {
  const trustLabel = asset.reuseDecision?.label || asset.status;
  const metadata = [
    asset.mediaType,
    showOpsMetadata && asset.resourceSpaceId ? `Reference ${asset.resourceSpaceId}` : null,
    showOpsMetadata ? asset.sourceSystem || asset.collection : asset.collection,
    asset.fileSizeBytes ? `${Math.max(1, Math.round(asset.fileSizeBytes / 1024))} KB` : null
  ].filter(Boolean).join(" · ");
  const commandValue = showOpsMetadata
    ? `asset ${asset.id} ${asset.title} ${asset.resourceSpaceId || ""} ${asset.collection} ${asset.status} ${asset.rightsStatus || ""}`
    : `asset ${asset.id} ${asset.title} ${asset.collection} ${asset.status}`;

  return (
    <CommandItem
      value={commandValue}
      onSelect={() => onRun(`/assets/${encodeURIComponent(asset.id)}`)}
      className="min-h-[5.5rem] gap-3 rounded-lg border border-transparent px-3 py-2 data-selected:border-[#9bc6b5] data-selected:bg-[#edf7f1] data-selected:text-tjc-ink"
    >
      <span className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-[#ccd8d0] bg-[#edf2ee]">
        {asset.thumbnail ? (
          <img className="size-full object-cover" src={asset.thumbnail} alt="" aria-hidden="true" loading="lazy" />
        ) : (
          <span className="grid size-full place-items-center text-tjc-muted"><FileSearch size={20} aria-hidden="true" /></span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="line-clamp-1 text-[15px] font-black text-tjc-ink">{asset.title}</strong>
        <span className="mt-1 block truncate text-xs font-semibold text-tjc-muted">{metadata}</span>
        <span className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          <Badge className={cn("border font-black", assetStatusTone(asset))} variant="outline">{asset.status}</Badge>
          {asset.rightsStatus ? <Badge className="border-[#d2dbe6] bg-[#f2f6fa] text-[#27435b]" variant="outline">{asset.rightsStatus}</Badge> : null}
          <Badge className="border-[#d8d4c6] bg-white text-tjc-muted" variant="outline">{trustLabel}</Badge>
        </span>
      </span>
      <CommandShortcut className="hidden rounded-md border border-[#d7e0da] bg-white px-2 py-1 text-[11px] font-black tracking-[0] text-tjc-muted sm:inline-flex">Open</CommandShortcut>
    </CommandItem>
  );
}

function StateRow({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return (
    <div className="grid min-h-20 grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-[#dbe4dd] bg-[#fbfdfb] px-4 py-3 text-left">
      <span className="grid size-11 place-items-center rounded-lg border border-[#c8d7cf] bg-white text-tjc-evergreen">{icon}</span>
      <span>
        <strong className="block text-sm font-black text-tjc-ink">{title}</strong>
        <span className="mt-0.5 block text-xs font-semibold text-tjc-muted">{detail}</span>
      </span>
    </div>
  );
}

export function CommandPalette({
  variant = "compact",
  className
}: {
  variant?: CommandPaletteVariant;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { role } = useDemoRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [assetState, setAssetState] = useState<AssetSearchState>({ status: "idle", assets: [] });
  const debouncedQuery = useDebouncedValue(query.trim(), 220);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const reviewer = role === "Reviewer" || role === "DAM Admin";

  const openPalette = useCallback(() => {
    lastActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    setAssetState({ status: "idle", assets: [] });
    window.setTimeout(() => lastActiveRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isCommand = event.metaKey || event.ctrlKey;
      if (isCommand && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  useEffect(() => {
    if (!open) return;
    const terms = debouncedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    const shouldSearchAssets = debouncedQuery.length >= 2 && !/^(?:rs\s*)?\d{2,}$/i.test(debouncedQuery);
    if (!shouldSearchAssets) {
      setAssetState({ status: "idle", assets: [] });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: debouncedQuery,
      role,
      limit: "6",
      sort: "Approved first"
    });
    setAssetState({ status: "loading", assets: [] });

    fetch(`/api/assets/search?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Search failed with ${response.status}`);
        return response.json() as Promise<AssetSearchPayload>;
      })
      .then((payload) => {
        if (!payload.assets?.length) {
          setAssetState({ status: "empty", assets: [], message: `No media found for "${debouncedQuery}".` });
          return;
        }
        const filtered = terms.length
          ? payload.assets.filter((asset) => {
              const haystack = reviewer
                ? `${asset.title} ${asset.resourceSpaceId || ""} ${asset.collection} ${asset.status} ${asset.rightsStatus || ""}`.toLowerCase()
                : `${asset.title} ${asset.collection} ${asset.status}`.toLowerCase();
              return terms.some((term) => haystack.includes(term)) || payload.assets.length <= 6;
            })
          : payload.assets;
        setAssetState({ status: "results", assets: filtered });
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setAssetState({ status: "error", assets: [], message: "Media search is unavailable. Navigation commands still work." });
      });

    return () => controller.abort();
  }, [debouncedQuery, open, role]);

  const visibleCommands = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const base = damCommands
      .map((command) => roleAwareCommand(command, role))
      .filter((command) => canUseCommand(command, role) && commandMatches(command, terms));
    const resourceId = query.trim().match(/^(?:rs\s*)?(\d{2,})$/i)?.[1];
    if (resourceId) {
      base.unshift({
        id: `asset-${resourceId}`,
        group: "Actions",
        label: `Open reference code ${resourceId}`,
        description: reviewer ? "Open media detail by reference code" : "Open media by reference code",
        href: `/assets/${resourceId}`,
        keywords: [resourceId, "reference", "photo"],
        icon: KeyRound,
        shortcut: "Enter"
      });
    }
    if (query.trim() && !resourceId) {
      base.push({
        id: `library-search-${query.trim()}`,
        group: "Actions",
        label: `Search media for "${query.trim()}"`,
        description: "Open Media Library with this query",
        href: `/library?q=${encodeURIComponent(query.trim())}`,
        keywords: [query],
        icon: Search,
        shortcut: "Enter"
      });
    }
    return base;
  }, [query, reviewer, role]);

  const groupedCommands = useMemo(() => {
    return commandGroups
      .map((group) => ({
        group,
        items: visibleCommands.filter((command) => command.group === group)
      }))
      .filter(({ items }) => items.length);
  }, [visibleCommands]);

  function runHref(href: string) {
    setOpen(false);
    setQuery("");
    setAssetState({ status: "idle", assets: [] });
    router.push(routeWithRole(href, role));
  }

  return (
    <>
      <TriggerButton variant={variant} className={className} onOpen={openPalette} />
      <CommandDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            openPalette();
          } else {
            closePalette();
          }
        }}
        title="Media portal quick switcher"
        description="Search media, navigate routes, and open role-aware workflows."
        className="top-4 max-h-[calc(100dvh-2rem)] w-[min(100%-1rem,64rem)] translate-y-0 border border-[#9fb4a8] bg-[#fbfdfb] p-0 text-tjc-ink shadow-[0_30px_80px_rgba(7,16,13,.26)] sm:top-10 sm:max-w-5xl"
      >
        <Command shouldFilter={false} className="rounded-xl bg-[#fbfdfb]">
          <div className="border-b border-[#c7d3cb] bg-white px-3 pb-3 pt-3 sm:px-5">
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm font-black text-tjc-ink">Media portal quick switcher</h2>
                <p className="mt-0.5 text-xs font-semibold text-tjc-muted">Find media, open uploads, and keep review actions role-aware.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge className="border-[#c9d6ce] bg-[#f6faf7] text-tjc-evergreen" variant="outline">Role: {role}</Badge>
                <kbd className="hidden rounded-md border border-[#c7d2ca] bg-[#f4f7f4] px-2 py-1 text-[11px] font-black text-tjc-muted sm:inline">Esc</kbd>
              </div>
            </div>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={role === "DAM Admin" ? "Search media, reference code, Support Zone..." : "Search media, reference code, upload or review..."}
              aria-label="Search media portal commands and media"
              className="min-h-12 text-base font-semibold text-tjc-ink placeholder:text-[#7d877f] sm:text-lg"
            />
          </div>

          <CommandList className="max-h-[calc(100dvh-15rem)] p-2 sm:max-h-[62dvh] sm:p-3">
            {groupedCommands.map(({ group, items }) => (
              <CommandGroup key={group} heading={group} className="command-center-group">
                <div className="grid gap-1">
                  {items.map((command) => (
                    <CommandRow
                      key={command.id}
                      command={command}
                      current={command.href === "/" ? pathname === "/" : pathname.startsWith(command.href.split("?")[0].split("#")[0])}
                      onRun={runHref}
                    />
                  ))}
                </div>
              </CommandGroup>
            ))}

            <CommandSeparator className="my-2 bg-[#d7e0da]" />

            <CommandGroup heading="Media" className="command-center-group">
              <div className="grid gap-1">
                {assetState.status === "idle" ? (
                  <StateRow
                    icon={<Search size={18} strokeWidth={1.8} aria-hidden="true" />}
                    title={query.trim().length ? "Keep typing to search media" : "Search church media"}
                    detail={query.trim().length ? "Media search starts at two letters. Commands are already filtered." : "Try Bible, Sabbath, Plant, Fountain, website hero, or a reference code."}
                  />
                ) : null}
                {assetState.status === "loading" ? (
                  <StateRow
                    icon={<Search size={18} strokeWidth={1.8} aria-hidden="true" />}
                    title="Searching media"
                    detail="Reading the current role-safe photo catalog."
                  />
                ) : null}
                {assetState.status === "error" || assetState.status === "empty" ? (
                  <StateRow
                    icon={<ShieldAlert size={18} strokeWidth={1.8} aria-hidden="true" />}
                    title={assetState.status === "error" ? "Media search unavailable" : "No media found"}
                    detail={assetState.message}
                  />
                ) : null}
                {assetState.status === "results" ? assetState.assets.map((asset) => (
                  <AssetRow key={asset.id} asset={asset} showOpsMetadata={reviewer} onRun={runHref} />
                )) : null}
              </div>
            </CommandGroup>

            <CommandEmpty className="py-8 text-sm font-semibold text-tjc-muted">
              No matching commands or media. Try a ministry term, event, tag, or reference code.
            </CommandEmpty>
          </CommandList>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#c7d3cb] bg-[#f5f8f5] px-4 py-3 text-xs font-semibold text-tjc-muted sm:px-5">
            <span>↑↓ move. Enter opens selected item. Esc closes.</span>
            <span>{reviewer ? "Reviewer actions stay evidence-aware." : "Use stays limited to approved media."}</span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}
