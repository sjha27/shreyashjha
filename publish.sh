#!/bin/zsh
set -e

echo "Checking website before publishing..."

# Make sure required files exist
if [ ! -f "index.html" ]; then
  echo "ERROR: index.html is missing."
  exit 1
fi

# Block common secret files from accidentally being tracked
if git ls-files | grep -E '(^|/)(\.env|\.env\..*|.*\.pem|.*\.key)$' >/dev/null; then
  echo "ERROR: Possible sensitive file is tracked by Git."
  exit 1
fi

# Basic HTML sanity check
if ! grep -qi "<html" index.html; then
  echo "ERROR: index.html does not appear to contain an HTML document."
  exit 1
fi

git add -A

# Committing and pushing are independent questions. The previous version
# exited here whenever nothing was staged -- so a commit made by hand was
# never pushed, while the script still reported success.
if git diff --cached --quiet; then
  echo "Nothing new to commit."
else
  git commit -m "Website update $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Committed local changes."
fi

git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "none")

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "Already published: origin/main is at $LOCAL"
  exit 0
fi

AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
echo "Local main is $AHEAD commit(s) ahead of origin/main. Pushing..."

git pull --rebase origin main
git push origin main

# Never report success on the strength of the push exiting 0 -- confirm the
# commit actually landed on the remote.
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "ERROR: push did not take effect."
  echo "  local  HEAD : $LOCAL"
  echo "  origin/main : $REMOTE"
  exit 1
fi

echo "Published successfully. origin/main verified at $LOCAL"
