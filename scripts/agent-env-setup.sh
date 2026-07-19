#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.local"

require_vars() {
  local missing=()
  local name

  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      missing+=("${name}")
    fi
  done

  if (( ${#missing[@]} > 0 )); then
    printf 'Missing required Cloud Agent runtime secrets: %s\n' "${missing[*]}" >&2
    exit 1
  fi
}

upsert_env() {
  local name="$1"
  local value="$2"
  local temp

  temp="$(mktemp)"
  if [[ -f "${ENV_FILE}" ]]; then
    awk -v key="${name}" 'index($0, key "=") != 1 { print }' "${ENV_FILE}" > "${temp}"
  fi
  printf '%s=%s\n' "${name}" "${value}" >> "${temp}"
  mv "${temp}" "${ENV_FILE}"
}

setup_frontend_env() {
  require_vars \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    CLERK_SECRET_KEY \
    CLERK_JWT_ISSUER_DOMAIN

  upsert_env NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}"
  upsert_env CLERK_SECRET_KEY "${CLERK_SECRET_KEY}"
  upsert_env CLERK_JWT_ISSUER_DOMAIN "${CLERK_JWT_ISSUER_DOMAIN}"
  upsert_env CLERK_FRONTEND_API_URL \
    "${CLERK_FRONTEND_API_URL:-${CLERK_JWT_ISSUER_DOMAIN}}"
}

wait_for_convex() {
  local attempt

  for attempt in $(seq 1 90); do
    if npx convex env list >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  echo "Convex did not become ready within 90 seconds." >&2
  return 1
}

set_convex_env() {
  local name
  local required=(
    CLERK_JWT_ISSUER_DOMAIN
    GOOGLE_GENERATIVE_AI_API_KEY
    ANTHROPIC_API_KEY
    OPENAI_API_KEY
  )
  local optional=(
    GOOGLE_ANALYSIS_MODEL
    ANTHROPIC_REWRITE_MODEL
    OPENAI_CRITIQUE_MODEL
    PIPELINE_DEMO_MODE
    ALLOW_PIPELINE_DEMO_MODE
  )

  require_vars "${required[@]}"

  for name in "${required[@]}"; do
    npx convex env set "${name}" "${!name}" >/dev/null
  done

  npx convex env set CLERK_FRONTEND_API_URL \
    "${CLERK_FRONTEND_API_URL:-${CLERK_JWT_ISSUER_DOMAIN}}" >/dev/null

  # Demo fixtures require an explicit allow flag and must never land on prod.
  if [[ -n "${PIPELINE_DEMO_MODE:-}" && -z "${ALLOW_PIPELINE_DEMO_MODE:-}" ]]; then
    ALLOW_PIPELINE_DEMO_MODE=1
  fi

  for name in "${optional[@]}"; do
    if [[ -n "${!name:-}" ]]; then
      npx convex env set "${name}" "${!name}" >/dev/null
    fi
  done
}

bootstrap_convex() {
  # First pass provisions the anonymous local deployment. Auth env may be
  # missing yet, so allow that push to fail before secrets are written.
  CONVEX_AGENT_MODE=anonymous npx convex dev --once || true
  set_convex_env
  CONVEX_AGENT_MODE=anonymous npx convex dev --once
}

case "${1:-}" in
  setup)
    setup_frontend_env
    ;;
  bootstrap)
    setup_frontend_env
    bootstrap_convex
    ;;
  start)
    wait_for_convex
    set_convex_env
    exec npm run dev
    ;;
  *)
    echo "Usage: $0 setup|bootstrap|start" >&2
    exit 2
    ;;
esac
