#!/bin/zsh
set -e

git add -A

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "Website update $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main

echo "Published successfully."
