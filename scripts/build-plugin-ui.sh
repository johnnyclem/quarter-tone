#!/usr/bin/env bash
# Build the Vite cabinet UI and stage it into native/Resources/webui/ so
# CMake can glob it and embed the tree into the plugin bundle as
# BinaryData. Invoked by `npm run build:plugin-ui` before any cmake build.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${REPO_ROOT}/packages/app"
DIST_DIR="${APP_DIR}/dist"
OUT_DIR="${REPO_ROOT}/native/Resources/webui"

echo "[build-plugin-ui] Building Vite bundle in ${APP_DIR}"
pushd "${APP_DIR}" >/dev/null
npm run build
popd >/dev/null

echo "[build-plugin-ui] Replacing ${OUT_DIR}"
rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
cp -R "${DIST_DIR}/." "${OUT_DIR}/"

# Re-add the .gitkeep so empty-dist clones don't lose the marker.
touch "${OUT_DIR}/.gitkeep"

echo "[build-plugin-ui] Staged $(find "${OUT_DIR}" -type f | wc -l | tr -d ' ') files"
