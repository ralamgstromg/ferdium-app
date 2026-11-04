#!/usr/bin/env bash
# Prepara el entorno de Ferdium y arranca el modo desarrollo.
#
# - Usa Node y pnpm con las versiones fijadas en el proyecto (.nvmrc y packageManager).
# - Si el sistema no tiene esas versiones, las descarga en una caché fuera del repo
#   (${FERDIUM_TOOLS_DIR:-~/.cache/ferdium-tools}) sin modificar el sistema.
# - Inicializa el submódulo de recetas, instala dependencias y ejecuta `pnpm start:all-dev`.
#
# Uso: ./start-env.sh            (instala si hace falta y arranca en desarrollo)
#      ./start-env.sh --setup    (solo prepara el entorno, sin arrancar la app)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

CACHE_DIR="${FERDIUM_TOOLS_DIR:-$HOME/.cache/ferdium-tools}"
NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"
PNPM_VERSION="$(sed -n 's/.*"packageManager": *"pnpm@\([^"]*\)".*/\1/p' package.json)"

log() { printf '\033[1;34m[start-env]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[start-env] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

command -v npm >/dev/null 2>&1 || die "npm no está instalado (necesario para provisionar Node y pnpm)."

ensure_node() {
  if [[ "$(node -v 2>/dev/null || true)" == "v$NODE_VERSION" ]]; then
    log "Node v$NODE_VERSION ya disponible en el sistema."
    return
  fi
  local os arch
  case "$(uname -s)" in
    Linux) os=linux ;;
    Darwin) os=darwin ;;
    *) die "SO no soportado para descargar Node automáticamente: $(uname -s)" ;;
  esac
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) die "Arquitectura no soportada: $(uname -m)" ;;
  esac

  local prefix="$CACHE_DIR/node-$NODE_VERSION"
  local name="node-v$NODE_VERSION-$os-$arch"
  if [[ ! -x "$prefix/bin/node" ]]; then
    log "Descargando Node v$NODE_VERSION oficial en $prefix ..."
    mkdir -p "$prefix"
    local tmp
    tmp="$(mktemp -d)"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/$name.tar.xz" -o "$tmp/$name.tar.xz"
    curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
    (cd "$tmp" && grep " $name.tar.xz\$" SHASUMS256.txt | sha256sum -c --quiet -) \
      || die "Checksum de Node v$NODE_VERSION no coincide; descarga abortada."
    tar -xJf "$tmp/$name.tar.xz" -C "$prefix" --strip-components=1
    rm -rf "$tmp"
  fi
  export PATH="$prefix/bin:$PATH"
  [[ "$(node -v)" == "v$NODE_VERSION" ]] || die "No se pudo activar Node v$NODE_VERSION."
  log "Usando Node $(node -v) (caché)."
}

ensure_pnpm() {
  [[ -n "$PNPM_VERSION" ]] || die "No se pudo leer la versión de pnpm de package.json."
  if [[ "$(pnpm -v 2>/dev/null || true)" == "$PNPM_VERSION" ]]; then
    log "pnpm $PNPM_VERSION ya disponible en el sistema."
    return
  fi
  local prefix="$CACHE_DIR/pnpm-$PNPM_VERSION"
  if [[ ! -x "$prefix/node_modules/.bin/pnpm" ]]; then
    log "Descargando pnpm $PNPM_VERSION en $prefix ..."
    npm install --prefix "$prefix" --no-save --no-audit --no-fund "pnpm@$PNPM_VERSION"
  fi
  export PATH="$prefix/node_modules/.bin:$PATH"
  log "Usando pnpm $(pnpm -v) (caché)."
}

ensure_recipes() {
  if [[ -z "$(ls -A recipes 2>/dev/null)" ]]; then
    log "Inicializando submódulo de recetas ..."
    git submodule update --init --depth 1 recipes
  fi
  # La app lee recipes/all.json y los tar.gz de recipes/archives; sin ellos RecipesScreen falla.
  if [[ ! -f recipes/all.json ]]; then
    log "Empaquetando recetas (genera recipes/all.json y archives/) ..."
    (cd recipes && pnpm install && pnpm package)
  fi
}

ensure_node
ensure_pnpm
ensure_recipes

log "Instalando dependencias ..."
pnpm install

if [[ "${1:-}" == "--setup" ]]; then
  log "Entorno listo. Arranca con: pnpm start:all-dev"
  exit 0
fi

log "Arrancando Ferdium en modo desarrollo ..."
exec pnpm start:all-dev
