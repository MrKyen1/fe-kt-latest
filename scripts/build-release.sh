#!/usr/bin/env bash
# Build the production frontend into release/kata-web-<YYYYMMDD>-<commit>.tar.gz and,
# when an SSH target is given, upload it to that VPS home directory.
# Usage: scripts/build-release.sh [user@vps-host]
# Then on the VPS: cd /opt/kata-edu/be && sudo make fe-release FILE=~/kata-web-<version>.tar.gz
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
target=${1:-}
version=$(date +%Y%m%d)-$(git rev-parse --short HEAD)
# The name records the commit; uncommitted code would make it lie.
if [[ -n $(git status --porcelain --untracked-files=no -- . ':!.env') ]]; then
  version=$version-dirty
  echo "Warning: uncommitted changes are included; release named $version" >&2
fi
file=release/kata-web-$version.tar.gz

[[ -d node_modules ]] || npm ci
VITE_API_BASE_URL=/api/v1 npm run build
[[ -s dist/index.html ]] || { echo "Build produced no dist/index.html" >&2; exit 1; }
mkdir -p release
tar -czf "$file" -C dist .
echo "Built $file ($(du -h "$file" | cut -f1))"

if [[ -n $target ]]; then
  scp "$file" "$target:~/"
  echo "On the VPS: cd /opt/kata-edu/be && sudo make fe-release FILE=~/$(basename "$file")"
else
  echo "Upload:     scp $file <user>@<vps>:~/"
  echo "On the VPS: cd /opt/kata-edu/be && sudo make fe-release FILE=~/$(basename "$file")"
fi
