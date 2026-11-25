#!/usr/bin/env bash
# Regera as baselines da regressão visual (e2e/__screenshots__) no container Linux oficial do
# Playwright, na mesma versão instalada no projeto — as mesmas fontes e o mesmo render do CI.
# Sem Docker: rode o job manual "visual-baselines" do CI e baixe o artefato.
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker indisponível. Use o job 'visual-baselines' (workflow_dispatch) do CI." >&2
  exit 1
fi

VERSION="$(node -p "require('./node_modules/@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

# node_modules num volume próprio: o container instala dependências Linux sem tocar nas do host.
docker run --rm --ipc=host \
  -v "$PWD":/work \
  -v kurio-visual-node-modules:/work/node_modules \
  -w /work \
  -e VISUAL_UPDATE=1 \
  -e CI=1 \
  "$IMAGE" \
  bash -c "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e visual --update-snapshots --project=chromium-desktop --project=chromium-mobile"

echo "Baselines atualizadas em e2e/__screenshots__ (imagem ${IMAGE})."
