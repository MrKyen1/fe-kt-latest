#!/usr/bin/env bash
# Publish the committed HEAD to the client repository as one snapshot commit:
# no personal history, and without the paths listed in .client-exclude.
# Usage:
#   scripts/export-client.sh --dry-run            show what would be published
#   scripts/export-client.sh "commit message"     publish HEAD to the client repo
#   scripts/export-client.sh --pull               cherry-pick new client commits into the current branch
# Env: CLIENT_REMOTE (default: client), CLIENT_BRANCH (default: main), EXPORT_REF (default: HEAD)
set -euo pipefail
export LC_ALL=C
cd "$(git rev-parse --show-toplevel)"
REMOTE=${CLIENT_REMOTE:-client}
REF=${EXPORT_REF:-HEAD}
BRANCH=${CLIENT_BRANCH:-main}
# Last client commit this machine has exported or pulled; anything after it was pushed by someone else.
SYNC=refs/client-sync/$BRANCH
die() { echo "$*" >&2; exit 1; }
no_record() { die "No export/pull recorded on this machine for $REMOTE/$BRANCH ($1).
If your branch already contains everything on $REMOTE/$BRANCH, mark it synced with:
  git update-ref $SYNC $1"; }

if [[ ${1:-} == --pull ]]; then
  [[ -z $(git status --porcelain --untracked-files=no) ]] || die "Commit or stash your changes before --pull."
  git fetch -q "$REMOTE" "$BRANCH"
  TIP=$(git rev-parse FETCH_HEAD)
  LAST=$(git rev-parse -q --verify "$SYNC" || true)
  [[ -n $LAST ]] || no_record "$TIP"
  [[ $LAST != "$TIP" ]] || { echo "Already up to date with $REMOTE/$BRANCH."; exit 0; }
  git merge-base --is-ancestor "$LAST" "$TIP" || die "$REMOTE/$BRANCH history was rewritten; sync manually."
  # First-parent walk: a merged pull request is applied once, as its merge diff (-m 1).
  for c in $(git rev-list --reverse --first-parent "$LAST..$TIP"); do
    echo "Applying $(git log -1 --format='%h %an: %s' "$c")"
    opts=(); [[ $(git rev-list --parents -n1 "$c" | wc -w) -gt 2 ]] && opts=(-m 1)
    git cherry-pick "${opts[@]}" "$c" || die "Conflict while applying $c.
Resolve it, run 'git cherry-pick --continue', then:
  git update-ref $SYNC $c && $0 --pull"
    git update-ref "$SYNC" "$c"
  done
  echo "Pulled $REMOTE/$BRANCH into $(git branch --show-current). Push to your own repo as usual."
  exit 0
fi

DRY=
if [[ ${1:-} == --dry-run ]]; then DRY=1; shift; fi
MSG=${1:-}
[[ -n $DRY || -n $MSG ]] || die "Usage: $0 [--dry-run] \"commit message\" | --pull"
[[ -f .client-exclude ]] || die "Missing .client-exclude"
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  echo "Note: uncommitted changes are NOT exported; exporting $REF $(git rev-parse --short "$REF")." >&2
fi

# Lines starting with ! keep a path that a broader pattern would exclude.
mapfile -t PATTERNS < <(grep -vE '^[[:space:]]*(#|$)' .client-exclude | sed -E 's/^!(.*)/:(exclude,glob)\1/; t; s/^/:(glob)/')
INDEX=$(mktemp)
trap 'rm -f "$INDEX"' EXIT
export GIT_INDEX_FILE=$INDEX
git read-tree "$REF"
git rm -r -q --cached --ignore-unmatch -- "${PATTERNS[@]}" .client-exclude scripts/export-client.sh
TREE=$(git write-tree)

# Last line of defence: refuse to publish a tree that still mentions AI tooling.
LEAKS=$(git grep -lIiE 'claude|anthropic|codex|chatgpt|openai|copilot|antigravity|ponytail|superpowers|AGENTS\.md|CLAUDE\.md' "$TREE" || true)

if [[ -n $DRY ]]; then
  echo "== Files excluded from the client export:"
  comm -23 <(git -c core.quotePath=false ls-tree -r --name-only "$REF") <(git -c core.quotePath=false ls-tree -r --name-only "$TREE")
  echo "== Files exported: $(git ls-tree -r --name-only "$TREE" | wc -l)"
  [[ -z $LEAKS ]] && echo "== AI keyword check: clean" || { echo "== AI keyword check FAILED:"; echo "$LEAKS"; exit 1; }
  exit 0
fi
[[ -z $LEAKS ]] || { echo "Refusing to export; AI keywords found in:" >&2; echo "$LEAKS" >&2; exit 1; }

PARENT=$(git ls-remote "$REMOTE" "refs/heads/$BRANCH" | cut -f1)
if [[ -n $PARENT ]]; then
  # The snapshot replaces the client branch content: never publish over commits we have not pulled.
  LAST=$(git rev-parse -q --verify "$SYNC" || true)
  [[ -n $LAST ]] || no_record "$PARENT"
  [[ $LAST == "$PARENT" ]] || die "$REMOTE/$BRANCH has commits you have not pulled. Run: $0 --pull"
  git fetch -q "$REMOTE" "$BRANCH"
  if [[ $(git rev-parse "$PARENT^{tree}") == "$TREE" ]]; then echo "Client repo already up to date."; exit 0; fi
fi
COMMIT=$(git commit-tree "$TREE" ${PARENT:+-p "$PARENT"} -m "$MSG")
git push "$REMOTE" "$COMMIT:refs/heads/$BRANCH"
git update-ref "$SYNC" "$COMMIT"
echo "Exported $(git rev-parse --short "$REF") -> $REMOTE/$BRANCH as $(git rev-parse --short "$COMMIT")"
