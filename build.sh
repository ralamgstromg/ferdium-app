#!/usr/bin/env bash
# Genera el compilado de producción de Ferdium (esbuild + electron-builder).
#
# Reutiliza start-env.sh para tener Node y pnpm con las versiones del proyecto,
# las recetas y las dependencias instaladas. Los instaladores quedan en ./out.
#
# Uso: ./build.sh                       (instalador del SO actual: AppImage en Linux, dmg/zip en macOS)
#      ./build.sh --linux deb tar.gz    (cualquier argumento se pasa a electron-builder)
#      ./build.sh --dir                 (solo el directorio desempaquetado, sin instalador; el más rápido)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -eq 0 ]]; then
  case "$(uname -s)" in
    Linux) set -- --linux AppImage ;;
    Darwin) set -- --mac ;;
    *) echo "[build] SO no soportado por defecto; indica los argumentos de electron-builder (p. ej. --win)." >&2; exit 1 ;;
  esac
fi

exec "$ROOT/start-env.sh" --build "$@"
