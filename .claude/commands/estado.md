# /estado – Estado actual de Vida Sana Mayor

Genera un reporte completo y rápido del estado del proyecto.

## Proceso (ejecuta todo en paralelo donde sea posible)

### 1. Versión y cambios pendientes
```bash
# Versión en package.json
node -p "require('./package.json').version"

# Último tag publicado
git describe --tags --abbrev=0 2>/dev/null || echo "sin tags"

# Commits sin publicar
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~20")..HEAD --oneline
```

### 2. Estado de Git
```bash
git status --short
git stash list
```

### 3. CI/CD y Pages
```bash
# Últimas ejecuciones de GitHub Actions
gh run list --limit 5

# Estado de GitHub Pages
gh api repos/untaldouglas/vida-sana-mayor/pages --jq '{status: .status, build_type: .build_type, url: .html_url}'
```

### 4. Build health
```bash
# Verificar que compila sin errores (rápido)
npm run build 2>&1 | tail -5
```

### 5. Contenido de [Unreleased] en CHANGELOG
Lee las primeras 30 líneas de `CHANGELOG.md` y muestra la sección `## [Unreleased]`.

### Reporte final

Presenta todo de forma clara:

```
☀️  VIDA SANA MAYOR – Estado del proyecto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Versión publicada:    v1.3.0
📝 Commits sin publicar: 3
🏗  Build:               ✅ OK
⚙️  CI/Pages:            ✅ Último deploy: hace 2 horas
🌐 App en vivo:          https://untaldouglas.github.io/vida-sana-mayor/

📋 CHANGELOG [Unreleased]:
  - (contenido o "vacío")

💡 Siguiente acción sugerida:
  → Si hay cambios listos: /publicar 1.4.0
  → Si hay deuda de docs:  /actualizar-docs
  → Si hay nueva función:  /nueva-funcion <descripción>
```
