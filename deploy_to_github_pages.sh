#!/bin/sh
set -e

if [ $# -lt 1 ]
then
    echo "Usage: ... <SOURCE_FOLDER> <TARGET_BRANCH> <TARGET_REPO> <TARGET_BRANCH_REWRITE>"
    exit 1
fi

SOURCE_FOLDER="$1"
TARGET_BRANCH="${2:-'gh-pages'}"
TARGET_REPO="${3:-"$(git config --get remote.origin.url)"}"
TARGET_BRANCH_REWRITE="${4:-'false'}"
COMMIT_MESSAGE="$(git log -1 --format='%s')"
COMMIT_DETAILS="repository $(git config --get remote.origin.url)"$'\n'"$(git log -1 --format='commit %h%nAuthor: %an <%ae>%nDate:  %ad')"

echo "Deploy '${SOURCE_FOLDER}' to '${TARGET_REPO}' Branch: '${TARGET_BRANCH}'"


echo ''
echo "--- Checkout Target Branch"
target_repo_dir="$(mktemp -d)"
git clone --single-branch --branch "${TARGET_BRANCH}" --depth 1 "${TARGET_REPO}" "${target_repo_dir}"

echo ''
echo '--- Commit Changes'
(
  cd "${SOURCE_FOLDER}"
  export GIT_DIR="${target_repo_dir}/.git"
  (
    export GIT_WORK_TREE="${target_repo_dir}"
    git rm -rf . --quiet
  )
  git add . 
  if git commit --quiet -am "${COMMIT_MESSAGE}" -m "${COMMIT_DETAILS}"
  then
      git show --name-status --format=format:
      
      echo ''
      echo '--- Push Changes'
      if [ "$TARGET_BRANCH_REWRITE" != 'rewrite' ]
      then
        git push 'origin' "${TARGET_BRANCH}"
      else
        echo 'Rewrite Branch'
        git checkout --orphan 'tmp'       # Creates new temporary branch
        git commit --quiet -am "${COMMIT_MESSAGE}" -m "${COMMIT_DETAILS}"
        git branch -D "${TARGET_BRANCH}"  # Deletes the TARGET_BRANCH branch
        git branch -m "${TARGET_BRANCH}"  # Rename the temporary branch to TARGET_BRANCH
        git push --force 'origin' "${TARGET_BRANCH}" # Force push TARGET_BRANCH branch
      fi
  fi
)

echo ''
echo '--- Cleanup'
echo "Remove Target Repository '${target_repo_dir}'"
rm -rf "${target_repo_dir}"
