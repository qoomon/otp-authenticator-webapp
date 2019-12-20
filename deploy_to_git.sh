#!/bin/sh
set -e

if [ $# -ne 3 ]; then
    echo "Usage: ... <SOURCE_FOLDER> <TARGET_REPO> <TARGET_BRANCH>"
    exit 1;
fi

SOURCE_FOLDER="$(cd "$1" && pwd)"

TARGET_REPO="$2"
TARGET_BRANCH="$3"
COMMIT_MESSAGE="$(git log -1 --format='Commit: %h - %s%nAuthor: %an <%ae>')\n$(git config --get remote.origin.url)"

echo "Deploy '${SOURCE_FOLDER}' to '${TARGET_REPO}' '${TARGET_BRANCH}'"

echo ''
echo "--- Clone Repository"
target_repo_dir="$(mktemp -d)"
git clone --single-branch --branch "${TARGET_BRANCH}" --depth 1 "${TARGET_REPO}" "${target_repo_dir}"
cd "${target_repo_dir}"

echo ''
echo '--- Apply Changes'
git rm -rf .
cp -Rp "${SOURCE_FOLDER}" .
git add .
if git commit -am "${COMMIT_MESSAGE}" --quiet; then
    git --no-pager log -n 1 --name-status --stat --oneline

    echo ''
    echo '--- Push Changes'
    git push 'origin' "${TARGET_BRANCH}"
fi
