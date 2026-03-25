# /nueva-funcion – Implementar nueva funcionalidad en Vida Sana Mayor

Eres un experto en React 18 + TypeScript + Vite 5 PWA. El usuario quiere implementar una nueva funcionalidad en **Vida Sana Mayor**.

## Contexto del proyecto
- **Stack**: React 18, TypeScript estricto, Vite 5, vite-plugin-pwa, IndexedDB + AES-256
- **Idioma UI**: Español (es-MX) — toda cadena de texto visible debe estar en español
- **Colores**: beige `#F5F0E1`, verde oliva `#8A9A5B`, amarillo sol `#F4C430`
- **Accesibilidad**: botones táctiles mínimo 60px de alto, fuente Nunito 18px base
- **Patrón de datos**: tipos en `src/types/index.ts`, CRUD en `src/storage.ts` (IndexedDB), componentes en `src/components/`
- **Navegación**: nuevas vistas se registran en `AppView` (types) + render en `App.tsx` + menú "Más opciones"
- **Voz**: usar `speak(text)` de `storage.ts` para feedback auditivo
- **Calificaciones**: todos los módulos de información deben incluir campo de ⭐ rating (1-5)
- **Adjuntos enriquecidos**: notas de texto, grabación de voz (MediaRecorder), resumen IA, fotos (ImagePicker)

## Funcionalidad solicitada
$ARGUMENTS

## Proceso que debes seguir

### Paso 1 – Planificar
Si `$ARGUMENTS` está vacío, pregunta al usuario qué funcionalidad quiere implementar.
Luego describe brevemente el plan: qué tipos nuevos, qué funciones de storage, qué componente(s), y cómo se integrará en la navegación.

### Paso 2 – Implementar
1. Lee los archivos relevantes antes de modificarlos
2. Actualiza `src/types/index.ts` con los nuevos tipos (si aplica)
3. Actualiza `src/storage.ts`: nuevos stores en IndexedDB (incrementa DB_VERSION), funciones CRUD, y actualiza `deleteProfile` + `exportBackup`
4. Crea el componente(s) nuevo(s) siguiendo el estilo visual del proyecto
5. Actualiza `src/App.tsx`: import, render en el switch de vistas, nueva entrada en el menú "Más opciones", y en la detección de nav activo

### Paso 3 – Verificar compilación
```bash
npm run build
```
Si hay errores, corrígelos antes de continuar.

### Paso 4 – Proponer commit
Muestra `git diff --stat` y sugiere un mensaje de commit en formato **Conventional Commits**:
```
feat(módulo): descripción concisa en español

- Bullet con detalle 1
- Bullet con detalle 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Paso 5 – Actualizar CHANGELOG
Propón la entrada para agregar en `CHANGELOG.md` bajo `## [Unreleased]`:
```markdown
### Añadido
- **Nombre del módulo** – descripción de lo que hace
```

### Paso 6 – Preguntar si publicar
Pregunta: "¿Quieres publicar esta versión ahora? Si es así, dime el número de versión y ejecuto `/publicar`."
