#!/bin/bash
# Пуш сайта на GitHub: tools/push.sh "сообщение коммита"
# Токен: tools/.gh_token (tools/ в репозиторий не попадает)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
W="$(cd "$SCRIPT_DIR/.." && pwd)"
[ -f "$SCRIPT_DIR/.gh_token" ] || { echo "нет tools/.gh_token"; exit 1; }
T=$(cat "$SCRIPT_DIR/.gh_token"); R="https://x-access-token:$T@github.com/ssgssbex1080/ssgssbex1080.github.io.git"
if [ ! -d /tmp/gh/.git ]; then rm -rf /tmp/gh; git clone -q --depth 1 "$R" /tmp/gh; fi
cd /tmp/gh && git pull -q "$R" main 2>/dev/null || true
cd "$W" && tar --exclude=./mod-src --exclude=./assets/vanilla --exclude=__pycache__ --exclude=./.git --exclude=./_render.html --exclude=./tools/.gh_token -cf - . | (cd /tmp/gh && tar -xf -)
cd /tmp/gh && git add -A
if git diff --cached --quiet; then echo "нечего коммитить"; exit 0; fi
git -c user.name=zitraks -c user.email=zitraks@users.noreply.github.com commit -qm "$1"
git push "$R" HEAD:main 2>&1 | sed "s/$T/***/g" | tail -1
git log --oneline -1
