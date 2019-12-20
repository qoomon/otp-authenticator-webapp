#!/bin/sh
set -e

if [ $# -ne 4 ]; then
    echo "Usage: ... <SOURCE_FOLDER> <TARGET_REPO> <TARGET_BRANCH> <COMMIT_USER_NAME> "
    exit 1;
fi

SOURCE_FOLDER="$1"
TARGET_REPO="$2"
TARGET_BRANCH="$3"
COMMIT_USER_NAME="$4"
COMMIT_MESSAGE="$(git log -1 --format='%s')"
COMMIT_DETAILS="repository $(git config --get remote.origin.url)"$'\n'"$(git log -1 --format='commit %h%nAuthor: %an <%ae>%nDate:  %d')"

echo "Deploy '${SOURCE_FOLDER}' to '${TARGET_REPO}' Branch: '${TARGET_BRANCH}'"

echo ''
echo "--- Clone and Prepare Repository"
target_repo_dir="$(mktemp -d)"
(
  git clone --single-branch --branch "${TARGET_BRANCH}" --depth 1 "${TARGET_REPO}" "${target_repo_dir}"
  cd "${target_repo_dir}"
  #git remote set-url --push 'origin' "${TARGET_REPO}"
  git config user.name "${COMMIT_USER_NAME}"
  git config user.email "<>"
  git rm -rf . --quiet
)

echo ''
echo '--- Apply Changes'
cp -Rp "${SOURCE_FOLDER}/"* "${target_repo_dir}"
(
  cd "${target_repo_dir}"
  git add .
  if git commit -am "${COMMIT_MESSAGE}" -m "${COMMIT_DETAILS}"; then
      git show --name-status --format=format:
      echo ''
      echo "--- Push Changes"
      git push 'origin' "${TARGET_BRANCH}"
  fi
)
