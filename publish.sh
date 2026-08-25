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

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "Website update $(date '+%Y-%m-%d %H:%M:%S')"

git pull --rebase origin main
git push origin main

echo "Published successfully."
