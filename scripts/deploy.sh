#!/usr/bin/env bash
# Project Zero: commit + push to GitHub, then pull, build and restart on the cloud VPS.
#
#   bash scripts/deploy.sh "commit message"   commit everything (respects .gitignore), push, deploy
#   bash scripts/deploy.sh -s                 skip commit/push, only deploy on the VPS
#   bash scripts/deploy.sh -n "message"       commit + push only, do not touch the VPS
#
# Key: uses .deploy/id_ed25519 if it exists (so Claude can run it too), else your normal ssh key.
set -euo pipefail

VPS_HOST="admin@cs.basehappy19.site"
VPS_PORT=2222
VPS_DIR='/var/www/html/project-zero.basehappy19.site'
PM2_APP="project-zero"
BRANCH="main"
GH_SSH="git@github.com:basehappy19/PROJECT_2050.git"

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

SERVER_ONLY=0; NO_DEPLOY=0
while getopts "sn" opt; do
  case $opt in s) SERVER_ONLY=1 ;; n) NO_DEPLOY=1 ;; *) exit 2 ;; esac
done
shift $((OPTIND-1))
MSG="${1:-}"

SSH_OPTS=(-p "$VPS_PORT" -o StrictHostKeyChecking=accept-new)
KEY="$ROOT/.deploy/id_ed25519"
if [ -f "$KEY" ]; then
  chmod 600 "$KEY" 2>/dev/null || true
  SSH_OPTS+=(-i "$KEY" -o IdentitiesOnly=yes)
  export GIT_SSH_COMMAND="ssh -i '$KEY' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
  PUSH_TARGET="$GH_SSH"
else
  PUSH_TARGET="origin"
fi

# no git identity on this machine (e.g. Claude's shell): commit as Claude, like the earlier commits
if ! git config user.email >/dev/null; then
  export GIT_AUTHOR_NAME="Claude" GIT_AUTHOR_EMAIL="noreply@anthropic.com"
  export GIT_COMMITTER_NAME="Claude" GIT_COMMITTER_EMAIL="noreply@anthropic.com"
fi

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

if [ "$SERVER_ONLY" -eq 0 ]; then
  step "git commit"
  git add -A
  if git diff --cached --quiet; then
    echo "nothing new to commit"
  else
    [ -n "$MSG" ] || { echo "error: give a commit message: bash scripts/deploy.sh \"message\""; exit 1; }
    git diff --cached --stat | tail -1
    git commit -q -m "$MSG"
    git log --oneline -1
  fi

  step "git push ($BRANCH)"
  git push "$PUSH_TARGET" "HEAD:$BRANCH"
  git fetch -q origin "$BRANCH" 2>/dev/null || true
fi

if [ "$NO_DEPLOY" -eq 0 ]; then
  step "VPS: pull, build, restart"
  # build output (assets/app-*.js, index.html, sw.js...) is rebuilt on the server, so reset it before pulling
  ssh "${SSH_OPTS[@]}" "$VPS_HOST" "bash -lc 'set -e; cd $VPS_DIR; git checkout -q -- . && git clean -fdq -- assets; git pull --ff-only && npm run build && pm2 restart $PM2_APP'"
fi

step "done"
