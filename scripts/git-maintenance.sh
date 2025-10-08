#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-origin}"
MAIN_BRANCH="${2:-main}"

check_remote() {
  if git remote get-url "$REMOTE" >/dev/null 2>&1; then
    echo "Remote '$REMOTE' detected. Fetching $MAIN_BRANCH..."
    if git fetch "$REMOTE" "$MAIN_BRANCH" >/dev/null 2>&1; then
      local_ref=$(git rev-parse "$MAIN_BRANCH" 2>/dev/null || echo "")
      remote_ref=$(git rev-parse "$REMOTE/$MAIN_BRANCH" 2>/dev/null || echo "")
      if [[ -n "$local_ref" && -n "$remote_ref" ]]; then
        if [[ "$local_ref" == "$remote_ref" ]]; then
          echo "Local $MAIN_BRANCH matches $REMOTE/$MAIN_BRANCH."
        else
          echo "Local $MAIN_BRANCH differs from $REMOTE/$MAIN_BRANCH." >&2
          git --no-pager log --oneline "${MAIN_BRANCH}..${REMOTE}/${MAIN_BRANCH}" || true
        fi
      else
        echo "Unable to resolve one of the refs for $MAIN_BRANCH." >&2
      fi
    else
      echo "Fetch failed for $REMOTE/$MAIN_BRANCH." >&2
    fi
  else
    echo "Remote '$REMOTE' is not configured; skipping fetch."
  fi
}

cleanup_benches() {
  if ! git rev-parse --verify "$MAIN_BRANCH" >/dev/null 2>&1; then
    echo "Main branch '$MAIN_BRANCH' not found locally; skipping bench cleanup." >&2
    return
  fi

  mapfile -t merged_branches < <(git for-each-ref --format='%(refname:short)' --merged "$MAIN_BRANCH")
  if [[ ${#merged_branches[@]} -eq 0 ]]; then
    echo "No branches are merged into $MAIN_BRANCH; nothing to prune."
    return
  fi

  deleted_any=0
  for branch in "${merged_branches[@]}"; do
    if [[ "$branch" == "$MAIN_BRANCH" ]]; then
      continue
    fi
    if [[ "$branch" == bench* || "$branch" == *bench* || "$branch" == *Bench* ]]; then
      if git branch -d "$branch" >/dev/null 2>&1; then
        echo "Deleted merged bench branch '$branch'."
        deleted_any=1
      fi
    fi
  done

  if [[ "$deleted_any" -eq 0 ]]; then
    echo "No merged bench branches found to delete."
  fi
}

check_remote
cleanup_benches
