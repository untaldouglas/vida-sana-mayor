# /actualizar-docs – Actualizar documentación del proyecto

Mantiene README.md y CHANGELOG.md sincronizados con el código actual.

## Argumento opcional
$ARGUMENTS
(Si se proporciona texto, úsalo como guía de qué documentar específicamente)

## Proceso

### Paso 1 – Analizar cambios recientes
```bash
# Commits desde el último tag publicado
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline

# Archivos modificados recientemente
git diff --stat HEAD~5
```

### Paso 2 – Auditar README.md
Lee el README actual y compara con los componentes reales en `src/components/`:

```bash
ls src/components/*.tsx
```

Verifica:
- **Tabla de características**: ¿están todos los módulos listados? ¿las descripciones son precisas?
- **Arquitectura**: ¿aparecen todos los componentes nuevos?
- **Tabla de versiones**: ¿la versión en package.json coincide?
- **Makefile targets**: ¿el README menciona los comandos más útiles?

Si hay discrepancias, actualiza el README siguiendo el estilo existente.

### Paso 3 – Auditar CHANGELOG.md
Lee `CHANGELOG.md` y la lista de commits recientes. Para cada commit que no esté documentado:

1. Clasifícalo: `### Añadido`, `### Cambiado`, `### Corregido`, o `### Eliminado`
2. Redacta una entrada en español clara para el usuario final (no para desarrolladores)
3. Agrégala bajo `## [Unreleased]`

Formato de entrada:
```markdown
- **Nombre del módulo/función** (`ComponentName`) – qué hace y por qué es útil para el usuario
```

### Paso 4 – Verificar consistencia
- El número de versión en `package.json` debe coincidir con la versión más reciente en `CHANGELOG.md`
- Cada nuevo componente en `src/components/` debe tener al menos una entrada en README
- Los links al final de CHANGELOG.md deben estar actualizados

### Paso 5 – Reportar
Lista exactamente qué se modificó y en qué líneas. Propón un commit:
```
docs: actualizar README y CHANGELOG con cambios recientes
```
