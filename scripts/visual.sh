#!/usr/bin/env bash
# Regressão visual (e2e/visual.spec.ts) no container Linux oficial do Playwright, na mesma versão
# instalada no projeto: as mesmas fontes e o mesmo render das baselines versionadas e do CI.
#
#   bash scripts/visual.sh            compara com as baselines em e2e/__screenshots__
#   bash scripts/visual.sh --update   regera as baselines
#
# Sem Docker: rode o job manual "visual-baselines" do CI e baixe o artefato.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker indisponível. Use o job 'visual-baselines' (workflow_dispatch) do CI." >&2
  exit 1
fi

UPDATE=0
[[ "${1:-}" == "--update" ]] && UPDATE=1

VERSION="$(node -p "require('./node_modules/@playwright/test/package.json').version")"
PNPM="$(node -p "require('./package.json').packageManager")"
# No Git Bash do Windows, o Docker precisa do caminho no formato C:/...
HOST_DIR="$(pwd -W 2>/dev/null || pwd)"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"
ARGS="visual --project=chromium-desktop --project=chromium-mobile"
[[ "$UPDATE" == 1 ]] && ARGS="$ARGS --update-snapshots"

# node_modules, dist e o store do pnpm em volumes próprios: o container instala dependências Linux e
# gera o build sem escrever nada no checkout além das baselines.
MSYS_NO_PATHCONV=1 docker run --rm --ipc=host \
  -v "$HOST_DIR":/work \
  -v kurio-visual-node-modules:/work/node_modules \
  -v kurio-visual-dist:/work/dist \
  -v kurio-visual-pnpm-store:/pnpm-store \
  -e npm_config_store_dir=/pnpm-store \
  -w /work \
  -e VISUAL_UPDATE="$UPDATE" \
  -e CI=1 \
  ${NODE_OPTIONS:+-e NODE_OPTIONS} \
  "$IMAGE" \
  bash -c "npm install -g --silent ${PNPM} && pnpm install --frozen-lockfile && pnpm exec playwright test ${ARGS}"

if [[ "$UPDATE" == 1 ]]; then
  echo "Baselines atualizadas em e2e/__screenshots__ (imagem ${IMAGE})."
fi
