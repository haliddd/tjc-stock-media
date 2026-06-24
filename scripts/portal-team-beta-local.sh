#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RESOURCE_ROOT="${RESOURCE_ROOT:-/Users/halim4pro/Desktop/MVP/tjc-stock-media}"
PORT="${PORT:-4885}"
CALLER_SSO_TRUSTED_HEADERS="${SSO_TRUSTED_HEADERS:-}"
CALLER_SSO_PROVIDER="${SSO_PROVIDER:-}"
CALLER_PORTAL_ALLOW_BETA_ROLE_OVERRIDE="${PORTAL_ALLOW_BETA_ROLE_OVERRIDE:-}"
CALLER_NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH="${NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH:-}"
CALLER_DOWNLOAD_GATE_ALLOW_DEMO_ROLES="${DOWNLOAD_GATE_ALLOW_DEMO_ROLES:-}"
CALLER_NEXT_PUBLIC_BETA_TASK_MODE_ENABLED="${NEXT_PUBLIC_BETA_TASK_MODE_ENABLED:-}"
CALLER_NEXT_PUBLIC_BETA_FEEDBACK_ENABLED="${NEXT_PUBLIC_BETA_FEEDBACK_ENABLED:-}"
ALLOW_UNSAFE_AUTH_ENV="${PORTAL_TEAM_BETA_ALLOW_UNSAFE_AUTH_ENV:-0}"

if [ ! -d "$RESOURCE_ROOT/.runtime" ]; then
  echo "Missing ResourceSpace runtime: $RESOURCE_ROOT/.runtime" >&2
  exit 1
fi

mkdir -p "$ROOT/.runtime"

link_runtime_dir() {
  local name="$1"
  local target="$RESOURCE_ROOT/.runtime/$name"
  local link="$ROOT/.runtime/$name"
  if [ ! -e "$target" ]; then
    echo "Missing ResourceSpace runtime directory: $target" >&2
    exit 1
  fi
  if [ -L "$link" ]; then
    local current
    current="$(readlink "$link")"
    if [ "$current" = "$target" ]; then
      return
    fi
    rm "$link"
  elif [ -e "$link" ]; then
    if find "$link" -mindepth 1 -maxdepth 1 | read -r _; then
      echo "Refusing to replace non-empty local runtime directory: $link" >&2
      exit 1
    fi
    rmdir "$link"
  fi
  ln -s "$target" "$link"
}

link_runtime_dir exports
link_runtime_dir filestore

if ! docker ps --format '{{.Names}}' | grep -qx 'tjc-resourcespace'; then
  (cd "$RESOURCE_ROOT" && make up)
fi

set -a
if [ -f "$RESOURCE_ROOT/.env" ]; then
  # shellcheck disable=SC1091
  source "$RESOURCE_ROOT/.env"
fi
if [ -f "$ROOT/.env.team-beta.local" ]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env.team-beta.local"
fi
set +a

if [ "$ALLOW_UNSAFE_AUTH_ENV" = "1" ]; then
  export SSO_PROVIDER="${CALLER_SSO_PROVIDER:-${SSO_PROVIDER:-}}"
  export SSO_TRUSTED_HEADERS="${CALLER_SSO_TRUSTED_HEADERS:-${SSO_TRUSTED_HEADERS:-0}}"
  export PORTAL_ALLOW_BETA_ROLE_OVERRIDE="${CALLER_PORTAL_ALLOW_BETA_ROLE_OVERRIDE:-${PORTAL_ALLOW_BETA_ROLE_OVERRIDE:-0}}"
  export NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH="${CALLER_NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH:-${NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH:-0}}"
  export DOWNLOAD_GATE_ALLOW_DEMO_ROLES="${CALLER_DOWNLOAD_GATE_ALLOW_DEMO_ROLES:-${DOWNLOAD_GATE_ALLOW_DEMO_ROLES:-0}}"
else
  export SSO_PROVIDER=
  export SSO_TRUSTED_HEADERS=0
  export PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0
  export NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0
  export DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
fi
export NEXT_PUBLIC_BETA_TASK_MODE_ENABLED="${CALLER_NEXT_PUBLIC_BETA_TASK_MODE_ENABLED:-${NEXT_PUBLIC_BETA_TASK_MODE_ENABLED:-1}}"
export NEXT_PUBLIC_BETA_FEEDBACK_ENABLED="${CALLER_NEXT_PUBLIC_BETA_FEEDBACK_ENABLED:-${NEXT_PUBLIC_BETA_FEEDBACK_ENABLED:-1}}"

cd "$ROOT/frontend"
exec npx next dev --port "$PORT"
