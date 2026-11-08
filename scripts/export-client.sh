#!/usr/bin/env bash
# Publish the committed HEAD to the client repository as one snapshot commit:
# no personal history, and without the paths listed in .client-exclude.
# Usage:
#   scripts/export-client.sh --dry-run            show which files would be published
#   scripts/export-client.sh --commit "message"   create the filtered commit locally (not pushed)
#   scripts/export-client.sh --push               push the commit created by --commit
#   scripts/export-client.sh "message"            --commit and --push in one step
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
# Commit created by --commit and waiting for --push.
PENDING=refs/client-export/pending-$BRANCH
die() { echo "$*" >&2; exit 1; }
no_record() { die "No export/pull recorded on this machine for $REMOTE/$BRANCH ($1).
If your branch already contains everything on $REMOTE/$BRANCH, mark it synced with:
  git update-ref $SYNC $1"; }
remote_tip() { git ls-remote "$REMOTE" "refs/heads/$BRANCH" | cut -f1; }
# Refuse to build on a client branch that has commits we have not pulled.
check_synced() {
  local tip=$1 last
  [[ -n $tip ]] || return 0
  last=$(git rev-parse -q --verify "$SYNC" || true)
  [[ -n $last ]] || no_record "$tip"
  [[ $last == "$tip" ]] || die "$REMOTE/$BRANCH has commits you have not pulled. Run: $0 --pull"
}

pull() {
  [[ -z $(git status --porcelain --untracked-files=no) ]] || die "Commit or stash your changes before --pull."
  git fetch -q "$REMOTE" "$BRANCH"
  local tip last c opts
  tip=$(git rev-parse FETCH_HEAD)
  last=$(git rev-parse -q --verify "$SYNC" || true)
  [[ -n $last ]] || no_record "$tip"
  [[ $last != "$tip" ]] || { echo "Already up to date with $REMOTE/$BRANCH."; exit 0; }
  git merge-base --is-ancestor "$last" "$tip" || die "$REMOTE/$BRANCH history was rewritten; sync manually."
  # First-parent walk: a merged pull request is applied once, as its merge diff (-m 1).
  for c in $(git rev-list --reverse --first-parent "$last..$tip"); do
    echo "Applying $(git log -1 --format='%h %an: %s' "$c")"
    opts=(); [[ $(git rev-list --parents -n1 "$c" | wc -w) -gt 2 ]] && opts=(-m 1)
    git cherry-pick "${opts[@]}" "$c" || die "Conflict while applying $c.
Resolve it, run 'git cherry-pick --continue', then:
  git update-ref $SYNC $c && $0 --pull"
    git update-ref "$SYNC" "$c"
  done
  echo "Pulled $REMOTE/$BRANCH into $(git branch --show-current). Push to your own repo as usual."
}

# Builds the filtered tree of $REF into $TREE; lists exclusions when $1 is "show".
build_tree() {
  [[ -f .client-exclude ]] || die "Missing .client-exclude"
  if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
    echo "Note: uncommitted changes are NOT exported; exporting $REF $(git rev-parse --short "$REF")." >&2
  fi
  local patterns index leaks
  # Lines starting with ! keep a path that a broader pattern would exclude.
  mapfile -t patterns < <(grep -vE '^[[:space:]]*(#|$)' .client-exclude | sed -E 's/^!(.*)/:(exclude,glob)\1/; t; s/^/:(glob)/')
  index=$(mktemp)
  GIT_INDEX_FILE=$index git read-tree "$REF"
  GIT_INDEX_FILE=$index git rm -r -q --cached --ignore-unmatch -- "${patterns[@]}" .client-exclude scripts/export-client.sh
  TREE=$(GIT_INDEX_FILE=$index git write-tree)
  rm -f "$index"
  if [[ ${1:-} == show ]]; then
    echo "== Files excluded from the client export:"
    comm -23 <(git -c core.quotePath=false ls-tree -r --name-only "$REF") <(git -c core.quotePath=false ls-tree -r --name-only "$TREE")
    echo "== Files exported: $(git ls-tree -r --name-only "$TREE" | wc -l)"
  fi
  # Last line of defence: refuse to publish a tree that still mentions AI tooling.
  leaks=$(git grep -lIiE 'claude|anthropic|codex|chatgpt|openai|copilot|antigravity|ponytail|superpowers|AGENTS\.md|CLAUDE\.md' "$TREE" || true)
  [[ -z $leaks ]] || die "Refusing to export; AI keywords found in:
$leaks"
  [[ ${1:-} != show ]] || echo "== AI keyword check: clean"
}

make_commit() {
  local msg=$1 parent commit
  build_tree
  parent=$(remote_tip)
  check_synced "$parent"
  if [[ -n $parent ]]; then
    git fetch -q "$REMOTE" "$BRANCH"
    [[ $(git rev-parse "$parent^{tree}") != "$TREE" ]] || { echo "Client repo already up to date."; exit 0; }
  fi
  commit=$(git commit-tree "$TREE" ${parent:+-p "$parent"} -m "$msg")
  git update-ref "$PENDING" "$commit"
  echo "Created $(git rev-parse --short "$commit") from $(git rev-parse --short "$REF") (not pushed yet)."
}

push_pending() {
  local commit parent tip
  commit=$(git rev-parse -q --verify "$PENDING" || true)
  [[ -n $commit ]] || die "Nothing to push. Run: $0 --commit \"message\""
  parent=$(git rev-parse -q --verify "$commit^" || true)
  tip=$(remote_tip)
  [[ $tip == "$parent" ]] || die "$REMOTE/$BRANCH changed since --commit. Run: $0 --pull, then --commit again."
  check_synced "$tip"
  git push "$REMOTE" "$commit:refs/heads/$BRANCH"
  git update-ref "$SYNC" "$commit"
  git update-ref -d "$PENDING"
  echo "Pushed $(git rev-parse --short "$commit") -> $REMOTE/$BRANCH"
}

case ${1:-} in
  --pull) pull ;;
  --dry-run) build_tree show ;;
  --commit) [[ -n ${2:-} ]] || die "Usage: $0 --commit \"message\""; make_commit "$2"
    echo "Review: git show --stat $PENDING   |   Send: $0 --push" ;;
  --push) push_pending ;;
  ''|-*) die "Usage: $0 --dry-run | --commit \"message\" | --push | \"message\" | --pull" ;;
  *) make_commit "$1"; push_pending ;;
esac
