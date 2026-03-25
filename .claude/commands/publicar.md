# /publicar – Publicar nueva versión de Vida Sana Mayor

Automatiza el ciclo completo de publicación: versión → build → commit → tag → GitHub → Pages.

## Versión solicitada
$ARGUMENTS

## Proceso

### Paso 1 – Determinar versión
Si `$ARGUMENTS` contiene un número (ej: `1.4.0`), úsalo directamente.
Si está vacío, analiza el contexto para sugerir la versión correcta:

```bash
# Ver versión actual
node -p "require('./package.json').version"

# Ver cambios no publicados desde el último tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Reglas SemVer:
- **PATCH** (x.x.+1): solo bug fixes, pequeños ajustes de UI
- **MINOR** (x.+1.0): nuevas funcionalidades, nuevos módulos, mejoras que no rompen nada
- **MAJOR** (+1.0.0): cambios que rompen compatibilidad (migración de datos, cambio de API)

### Paso 2 – Verificar CHANGELOG
Lee `CHANGELOG.md` y confirma que la sección `## [VERSION]` o `## [Unreleased]` tiene los cambios documentados.
Si `[Unreleased]` está vacío o falta contenido, avisa al usuario y propón el contenido basándote en los commits recientes.

### Paso 3 – Dry run
Muestra un resumen de lo que se va a publicar:
- Versión actual → nueva versión
- Commits que se incluyen
- Estado de git (debe estar limpio)

Confirma con el usuario antes de continuar.

### Paso 4 – Ejecutar release
```bash
make release VERSION=<versión>
```

Monitorea la salida. Si falla en algún paso, muestra el error y sugiere la corrección.

### Paso 5 – Verificar publicación
```bash
# Verificar que el tag fue creado
git tag -l "v<versión>"

# Ver estado del workflow de GitHub Actions
gh run list --limit 3

# Ver el GitHub Release creado
gh release view v<versión>
```

### Paso 6 – Reportar resultado
Muestra:
- 🌐 **App en vivo**: https://untaldouglas.github.io/vida-sana-mayor/
- 📦 **GitHub Release**: https://github.com/untaldouglas/vida-sana-mayor/releases/tag/v<versión>
- ⏱ "GitHub Pages se actualiza en ~60 segundos"
