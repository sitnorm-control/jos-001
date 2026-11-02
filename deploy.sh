#!/usr/bin/env bash
# deploy.sh — commit and push the Situation Normal site to GitHub Pages.
# Works on macOS and on WSL/Linux: bash + git only.
#
# One-time setup per clone (keeps your personal identity out of the log):
#   git config user.name  "The Operator"
#   git config user.email "sitnorm.transmissions@users.noreply.github.com"
#   (the band's noreply address from GitHub Settings > Emails is better still)
#
# Usage:
#   ./deploy.sh                 # preview, verify, then commit and push
#   ./deploy.sh "message"       # same, with your own commit message
#   DRY_RUN=1 ./deploy.sh       # everything except the push

set -euo pipefail

SITE_DIR="${SITE_DIR:-$(cd "$(dirname "$0")" && pwd)}"
BRANCH="${BRANCH:-main}"
IDENTITY_NAME="${IDENTITY_NAME:-The Operator}"
PREVIEW_PORT="${PREVIEW_PORT:-8640}"
MSG="${1:-$(date -u +'%d%H%MZ %b %y' | tr '[:lower:]' '[:upper:]') // TRANSMISSION UPDATED}"

cd "$SITE_DIR"

# --- 1. sanity: this is the right repo -------------------------------------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "not a git repo: $SITE_DIR"; exit 1; }
REMOTE="$(git remote get-url origin 2>/dev/null || true)"
case "$REMOTE" in
  *sitnorm-control*) ;;
  *) echo "origin is '$REMOTE', not the band repo. Refusing."; exit 1 ;;
esac

# --- 2. verify the commit identity before anything else --------------------
NAME="$(git config user.name || true)"
EMAIL="$(git config user.email || true)"
if [[ "$NAME" != "$IDENTITY_NAME" || -z "$EMAIL" || "$EMAIL" == *forrester* || "$EMAIL" == *kforrester* ]]; then
  echo "OPERATOR CLASS: UNVERIFIED"
  echo "  user.name  = '${NAME:-<unset>}'"
  echo "  user.email = '${EMAIL:-<unset>}'"
  echo "Set the band identity in THIS repo first (see header). Refusing to commit."
  exit 1
fi

# --- 3. nothing to do? ------------------------------------------------------
if [[ -z "$(git status --porcelain)" ]]; then
  echo "NO CHANGES // NOTHING TO TRANSMIT"
  exit 0
fi

# --- 4. keep junk out of the public repo -----------------------------------
BAD="$(git status --porcelain | awk '{print $2}' | grep -Ei '(\.DS_Store|\.wav$|\.aif+$|\.mp3$|\.mov$|\.mp4$|_tmp|\.env$)' || true)"
if [[ -n "$BAD" ]]; then
  echo "These look like they should not go public:"
  echo "$BAD" | sed 's/^/  /'
  echo "Add them to .gitignore or remove them, then rerun."
  exit 1
fi

# --- 5. local preview check ------------------------------------------------
echo "CHANGES:"
git status --short | sed 's/^/  /'
if command -v python3 >/dev/null 2>&1; then
  echo
  echo "Preview: http://localhost:${PREVIEW_PORT}/  (Ctrl-C when done looking)"
  python3 -m http.server "$PREVIEW_PORT" --bind 127.0.0.1 >/dev/null 2>&1 || true
fi
echo
read -r -p "Transmit? [y/N] " ANSWER
[[ "$ANSWER" == [yY] ]] || { echo "ABORTED // NO CARRIER"; exit 0; }

# --- 6. commit and push ----------------------------------------------------
git add -A
git commit -m "$MSG"
echo "COMMIT: $(git log -1 --format='%h %an <%ae>')"
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  echo "DRY RUN // push skipped"
  exit 0
fi
git push origin "$BRANCH"
echo "TRANSMISSION COMPLETE // pages will rebuild in a minute or two"
