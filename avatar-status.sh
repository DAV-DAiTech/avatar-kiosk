#!/usr/bin/env bash
# Lists your LiveAvatar avatars and their status (INIT / DEPLOYING / ACTIVE / FAILED …).
# Reads the API key from .env next to this script and never prints it.
# Usage: ./avatar-status.sh
set -euo pipefail
cd "$(dirname "$0")"

KEY="$(grep -E '^LIVEAVATAR_API_KEY=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d "\"' \r" || true)"
if [ -z "$KEY" ] || [ "$KEY" = "paste-your-key-here" ]; then
  echo "No API key yet: paste it into .env (LIVEAVATAR_API_KEY=...) and save." >&2
  exit 1
fi

# Header goes in through stdin so the key never appears in the process list.
printf 'X-API-KEY: %s\n' "$KEY" |
  curl -sS --max-time 30 -H @- -w '\n%{http_code}' 'https://api.liveavatar.com/v1/avatars?page_size=100' |
  python3 -I avatar_status_fmt.py
