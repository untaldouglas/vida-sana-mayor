# Herramientas de IA para desarrollar Vida Sana Mayor

Esta guía documenta los **skills (comandos personalizados)** y **conectores MCP** que integran Claude Code con el flujo de desarrollo del proyecto. El objetivo es que una sola instrucción realice tareas que antes requerían múltiples pasos manuales.

---

## Skills de Claude Code (slash commands)

Los skills son comandos personalizados que se invocan con `/nombre` directamente en Claude Code. Están definidos en `.claude/commands/*.md` y contienen instrucciones precisas para cada tarea repetitiva.

| Comando | Cuándo usarlo | Qué hace |
|---------|---------------|----------|
| `/nueva-funcion <descripción>` | Al empezar una nueva feature | Planifica, implementa, verifica build, propone commit y entrada de CHANGELOG |
| `/publicar <versión>` | Al querer publicar una versión | Analiza cambios, valida CHANGELOG, ejecuta `make release`, reporta URLs |
| `/actualizar-docs` | Después de varios commits | Audita README y CHANGELOG, añade lo que falta, propone commit de docs |
| `/estado` | En cualquier momento | Snapshot de versión, CI, Pages, cambios pendientes y siguiente acción |

### Cómo funcionan

Cada archivo `.claude/commands/<nombre>.md` es un prompt estructurado que guía a Claude paso a paso. Puedes ver el contenido de cualquier skill con:

```bash
make skills-help SKILL=nueva-funcion
make skills-help SKILL=publicar
make skills-help SKILL=actualizar-docs
make skills-help SKILL=estado
```

O listarlos todos:

```bash
make skills-list
```

### Flujo típico de una nueva versión

```
1.  /nueva-funcion agregar módulo de vacunas avanzadas
    → Claude implementa, compila, sugiere commit y CHANGELOG

2.  (revisar el trabajo, aceptar el commit)

3.  /estado
    → Ver cuántos commits hay sin publicar, si CI está verde, etc.

4.  /publicar 1.4.0
    → Ejecuta make release, crea GitHub Release, despliega Pages

5.  ✅ App actualizada en https://untaldouglas.github.io/vida-sana-mayor/
```

---

## Conector MCP: GitHub

**Archivo de configuración**: `.mcp.json`

```json
{
  "mcpServers": {
    "github": {
      "command": "bash",
      "args": ["-c", "GITHUB_PERSONAL_ACCESS_TOKEN=$(gh auth token) npx -y @modelcontextprotocol/server-github@2025.4.8"]
    }
  }
}
```

### ¿Qué agrega el GitHub MCP?

El GitHub MCP extiende Claude Code con acceso nativo a la API de GitHub, sin necesidad de comandos de shell. Se activa automáticamente cuando abres Claude Code en este directorio.

| Capacidad MCP | Sin MCP (antes) | Con MCP (ahora) |
|---------------|-----------------|-----------------|
| Crear issue | `gh issue create ...` (shell) | Claude lo hace directamente |
| Buscar código en GitHub | No disponible | `github_search_code` |
| Leer contenido de archivos remotos | `gh api ...` | `github_get_file_contents` |
| Ver PRs y reviews | `gh pr list` | Nativo en contexto de Claude |
| Crear releases | `gh release create` | Nativo + notas automáticas |

### Verificar que funciona

```bash
make mcp-test
```

Debe mostrar `✅` en autenticación y token. El MCP usa el token del `gh` CLI ya configurado, por lo que no necesitas crear tokens adicionales.

### Prerequisito

El `gh` CLI debe estar autenticado:
```bash
gh auth login
gh auth status   # debe mostrar "Logged in to github.com"
```

---

## Makefile: targets relacionados

```bash
make skills-list                # Lista skills + MCP activos
make skills-help SKILL=publicar # Ver documentación de un skill
make mcp-test                   # Verificar GitHub MCP
make setup-dev                  # Configurar entorno completo desde cero
```

---

## Agregar nuevos skills

1. Crea `.claude/commands/<nombre>.md` con instrucciones en markdown
2. Usa `$ARGUMENTS` para capturar lo que el usuario escriba después del `/comando`
3. Documenta el nuevo skill en esta tabla
4. Haz commit: `git add .claude/commands/<nombre>.md && git commit -m "feat(claude): agregar skill /<nombre>"`

### Plantilla de skill

```markdown
# /<nombre> – Descripción en una línea

Contexto relevante del proyecto...

## Argumento
$ARGUMENTS

## Proceso

### Paso 1 – ...
(instrucciones detalladas)

### Paso 2 – ...
```

---

## Agregar nuevos conectores MCP

Edita `.mcp.json` y agrega una entrada en `mcpServers`:

```json
{
  "mcpServers": {
    "nombre-del-servidor": {
      "command": "npx",
      "args": ["-y", "@paquete/mcp-server"],
      "env": { "CLAVE": "valor" },
      "description": "Qué hace este conector"
    }
  }
}
```

Algunos MCP útiles para este proyecto:

| MCP | Paquete | Uso |
|-----|---------|-----|
| GitHub | `@modelcontextprotocol/server-github` | ✅ Ya configurado |
| Playwright | `@playwright/mcp` | Pruebas automáticas del PWA en browser |
| Filesystem | built-in | ✅ Disponible por defecto en Claude Code |
| Memory | `@modelcontextprotocol/server-memory` | Grafos de conocimiento persistentes |

---

*Documentación generada para Vida Sana Mayor v1.3+*
