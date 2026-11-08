#!/usr/bin/env bash
# Publish the committed HEAD to the client repository as one snapshot commit:
# no personal history, and without the paths listed in .client-exclude.
# Several teammates may export the same client repo: an export made by someone else
# from commits you already have (after git pull) is recognised automatically.
# Usage:
#   scripts/export-client.sh --dry-run            show which files would be published
#   scripts/export-client.sh --commit "message"   create the filtered commit locally (not pushed)
#   scripts/export-client.sh --push               push the commit created by --commit
#   scripts/export-client.sh "message"            --commit and --push in one step
#   scripts/export-client.sh --pull               cherry-pick client-side commits into the current branch
# Env: CLIENT_REMOTE (default: client), CLIENT_BRANCH (default: main), EXPORT_REF (default: HEAD)
set -euo pipefail
export LC_ALL=C
cd "$(git rev-parse --show-toplevel)"
REMOTE=${CLIENT_REMOTE:-client}
REF=${EXPORT_REF:-HEAD}
BRANCH=${CLIENT_BRANCH:-main}
# Last client commit known to contain nothing missing from this machine.
SYNC=refs/client-sync/$BRANCH
# Commit created by --commit and waiting for --push.
PENDING=refs/client-export/pending-$BRANCH
# How far back to look for the commit a teammate's export was made from.
SCAN_DEPTH=300
die() { echo "$*" >&2; exit 1; }
remote_tip() { git ls-remote "$REMOTE" "refs/heads/$BRANCH" | cut -f1; }

[[ -f .client-exclude ]] || die "Missing .client-exclude"
# Lines starting with ! keep a path that a broader pattern would exclude.
mapfile -t PATTERNS < <(grep -vE '^[[:space:]]*(#|$)' .client-exclude | sed -E 's/^!(.*)/:(exclude,glob)\1/; t; s/^/:(glob)/')

filtered_tree() {
  local index tree
  index=$(mktemp)
  GIT_INDEX_FILE=$index git read-tree "$1"
  # -f: older commits differ from the working tree; --cached keeps this index-only.
  GIT_INDEX_FILE=$index git rm -r -q -f --cached --ignore-unmatch -- "${PATTERNS[@]}" .client-exclude scripts/export-client.sh
  tree=$(GIT_INDEX_FILE=$index git write-tree)
  rm -f "$index"
  echo "$tree"
}

# Filtered trees of our recent commits: a client commit with one of these trees is an
# export of code we already have (made by us or a teammate), so it needs no pulling.
declare -A KNOWN=()
is_ours() {
  local c
  if [[ ${#KNOWN[@]} -eq 0 ]]; then
    for c in $(git rev-list --max-count="$SCAN_DEPTH" "$REF"); do KNOWN[$(filtered_tree "$c")]=$c; done
  fi
  [[ -n ${KNOWN[$(git rev-parse "$1^{tree}")]:-} ]]
}

# Refuse to build on a client branch that has changes we do not have.
check_synced() {
  local tip=$1 last
  [[ -n $tip ]] || return 0
  last=$(git rev-parse -q --verify "$SYNC" || true)
  [[ $last != "$tip" ]] || return 0
  git fetch -q "$REMOTE" "$BRANCH"
  if is_ours "$tip"; then
    git update-ref "$SYNC" "$tip"
    echo "$REMOTE/$BRANCH is an export of commits you already have; continuing."
    return 0
  fi
  die "$REMOTE/$BRANCH has changes you do not have. Run: $0 --pull"
}

pull() {
  [[ -z $(git status --porcelain --untracked-files=no) ]] || die "Commit or stash your changes before --pull."
  git fetch -q "$REMOTE" "$BRANCH"
  local tip last c opts range
  tip=$(git rev-parse FETCH_HEAD)
  last=$(git rev-parse -q --verify "$SYNC" || true)
  [[ $last != "$tip" ]] || { echo "Already up to date with $REMOTE/$BRANCH."; exit 0; }
  if [[ -n $last ]]; then
    git merge-base --is-ancestor "$last" "$tip" || die "$REMOTE/$BRANCH history was rewritten; sync manually."
    range="$last..$tip"
  else
    # No record on this machine: walk the whole client history.
    range=$tip
  fi
  # First-parent walk: a merged pull request is applied once, as its merge diff (-m 1).
  for c in $(git rev-list --reverse --first-parent "$range"); do
    if is_ours "$c"; then
      git update-ref "$SYNC" "$c"
      continue
    fi
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
  if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
    echo "Note: uncommitted changes are NOT exported; exporting $REF $(git rev-parse --short "$REF")." >&2
  fi
  local leaks
  TREE=$(filtered_tree "$REF")
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
  [[ $tip == "$parent" ]] || die "$REMOTE/$BRANCH changed since --commit. Run: $0 --commit \"message\" again (it pulls in a teammate's export automatically; client-side changes need --pull first)."
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
