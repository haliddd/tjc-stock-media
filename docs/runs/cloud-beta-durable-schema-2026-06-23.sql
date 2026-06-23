-- TJC DAM cloud beta durable state schema.
-- Staging/Preview only. Do not run against production without Hali approval.
-- This schema stores portal workflow state, not ResourceSpace source/original media.

create extension if not exists pgcrypto;

create table if not exists beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  role text not null check (role in ('Viewer', 'Contributor', 'Reviewer', 'DAM Admin')),
  route text not null,
  task text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  expected text not null,
  actual text not null,
  reporter_name text,
  screenshot_url text,
  browser text,
  device text,
  viewport text,
  status text not null default 'new' check (status in ('new', 'triaged', 'agent-ready', 'fixed', 'wont-fix')),
  owner text not null default 'unassigned',
  incident_state text not null default 'none' check (incident_state in ('none', 'watch', 'triggered', 'resolved')),
  notes text,
  storage_mode text not null default 'postgres'
);

create index if not exists beta_feedback_status_created_idx on beta_feedback (status, created_at desc);
create index if not exists beta_feedback_route_idx on beta_feedback (route);
create index if not exists beta_feedback_severity_idx on beta_feedback (severity, created_at desc);

create table if not exists pending_review_writes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resource_id text not null,
  old_status text not null default 'Unknown',
  requested_status text not null,
  reviewer_role text not null check (reviewer_role in ('Reviewer', 'DAM Admin')),
  reviewer_name text,
  note text not null,
  checklist jsonb not null default '{}'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  sync_state text not null default 'queued' check (
    sync_state in (
      'queued',
      'ready_to_sync',
      'syncing',
      'sync_failed',
      'synced_to_resourcespace',
      'superseded',
      'cancelled',
      'conflict_detected'
    )
  ),
  retry_count integer not null default 0 check (retry_count >= 0),
  last_error text,
  resourcespace_sync_state text not null default 'not_synced',
  resource_space_written boolean not null default false
);

create index if not exists pending_review_writes_resource_idx on pending_review_writes (resource_id, updated_at desc);
create index if not exists pending_review_writes_sync_idx on pending_review_writes (sync_state, updated_at desc);

create table if not exists upload_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  submitted_by text not null,
  role text not null default 'Contributor' check (role in ('Contributor', 'DAM Admin')),
  status text not null default 'needs_review' check (status in ('submitted', 'processing', 'needs_review', 'blocked', 'imported')),
  default_asset_status text not null default 'Needs Review',
  default_usage_scope text not null default 'Do Not Publish',
  source jsonb not null default '{}'::jsonb,
  detected jsonb not null default '{}'::jsonb,
  media_inventory jsonb not null default '{}'::jsonb,
  suggestions jsonb not null default '{}'::jsonb,
  risk_flags jsonb not null default '[]'::jsonb,
  reviewer_tasks jsonb not null default '[]'::jsonb,
  admin_tasks jsonb not null default '[]'::jsonb,
  file_manifest jsonb not null default '[]'::jsonb,
  storage_state text not null default 'pending' check (storage_state in ('pending', 'private_staged', 'resourcespace_intake', 'blocked', 'failed')),
  storage_provider text,
  resource_space_written boolean not null default false
);

create index if not exists upload_intake_status_created_idx on upload_intake (status, created_at desc);
create index if not exists upload_intake_submitter_idx on upload_intake (submitted_by, created_at desc);

create table if not exists beta_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor text not null,
  role text not null,
  type text not null,
  status text not null,
  route text,
  asset_id text,
  resource_space_id text,
  summary text not null,
  details jsonb not null default '{}'::jsonb
);

create index if not exists beta_audit_events_created_idx on beta_audit_events (created_at desc);
create index if not exists beta_audit_events_type_idx on beta_audit_events (type, created_at desc);
create index if not exists beta_audit_events_resource_idx on beta_audit_events (resource_space_id, created_at desc);

-- Safety queries for pre-invite proof:
-- select count(*) from pending_review_writes where resource_space_written = true;
-- select count(*) from upload_intake where default_asset_status <> 'Needs Review' or default_usage_scope <> 'Do Not Publish';
-- select count(*) from upload_intake where storage_state = 'private_staged' and storage_provider is null;
