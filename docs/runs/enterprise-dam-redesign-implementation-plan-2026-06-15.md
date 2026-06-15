# Enterprise DAM Redesign Implementation Plan

## Inspection Summary

- Framework: Next.js 15 App Router with React 19 and Tailwind v4.
- Routes: `/` Library, `/upload`, `/review`, `/collections`, `/packages`, `/admin`, `/insights`, `/guide`, `/brand-hub`, `/beta-login`, and asset detail routes.
- Shell: `AppChrome` wraps all app routes in `DamShell`; live sidebar comes from `components/dam/shell/AppSidebar.tsx` and `damShellNav.ts`.
- Shared UI: existing app has buttons, badges, sheets, sidebar primitives, pagination, command palette, and large enterprise page components under `components/dam/enterprise`.
- Data/statuses: current model still uses legacy values such as `Approved Public`, `Needs Review`, `Do Not Use`, `Possible Minors`, and beta/test labels in UI copy.
- Responsive behavior: shell uses shadcn sidebar with mobile drawer behavior, but no real bottom app nav. Several pages retain desktop-heavy grids.
- Tokens: current CSS mixes green/blue enterprise tokens with older large-card DAM v2/v3 styling. Sidebar width is 15rem; operational footer is global.
- Pages inspected: Library, Collections, Distribution Sets, Upload / Intake, Review Queue, Admin/Governance, Help, Insights. Rights & Consent, Metadata Health, Policy Center, and Audit Log are currently query/hash sections rather than first-class screens.

## Implementation Plan

1. Refactor shell/navigation around enterprise DAM groups and add mobile bottom nav.
2. Add canonical DAM status system, realistic sample asset records, and shared operational components.
3. Replace live Library, Upload, Review Queue, Collections, Distribution Set, Governance/Admin, Insights, and Help Center surfaces with enterprise DAM layouts.
4. Add responsive CSS for desktop three-pane/table layouts and mobile one-task layouts.
5. Remove operational footer except Help Center.
6. Verify with typecheck/build and rendered responsive checks.
