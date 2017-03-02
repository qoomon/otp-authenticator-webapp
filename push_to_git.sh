#!/bin/sh
set -e

# source https://gist.github.com/qoomon/41697079eef82a56f8de51357c7ee9d9

if [ $# -ne 3 ]; then
    echo "Usage: ... <SOURCE_FOLDER> <TARGET_REPO> <TARGET_BRANCH>"
    exit 1;
fi

SOURCE_FOLDER="$1"

TARGET_REPO="$2"
TARGET_BRANCH="$3"
COMMIT_MESSAGE="$(git log --format='%h %s%nAuthor: %an <%ae>')\n$(git config --get remote.origin.url)"

echo "Deploy '$SOURCE_FOLDER' to '${TARGET_REPO}' '$TARGET_BRANCH'"

cd "${SOURCE_FOLDER}";

rm -rf '.git'
git init

echo ''
echo '--- Stash Files'
git commit --allow-empty -m '.' --quiet
git add .
git stash --quiet

echo ''
echo '--- Pull Target Repository'
git branch --move "${TARGET_BRANCH}"
git remote add 'origin' "${TARGET_REPO}"
git pull --rebase --no-tags --depth 1 'origin' "${TARGET_BRANCH}"
git branch --set-upstream-to="origin/${TARGET_BRANCH}" --quiet

echo ''
echo '--- Update to Stash & Commit Changes'
git rm -r . --ignore-unmatch --quiet
git stash pop --quiet
if git commit -am "$COMMIT_MESSAGE" --quiet; then
    git --no-pager log -n 1 --name-status --stat --oneline

    echo ''
    echo '--- Push Changes'
    git push 'origin' "${TARGET_BRANCH}"
fi
