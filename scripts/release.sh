#!/usr/bin/env bash
# ============================================================
# scripts/release.sh – Publicación automatizada de versiones
# Vida Sana Mayor · Buenas prácticas GitHub + SemVer
# ============================================================
# Uso:
#   ./scripts/release.sh <VERSION>
#   make release VERSION=1.4.0
#
# Qué hace este script:
#   1. Valida estado del repositorio (rama main, sin cambios sin commit)
#   2. Verifica que VERSION no exista ya como tag
#   3. Actualiza versión en package.json
#   4. Construye la app (falla rápido si hay errores de compilación)
#   5. Commit: "chore(release): v{VERSION}" (Conventional Commits)
#   6. Tag anotado: v{VERSION}
#   7. Push a origin/main + tags (activa GitHub Actions → Pages)
#   8. Crea GitHub Release con notas auto-generadas
#   9. Imprime URL de la app publicada
# ============================================================

set -euo pipefail

# ─── Colores ─────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✅ $*${NC}"; }
info() { echo -e "${CYAN}  ℹ️  $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠️  $*${NC}"; }
fail() { echo -e "${RED}  ❌ $*${NC}"; exit 1; }
step() { echo -e "\n${CYAN}━━━ $* ${NC}"; }

# ─── Argumentos ──────────────────────────────────────────────
VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  fail "Versión requerida. Uso: make release VERSION=1.4.0"
fi

# Validar formato SemVer (MAJOR.MINOR.PATCH)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  fail "Formato de versión inválido: '$VERSION'. Debe ser MAJOR.MINOR.PATCH (ej: 1.4.0)"
fi

TAG="v${VERSION}"
REPO_URL="https://github.com/untaldouglas/vida-sana-mayor"
PAGES_URL="https://untaldouglas.github.io/vida-sana-mayor/"

# ─── Encabezado ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}☀️  Vida Sana Mayor – Publicando ${TAG}${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ─── Paso 1: Validar estado del repositorio ──────────────────
step "1/8 Validando repositorio"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  fail "Debes estar en la rama 'main' para publicar. Rama actual: $BRANCH"
fi
ok "Rama: main"

# Verificar que no hay cambios sin commit
if ! git diff-index --quiet HEAD --; then
  fail "Hay cambios sin commit. Ejecuta 'git status' y haz commit antes de publicar."
fi
ok "Árbol de trabajo limpio"

# Verificar que el tag no existe ya
if git tag | grep -q "^${TAG}$"; then
  fail "El tag ${TAG} ya existe. ¿Ya publicaste esta versión?"
fi
ok "Tag ${TAG} disponible"

# ─── Paso 2: Actualizar package.json ─────────────────────────
step "2/8 Actualizando versión en package.json"

node -e "
  const fs = require('fs');
  const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
  pkg.version = '${VERSION}';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  console.log('  Actualizado: ' + pkg.version);
"
ok "package.json → ${VERSION}"

# ─── Paso 3: Actualizar CHANGELOG.md ─────────────────────────
step "3/8 Verificando CHANGELOG.md"

TODAY=$(date +%Y-%m-%d)
CHANGELOG="CHANGELOG.md"

if [[ ! -f "$CHANGELOG" ]]; then
  warn "CHANGELOG.md no encontrado. Creando estructura básica."
  cat > "$CHANGELOG" << CHEOF
# Changelog

## [Unreleased]

## [${VERSION}] – ${TODAY}

### Añadido
- Ver commit history para esta versión.

[Unreleased]: ${REPO_URL}/compare/${TAG}...HEAD
[${VERSION}]: ${REPO_URL}/releases/tag/${TAG}
CHEOF
else
  # Verificar si hay sección [Unreleased] con contenido
  if grep -q "## \[Unreleased\]" "$CHANGELOG"; then
    # Mover [Unreleased] a la nueva versión
    python3 - << PYEOF
import re, sys

content = open('$CHANGELOG').read()

# Reemplazar la cabecera [Unreleased]
today = '$TODAY'
version = '$VERSION'
tag = '$TAG'
repo = '$REPO_URL'

# Añadir la nueva versión después de [Unreleased]
new_version_header = f'## [{version}] – {today}\n'
content = content.replace(
    '## [Unreleased]\n\n> Añade aquí lo que ya está en \`main\` pero aún no tiene versión.\n',
    f'## [Unreleased]\n\n> Añade aquí lo que ya está en \`main\` pero aún no tiene versión.\n\n---\n\n{new_version_header}\n### Añadido\n- Ver commit history para esta versión.\n'
)

# Actualizar links al final (si existen)
content = re.sub(
    r'\[Unreleased\]: .+',
    f'[Unreleased]: {repo}/compare/{tag}...HEAD\n[{version}]: {repo}/compare/PREV...{tag}',
    content
)

open('$CHANGELOG', 'w').write(content)
print('  CHANGELOG.md actualizado')
PYEOF
    ok "CHANGELOG.md – sección ${VERSION} creada"
  else
    warn "No se encontró ## [Unreleased] en CHANGELOG.md. Añade cambios manualmente si es necesario."
  fi
fi

# Actualizar link de versiones al final del CHANGELOG
python3 - << PYEOF2
import re

content = open('$CHANGELOG').read()
tag = '$TAG'
version = '$VERSION'
repo = '$REPO_URL'

# Asegurarse de que el link de esta versión existe
if f'[{version}]' not in content:
    content = content.rstrip() + f'\n[{version}]: {repo}/releases/tag/{tag}\n'
    open('$CHANGELOG', 'w').write(content)
    print('  Link de versión añadido')
PYEOF2

# ─── Paso 4: Build ───────────────────────────────────────────
step "4/8 Construyendo la app"

npm run build
ok "Build completado"

# ─── Paso 5: Commit ──────────────────────────────────────────
step "5/8 Creando commit de versión"

git add package.json CHANGELOG.md
git commit -m "chore(release): ${TAG}

- Versión ${VERSION} publicada
- CHANGELOG.md actualizado
- Build verificado

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

ok "Commit: chore(release): ${TAG}"

# ─── Paso 6: Tag anotado ─────────────────────────────────────
step "6/8 Creando tag ${TAG}"

git tag -a "${TAG}" -m "Vida Sana Mayor ${TAG}

Release ${TAG} de Vida Sana Mayor.
Consulta CHANGELOG.md para el detalle completo de cambios.
App publicada en: ${PAGES_URL}"

ok "Tag anotado: ${TAG}"

# ─── Paso 7: Push ────────────────────────────────────────────
step "7/8 Publicando en GitHub (push + tags)"

git push origin main
git push origin "${TAG}"

ok "Push a origin/main"
ok "Push tag ${TAG}"

info "GitHub Actions publicará la app en Pages en ~60 segundos."

# ─── Paso 8: GitHub Release ──────────────────────────────────
step "8/8 Creando GitHub Release"

gh release create "${TAG}" \
  --title "☀️ Vida Sana Mayor ${TAG}" \
  --generate-notes \
  --notes-start-tag "$(git tag --sort=-version:refname | grep '^v' | sed -n '2p' || echo '')" \
  --latest

ok "GitHub Release creado: ${REPO_URL}/releases/tag/${TAG}"

# ─── Resumen final ───────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}☀️  ¡Vida Sana Mayor ${TAG} publicada!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  🌐 App (Pages):   ${CYAN}${PAGES_URL}${NC}"
echo -e "  📦 Release:       ${CYAN}${REPO_URL}/releases/tag/${TAG}${NC}"
echo -e "  📋 Actions:       ${CYAN}${REPO_URL}/actions${NC}"
echo ""
echo -e "  ${YELLOW}⏱  GitHub Pages puede tardar ~60 segundos en actualizarse.${NC}"
echo ""
