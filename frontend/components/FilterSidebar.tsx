import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/ui";

type FilterOption = string | { label: string; value: string };
type FilterGroup = {
  label: string;
  priority: "primary" | "advanced";
  options: FilterOption[];
};

export const filterGroups = [
  { label: "Media type", priority: "primary", options: ["Photo", "Video", "Audio", "Graphic", "Document"] },
  {
    label: "Status",
    priority: "primary",
    options: [
      { label: "Ready to use", value: "portal ready" },
      "Approved public",
      "Approved internal",
      "Needs review",
      "Archive only"
    ]
  },
  {
    label: "Rights basis",
    priority: "primary",
    options: [
      "TJC-owned",
      "Contributor license",
      "Public domain",
      "Hymn license",
      "Fair use internal",
      { label: "Missing rights", value: "rights basis missing" }
    ]
  },
  {
    label: "Usage scope",
    priority: "primary",
    options: ["Church-wide use", "Internal ministry", "Archive only"]
  },
  {
    label: "Approved channel",
    priority: "advanced",
    options: ["Website channel", "Social channel", "Projection channel", "Print channel", "Livestream channel", "Internal training channel", "Limited share channel"]
  },
  {
    label: "People/minors",
    priority: "advanced",
    options: ["No people", { label: "Adults visible", value: "adults only" }, "People unknown", "Possible minors", "Children/youth"]
  },
  {
    label: "Sensitivity",
    priority: "advanced",
    options: ["Public-safe sensitivity", "Member sensitive", "Sacrament sensitive", "Youth sensitive", "Testimony sensitive", "Music rights", "Internal governance", "Archive restricted"]
  },
  {
    label: "Date",
    priority: "advanced",
    options: ["Recently approved", "Stale approval", "Recheck due", "Expired", "Embargoed"]
  },
  {
    label: "Format/dimensions",
    priority: "advanced",
    options: ["Landscape", "Square", "Portrait", { label: "JPEG", value: "file:jpg" }, { label: "PNG", value: "file:png" }, { label: "PDF", value: "file:pdf" }]
  },
  {
    label: "Rendition availability",
    priority: "advanced",
    options: ["Portal ready", { label: "Missing derivative", value: "rendition gap" }]
  },
  {
    label: "Duplicate/version state",
    priority: "advanced",
    options: [{ label: "Duplicate cleanup", value: "duplicate candidate" }, "Duplicate candidate"]
  }
] satisfies FilterGroup[];

function optionLabel(option: FilterOption) {
  return typeof option === "string" ? option : option.label;
}

function filterValue(option: FilterOption) {
  return typeof option === "string" ? option.toLowerCase() : option.value;
}

export function FilterSidebar({
  filters,
  onToggle,
  onClear,
  filterCounts = {},
  variant = "inline"
}: {
  filters: string[];
  onToggle: (filter: string) => void;
  onClear: () => void;
  filterCounts?: Record<string, number | undefined>;
  variant?: "inline" | "drawer";
}) {
  const primaryGroups = filterGroups.filter((group) => group.priority === "primary");
  const advancedGroups = filterGroups.filter((group) => group.priority === "advanced");
  const groups = variant === "drawer" ? primaryGroups : filterGroups;

  function renderGroup(group: (typeof filterGroups)[number]) {
    return (
      <section className={cn("border-b border-tjc-line/70 px-3 py-3", variant === "inline" && "md:border-r md:last:border-r-0")} key={group.label} aria-label={`${group.label} filters`}>
        <h2 className="mb-2 text-xs font-black uppercase text-[#65736b]">{group.label}</h2>
        <div className={cn("grid gap-1.5", variant === "drawer" ? "grid-cols-2" : "grid-cols-2")}>
          {group.options.map((option) => {
            const label = optionLabel(option);
            const value = filterValue(option);
            const active = filters.includes(value) || filters.includes(label);
            const count = filterCounts[value] ?? filterCounts[label.toLowerCase()] ?? filterCounts[label];
            return (
            <button
              type="button"
              key={label}
              className={cn(
                "flex min-h-9 items-center justify-between gap-2 rounded-md border border-tjc-line bg-white px-3 text-left text-xs font-black text-[#3e4741] transition hover:border-[#9bc5b5] hover:bg-[#eef7f1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0f4f45] active:translate-y-px",
                active && "border-[#92c2b0] bg-[#e8f5ef] text-tjc-evergreen"
              )}
              onClick={() => onToggle(value)}
              aria-pressed={active}
            >
              <span>{label}</span>
              {typeof count === "number" ? <em className="not-italic text-[11px] font-black text-[#65736b]">{count.toLocaleString()}</em> : null}
            </button>
          );})}
        </div>
      </section>
    );
  }

  return (
    <aside className={cn("overflow-hidden rounded-md border border-[#d1ddd2] bg-[#fbfdfb]", variant === "drawer" && "border-0 bg-transparent")} aria-label="Advanced filters">
      <div className="flex items-center justify-between gap-3 border-b border-tjc-line bg-[#f8fbf7] px-3 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-tjc-evergreen">
          <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={1.8} />
          <strong>Filters</strong>
          {variant === "drawer" ? <span className="rounded-md bg-[#e6f0eb] px-2 py-0.5 text-xs font-black text-tjc-evergreen">Primary first</span> : null}
        </div>
        {filters.length ? (
          <button className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-tjc-muted transition hover:bg-[#eef4f1] hover:text-tjc-evergreen" type="button" onClick={onClear}>
            <X size={13} strokeWidth={1.8} aria-hidden="true" />
            Reset
          </button>
        ) : null}
      </div>
      <div className={cn("grid gap-0", variant === "drawer" ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-4")}>
        {groups.map(renderGroup)}
      </div>
      {variant === "drawer" ? (
        <details className="border-t border-tjc-line bg-white">
          <summary className="cursor-pointer px-3 py-3 text-sm font-black text-tjc-evergreen">Advanced filters</summary>
          <div className="grid gap-0 sm:grid-cols-2">{advancedGroups.map(renderGroup)}</div>
        </details>
      ) : null}
    </aside>
  );
}
