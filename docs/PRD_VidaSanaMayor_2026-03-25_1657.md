# PRD – Vida Sana Mayor
## Product Requirements Document

**Versión del documento:** 1.0
**Fecha de generación:** 2026-03-25 16:57
**Versión de la app descrita:** 1.4.0
**Autor:** Douglas Galindo · [untaldouglas.info](https://www.untaldouglas.info/)
**Repositorio:** https://github.com/untaldouglas/vida-sana-mayor
**App en producción:** https://untaldouglas.github.io/vida-sana-mayor/

---

## Tabla de contenidos

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Problema que resuelve](#2-problema-que-resuelve)
3. [Usuarios objetivo](#3-usuarios-objetivo)
4. [Principios de diseño](#4-principios-de-diseño)
5. [Stack tecnológico](#5-stack-tecnológico)
6. [Arquitectura de la aplicación](#6-arquitectura-de-la-aplicación)
7. [Flujo de primer uso](#7-flujo-de-primer-uso)
8. [Módulos funcionales](#8-módulos-funcionales)
9. [Sistema de almacenamiento y seguridad](#9-sistema-de-almacenamiento-y-seguridad)
10. [Inteligencia Artificial (opcional)](#10-inteligencia-artificial-opcional)
11. [Sistema de autenticación](#11-sistema-de-autenticación)
12. [Sistema de archivos multimedia](#12-sistema-de-archivos-multimedia)
13. [Sistema de calificaciones](#13-sistema-de-calificaciones)
14. [Compartir y respaldo](#14-compartir-y-respaldo)
15. [Gamificación y progreso](#15-gamificación-y-progreso)
16. [Diseño visual y accesibilidad](#16-diseño-visual-y-accesibilidad)
17. [Navegación](#17-navegación)
18. [Tipos TypeScript del sistema](#18-tipos-typescript-del-sistema)
19. [Base de datos IndexedDB](#19-base-de-datos-indexeddb)
20. [Herramientas de desarrollo](#20-herramientas-de-desarrollo)
21. [Restricciones y limitaciones conocidas](#21-restricciones-y-limitaciones-conocidas)
22. [Glosario](#22-glosario)
23. [Detalle del flujo de Onboarding](#23-detalle-del-flujo-de-onboarding)
24. [Configuración de IA — Flujo detallado (AISettings)](#24-configuración-de-ia--flujo-detallado-aisettings)
25. [Acuerdo de Uso — 8 puntos](#25-acuerdo-de-uso--8-puntos)
26. [Funciones de IA por módulo (AIFeatureInfo)](#26-funciones-de-ia-por-módulo-aifeatureinfo)
27. [Configuración PWA (vite.config.ts)](#27-configuración-pwa-viteconfigts)
28. [Dependencias del proyecto](#28-dependencias-del-proyecto)
29. [Decisiones de arquitectura](#29-decisiones-de-arquitectura)
30. [Guía de implementación para desarrolladores](#30-guía-de-implementación-para-desarrolladores)
31. [Checklist de requisitos funcionales](#31-checklist-de-requisitos-funcionales)
32. [Historial de versiones](#32-historial-de-versiones)

---

## 1. Resumen ejecutivo

**Vida Sana Mayor** es una Progressive Web App (PWA) gratuita y de código abierto (Apache 2.0) diseñada para adultos con enfermedades crónicas y sus cuidadores. Su propósito central es que el usuario tenga **control total de su historial médico, medicamentos, citas, síntomas y proveedores de salud**, todo desde su dispositivo, sin depender de internet, sin servidores externos y sin ceder privacidad a terceros.

La aplicación funciona completamente **offline**. Todos los datos se guardan en el dispositivo del usuario mediante IndexedDB. Los respaldos se cifran con AES-256-GCM. La inteligencia artificial es completamente opcional y el usuario elige y paga directamente a su proveedor de IA.

---

## 2. Problema que resuelve

Los adultos mayores con enfermedades crónicas típicamente:

- Llevan registros médicos dispersos en papeles, fotos en el teléfono y conversaciones de WhatsApp.
- Olvidan qué medicamentos tomaron, cuántos les quedan y cuándo fue la última toma.
- No tienen un lugar centralizado para guardar resultados de laboratorio, radiografías o notas de consulta.
- No recuerdan el nombre del hospital donde se hicieron un estudio hace seis meses.
- Sus cuidadores no tienen visibilidad del estado médico real del paciente.

Vida Sana Mayor resuelve esto con una interfaz amigable, botones grandes, voz en español y cero dependencia de internet.

---

## 3. Usuarios objetivo

| Tipo de usuario | Descripción |
|-----------------|-------------|
| **Paciente principal** | Adulto con una o más enfermedades crónicas (diabetes, hipertensión, cáncer, etc.) que gestiona su propio expediente |
| **Cuidador familiar** | Hijo/a, esposo/a o familiar que gestiona la salud de otra persona |
| **Adulto mayor** | Usuario con menor familiaridad tecnológica; necesita botones grandes, texto legible y navegación simple |
| **Paciente activo** | Persona que asiste frecuentemente a consultas, exámenes y toma varios medicamentos simultáneamente |

---

## 4. Principios de diseño

1. **Privacy by design** – ningún dato sale del dispositivo salvo lo que el usuario decide explícitamente compartir.
2. **Offline first** – la app debe funcionar sin internet en todo momento.
3. **Accesibilidad táctil** – botones mínimos de 60×60 px para facilitar el uso con temblor o movilidad reducida.
4. **Voz amigable** – narración femenina suave en español mexicano (es-MX) para confirmaciones y orientación.
5. **IA opcional y transparente** – si el usuario no configura IA, la app funciona al 100%. Si la configura, paga directamente al proveedor; el autor de la app no tiene acceso ni responsabilidad sobre esos costos.
6. **Gratuita siempre** – Apache 2.0, sin publicidad, sin suscripción.

---

## 5. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework UI | React 18 |
| Lenguaje | TypeScript |
| Bundler | Vite 5 |
| PWA / Service Worker | vite-plugin-pwa + Workbox |
| Base de datos local | IndexedDB vía librería `idb` |
| Cifrado | Web Crypto API (AES-256-GCM, PBKDF2) |
| OCR offline | Tesseract.js |
| Generación de QR | QRCode.js |
| Voz y reconocimiento | Web Speech API (es-MX) |
| Grabación de audio | MediaRecorder API |
| IA (opcional) | Fetch API → APIs de Anthropic / OpenAI / Google / Mistral / Ollama |
| Biometría | WebAuthn (navigator.credentials) |
| CI/CD | GitHub Actions → GitHub Pages |
| Node.js | 24 (pinado en `.tool-versions`) |
| GitHub CLI | 2.42.1 (pinado en `.tool-versions`) |

---

## 6. Arquitectura de la aplicación

```
src/
├── main.tsx                # Punto de entrada React
├── App.tsx                 # Componente raíz: routing, estado global, navegación, toasts
├── App.css                 # Estilos globales (variables CSS, layout, componentes base)
├── storage.ts              # Capa de datos: IndexedDB v2 + cifrado AES-256
├── types/
│   └── index.ts            # Todos los tipos TypeScript del sistema
├── services/
│   └── aiService.ts        # Capa de servicio IA unificada (5 proveedores)
└── components/
    ├── Agreement.tsx        # Pantalla de acuerdo de uso (obligatoria, con voz)
    ├── Onboarding.tsx       # Flujo de bienvenida: nombre → avatar → PIN → IA
    ├── Auth.tsx             # Pantalla de bloqueo: PIN + biometría WebAuthn
    ├── Dashboard.tsx        # Pantalla principal: resumen, alertas, accesos rápidos
    ├── Medications.tsx      # Gestión de medicamentos y registro de tomas
    ├── MedicalRecord.tsx    # Expediente clínico (FHIR R4 simplificado)
    ├── SymptomDiary.tsx     # Diario de síntomas con escala de dolor
    ├── Agenda.tsx           # Agenda de citas médicas
    ├── Doctors.tsx          # Directorio de doctores
    ├── MedicalExams.tsx     # Exámenes médicos (lab, radiología, procedimientos)
    ├── ServiceProviders.tsx # Inventario de proveedores de servicios médicos
    ├── Progress.tsx         # Gamificación: soles, racha, hitos
    ├── Scan.tsx             # OCR de documentos + grabación de consultas
    ├── ShareExport.tsx      # Compartir temporal (QR) + respaldo cifrado (.vsm)
    ├── Settings.tsx         # Configuración general de la app
    ├── AISettings.tsx       # Configuración del proveedor de IA
    ├── AIFeatureInfo.tsx    # Componente informativo sobre funciones de IA
    ├── ImagePicker.tsx      # Componente reutilizable: cámara/archivo + galería
    └── ImageThumbs.tsx      # Visualizador de miniaturas con lightbox (solo lectura)
```

### Patrón de estado global

El componente raíz `App.tsx` gestiona:
- `AppState` (perfiles, autenticación, configuración de IA) cargado desde IndexedDB al iniciar.
- `view: AppView` — vista activa (equivalente al "router" de la app).
- `toasts` — mensajes temporales de retroalimentación.
- `authenticated` — flag de sesión activa.

No se usa ninguna librería de estado global (Redux, Zustand, etc.). El estado fluye de padres a hijos mediante props.

---

## 7. Flujo de primer uso

El flujo es secuencial y obligatorio. Ningún paso puede saltarse.

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Agreement (Acuerdo de uso)                                  │
│     • Narración en voz de los 8 puntos del acuerdo             │
│     • Checkbox 1: acepto términos generales (puntos 1-7)       │
│     • Checkbox 2: acepto aviso de IA y costos (punto 8)        │
│     • Ambos checkboxes obligatorios para continuar             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Onboarding                                                  │
│     • Nombre del usuario                                        │
│     • Elección de avatar (emoji o color)                       │
│     • Relación (yo / esposa / hijo / etc.)                     │
│     • PIN de 4 dígitos (opcional)                              │
│     • Configuración inicial de IA (opcional, omitible)         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Auth (si el usuario configuró PIN o biometría)              │
│     • Teclado numérico de 4 dígitos                            │
│     • Verificación con PBKDF2 (310,000 iteraciones, SHA-256)  │
│     • Opción de biometría (WebAuthn)                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. Dashboard                                                   │
│     • Pantalla principal de la app                             │
└─────────────────────────────────────────────────────────────────┘
```

En usos posteriores, el flujo inicia directamente en Auth (si hay PIN) o Dashboard (si no hay PIN).

---

## 8. Módulos funcionales

### 8.1 Dashboard (Inicio)

**Archivo:** `src/components/Dashboard.tsx`

Pantalla principal que muestra un resumen completo del estado de salud del usuario activo.

**Contenido que muestra:**
- Saludo personalizado con nombre, avatar y fecha actual.
- Mensaje motivador rotatorio (5 frases predefinidas).
- Botón 🔊 para escuchar el saludo en voz alta.
- **Soles de progreso**: muestra hasta 7 soles (☀️) ganados y días de racha consecutiva.
- **Alertas de stock bajo**: lista de medicamentos cuyo inventario está en o por debajo del umbral de alerta, con botón de acceso directo.
- **Acceso rápido**: grid de 6 botones para las vistas más usadas (Medicamentos, Expediente, Síntomas, Agenda, Doctores, Progreso).
- **Próximas citas**: hasta 3 citas futuras con fecha, hora y nombre del doctor.
- **Medicamentos de hoy**: hasta 4 medicamentos activos con estado de toma (✅ tomado / 💊 pendiente).
- **Condiciones activas/crónicas**: diagnósticos con estado `active` o `chronic` del expediente.
- **Banner de IA**: si la IA no está configurada, muestra un banner invitando a configurarla. Si está activa, muestra el proveedor y modelo activos.

---

### 8.2 Medicamentos

**Archivo:** `src/components/Medications.tsx`

Gestión completa del tratamiento farmacológico del usuario.

**Campos de cada medicamento:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del medicamento |
| `dose` | string | Dosis (ej: "500mg") |
| `frequency` | string | Frecuencia en texto libre (ej: "cada 8 horas") |
| `times` | string[] | Horarios específicos (ej: ["08:00", "16:00", "24:00"]) |
| `startDate` | string | Fecha de inicio (ISO) |
| `endDate` | string? | Fecha de fin (omitir si es indefinido) |
| `stock` | number | Cantidad de unidades restantes |
| `stockAlert` | number | Umbral de alerta de stock bajo |
| `diagnosisId` | string? | Diagnóstico vinculado del expediente |
| `notes` | string? | Notas adicionales |
| `imageFileIds` | string[]? | Fotos de caja, receta, indicaciones |
| `rating` | number? | Calificación 1-5 estrellas |

**Funcionalidades:**
- **Registrar toma**: un botón por medicamento activo. Al tocarlo, descuenta 1 del stock, registra la hora exacta en `takenHistory` y reproduce voz de confirmación.
- **Historial de tomas**: `takenHistory` acumula registros `{date, time, taken}`.
- **Alertas de stock**: si `stock <= stockAlert`, aparece en el Dashboard como alerta amarilla.
- **Separación activos/pasados**: medicamentos con `endDate` en el pasado se muestran en sección "Historial".
- **Fotos**: hasta 8 imágenes por medicamento (caja, receta, indicaciones) mediante `ImagePicker`.
- **Calificación**: selector de 1-5 estrellas integrado en el formulario.

---

### 8.3 Expediente Clínico (FHIR R4 simplificado)

**Archivo:** `src/components/MedicalRecord.tsx`

Almacena el historial médico completo del perfil activo, estructurado siguiendo la lógica de FHIR R4 pero simplificado para uso offline y cotidiano.

**Secciones del expediente:**

| Sección | Descripción |
|---------|-------------|
| **Diagnósticos** | Condiciones médicas con código CIE opcional, fecha de inicio y estado (activo/crónico/resuelto) |
| **Alergias** | Sustancia, reacción y severidad (leve/moderada/severa) |
| **Vacunas** | Nombre, fecha, dosis y fecha de próxima dosis |
| **Medicamentos** | Gestionados por el módulo Medications (compartido en el mismo expediente) |
| **Consultas** | Notas de consultas con doctor, motivo, notas, audio y resumen |
| **Resultados de laboratorio** | Prueba, fecha, resultado, unidad, rango de referencia y foto |
| **Cirugías** | Procedimiento, fecha, hospital y cirujano |
| **Antecedentes familiares** | Parentesco y condición hereditaria |

**Nota de implementación:** Todo el expediente se guarda en un solo documento JSON en IndexedDB bajo la clave `profileId`. Esto simplifica la lectura completa pero requiere rescribir el objeto entero al modificar cualquier sección.

---

### 8.4 Diario de Síntomas

**Archivo:** `src/components/SymptomDiary.tsx`

Permite al usuario registrar cómo se siente cada día con escala de dolor visual, notas de voz y fotografía.

**Campos de cada entrada:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `date` | string | Fecha (ISO) |
| `time` | string | Hora (HH:MM) |
| `painLevel` | 0\|1\|2\|3 | 0=sin dolor, 1=leve, 2=moderado, 3=severo |
| `description` | string | Descripción textual del síntoma |
| `audioFileId` | string? | ID del archivo de audio en `media` store |
| `transcript` | string? | Transcripción de la nota de voz |
| `photoFileId` | string? | ID de foto adjunta |
| `tags` | string[] | Etiquetas libres (ej: ["cabeza", "mareo"]) |

**Escala de dolor:** Se muestra con caritas (emojis) según nivel: 😴 Sin dolor, 😐 Leve, 😟 Moderado, 😰 Severo.

**Grabación de voz:** Usa MediaRecorder API. El audio se guarda en IndexedDB. El usuario puede reproducirlo desde la lista.

**Registro actualiza progreso:** Cada nueva entrada del diario llama a `updateProgress()` para sumar soles y mantener la racha.

---

### 8.5 Agenda de Citas

**Archivo:** `src/components/Agenda.tsx`

Gestión de citas médicas con vista de lista ordenada por fecha.

**Campos de cada cita:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `doctorId` | string? | Doctor vinculado del directorio |
| `doctorName` | string? | Nombre del doctor (texto libre si no está en directorio) |
| `date` | string | Fecha (ISO) |
| `time` | string | Hora (HH:MM) |
| `reason` | string | Motivo de la cita |
| `location` | string? | Lugar / dirección |
| `reminder` | boolean | Si se debe recordar |
| `reminderMinutes` | number | Minutos de anticipación para el recordatorio |
| `notes` | string? | Notas adicionales |
| `imageFileIds` | string[]? | Fotos de indicaciones previas o resultados |

**Vistas:** Lista de próximas citas (ordenadas por fecha asc.) y citas pasadas.

**Integración con Dashboard:** Las próximas 3 citas se muestran en el Dashboard del perfil activo.

---

### 8.6 Doctores

**Archivo:** `src/components/Doctors.tsx`

Directorio de médicos tratantes con calificación y archivos adjuntos.

**Campos de cada doctor:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del doctor |
| `specialty` | string | Especialidad médica |
| `phone` | string? | Teléfono (enlace de llamada directa) |
| `address` | string? | Dirección del consultorio |
| `diagnosisIds` | string[] | Diagnósticos del expediente que trata |
| `notes` | string? | Notas libres |
| `imageFileIds` | string[]? | Fotos (credencial, consultorio, etc.) |
| `rating` | number? | 1-5 estrellas |
| `ratingNotes` | string? | Comentario de la calificación |
| `audioNoteId` | string? | Nota de voz sobre el doctor |

**Funcionalidades:**
- Teléfono con enlace `tel:` para llamada directa desde la app.
- Diagnosisos vinculados: selector de diagnósticos existentes en el expediente.
- Calificación de 1-5 estrellas con comentario, visible en la tarjeta de lista.
- Usado en formularios de `MedicalExams` y `Agenda` como selección cruzada.

---

### 8.7 Exámenes Médicos

**Archivo:** `src/components/MedicalExams.tsx`

Módulo para registrar exámenes de laboratorio, estudios de radiología e imagen, y procedimientos especiales (endoscopías, PET, yodo radioactivo, etc.).

**Categorías de exámenes:**

| Categoría | Ícono | Ejemplos predefinidos |
|-----------|-------|-----------------------|
| `laboratorio` | 🔬 | Hemograma completo, HbA1c, Perfil lipídico, Función renal, Marcadores tumorales, +13 más |
| `radiologia` | 🩻 | Rayos X, TAC, Resonancia magnética, PET scan, Mamografía, Ecocardiograma, +12 más |
| `procedimiento` | 🔭 | Endoscopía alta, Colonoscopía, Biopsia, I-131, Cateterismo cardíaco, EMG, +14 más |

La interfaz muestra chips seleccionables con los tipos de examen predefinidos. El usuario también puede escribir un tipo personalizado seleccionando "✏️ Otro...".

**Campos de cada examen:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `category` | ExamCategory | laboratorio / radiologia / procedimiento |
| `examType` | string | Tipo específico de examen |
| `date` | string | Fecha del examen |
| `status` | ExamStatus | pendiente / en_proceso / completado / cancelado |
| `doctorId/Name` | string? | Doctor que ordenó (selección de lista o texto libre) |
| `providerId/Name` | string? | Lugar donde se realizó (selección de lista o texto libre) |
| `indication` | string? | Orden / indicación médica |
| `result` | string? | Resultado del examen |
| `interpretation` | string? | Interpretación del médico |
| `userNotes` | string? | Notas personales del paciente |
| `audioFileId` | string? | Nota de voz grabada |
| `aiSummary` | string? | Resumen generado por IA |
| `imageFileIds` | string[]? | Hasta 8 fotos (radiografías, resultados, documentos) |
| `rating` | number? | Calificación de la experiencia (1-5) |

**Selección cruzada:** Al crear un examen, el formulario carga la lista de doctores y proveedores ya registrados para selección. Si el doctor/proveedor no está en la lista, puede escribirse texto libre.

**Resumen IA:** Si hay un proveedor de IA configurado, aparece un botón "✨ Generar resumen con IA" que envía la información del examen al proveedor y devuelve un resumen en lenguaje accesible.

**Filtros:** La vista tiene chips de filtro: Todos | Lab | Radiología | Procedimientos, con contadores.

**Estados con color:**
- ⏳ Pendiente → amarillo
- 🔄 En proceso → azul
- ✅ Completado → verde
- ❌ Cancelado → gris

---

### 8.8 Proveedores de Servicios Médicos

**Archivo:** `src/components/ServiceProviders.tsx`

Inventario de todos los lugares y entidades que prestan servicios de salud al usuario.

**Categorías:**

| Categoría | Ícono | Color |
|-----------|-------|-------|
| Hospital | 🏥 | Rojo |
| Clínica privada | 🏨 | Morado |
| Laboratorio clínico | 🔬 | Azul |
| Farmacia | 💊 | Verde |
| Consultorio médico | 👨‍⚕️ | Naranja |
| Centro de diagnóstico | 📊 | Teal |
| Otro | 🏢 | Gris |

**Campos de cada proveedor:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | string | Nombre del proveedor |
| `category` | ProviderCategory | Categoría del proveedor |
| `subcategory` | string? | Subcategoría libre (ej: "oncología") |
| `address` | string? | Dirección |
| `phone` | string? | Teléfono (enlace de llamada directa) |
| `website` | string? | Sitio web |
| `notes` | string? | Notas libres |
| `audioNoteId` | string? | Nota de voz |
| `aiSummary` | string? | Resumen generado por IA |
| `imageFileIds` | string[]? | Hasta 8 fotos |
| `rating` | number? | 1-5 estrellas |
| `ratingNotes` | string? | Comentario de la calificación |

**Filtros dinámicos:** Los chips de filtro por categoría solo aparecen si hay al menos un proveedor en esa categoría (para no mostrar opciones vacías).

---

### 8.9 Escaneo y Grabación de Consultas

**Archivo:** `src/components/Scan.tsx`

Dos funciones en una pantalla:

1. **OCR de documentos:** El usuario toma una foto o selecciona una imagen. Tesseract.js extrae el texto en el navegador sin conexión. El texto extraído puede copiarse o guardarse como nota.

2. **Grabación de consultas médicas:** El usuario graba el audio de una consulta médica usando MediaRecorder. Puede añadir notas de texto. Si hay IA configurada, puede generar un resumen de la consulta.

---

### 8.10 Progreso y Gamificación

**Archivo:** `src/components/Progress.tsx`
**Lógica:** `src/storage.ts → updateProgress()`

Sistema de motivación basado en consistencia de registro.

**Reglas:**
- Cada vez que el usuario registra una toma de medicamento o un síntoma, se llama a `updateProgress()`.
- Si el registro es el primero del día, se incrementa el contador de entradas y se recalcula la racha.
- La racha (`streak`) suma 1 si el día anterior también hubo registro; si no, reinicia en 1.
- Los **soles** se calculan como `Math.floor(totalEntries / 3)` — uno por cada 3 registros.
- El Dashboard muestra hasta 7 soles visualmente y el número de días de racha.

---

### 8.11 Compartir y Respaldo

**Archivo:** `src/components/ShareExport.tsx`

Dos funcionalidades:

**Compartir temporal (QR):**
- El usuario selecciona qué secciones de su expediente compartir.
- Se genera un token UUID con expiración de 24 horas guardado en IndexedDB.
- Se muestra un código QR con un enlace de solo lectura.
- El receptor puede ver la información sin instalar nada (vista web pública temporal).

**Respaldo cifrado (.vsm):**
- El usuario ingresa su PIN para derivar una clave de cifrado.
- Se serializa todo el expediente (médico, doctores, citas, síntomas, progreso, exámenes, proveedores) en JSON.
- Se cifra con AES-256-GCM usando una clave PBKDF2 (310,000 iteraciones, SHA-256, salt aleatorio de 16 bytes).
- Se descarga un archivo `.vsm` (formato propietario JSON con `{v, salt, data}`).
- El usuario puede restaurar el respaldo en cualquier dispositivo con la misma contraseña.

---

### 8.12 Configuración

**Archivo:** `src/components/Settings.tsx`

Pantalla de configuración general que incluye:
- Cambio de PIN.
- Activar/desactivar biometría (WebAuthn).
- Configuración del proveedor de IA (`AISettings.tsx`).
- Gestión de perfiles (añadir, cambiar perfil activo).
- Información de autoría y enlace de donativo (Ko-fi).
- Desde aquí también se accede al menú "Más opciones" con las vistas secundarias.

---

## 9. Sistema de almacenamiento y seguridad

### 9.1 IndexedDB — Colecciones (v2)

La base de datos se llama `vida-sana-mayor` y está en versión `2`.

| Colección | Clave primaria | Índices | Descripción |
|-----------|----------------|---------|-------------|
| `appState` | `'main'` (key manual) | — | Estado global de la app (perfiles, auth, config IA) |
| `medicalRecords` | `profileId` | — | Expediente clínico completo por perfil |
| `doctors` | `id` | `profileId` | Directorio de doctores |
| `appointments` | `id` | `profileId`, `date` | Citas médicas |
| `symptoms` | `id` | `profileId`, `date` | Entradas del diario de síntomas |
| `progress` | `profileId` | — | Progreso y gamificación por perfil |
| `media` | `id` | `profileId` | Archivos multimedia (audio, foto, scan, documento) |
| `shareTokens` | `token` | — | Tokens temporales de compartir (24h) |
| `medicalExams` | `id` | `profileId`, `date` | Exámenes médicos |
| `serviceProviders` | `id` | `profileId` | Proveedores de servicios médicos |
| `ratings` | `id` (`entityType_entityId`) | `profileId`, `entityId` | Calificaciones |

**Migración:** La función `upgrade(db)` en `openDB` verifica la existencia de cada colección antes de crearla, permitiendo migración limpia de v1 → v2 sin perder datos existentes.

**Borrado en cascada:** Al eliminar un perfil, se borran automáticamente todos sus registros en todas las colecciones (appointments, symptoms, media, medicalExams, serviceProviders, ratings).

### 9.2 Cifrado

**Algoritmo:** AES-256-GCM (nativo del navegador vía Web Crypto API).

**Derivación de clave (PIN → clave):**
- Algoritmo: PBKDF2
- Hash: SHA-256
- Iteraciones: 310,000 (recomendación NIST 2023)
- Salt: 16 bytes aleatorios generados con `crypto.getRandomValues`

**Proceso de cifrado de respaldo:**
1. Se genera un salt aleatorio de 16 bytes.
2. Se deriva una clave AES-256 del PIN + salt.
3. Se genera un IV aleatorio de 12 bytes para AES-GCM.
4. Se cifra el JSON del expediente.
5. Se combina `[IV (12 bytes) + ciphertext]` y se codifica en base64.
6. El archivo final es `{v: 1, salt: hex, data: base64}`.

**Hash del PIN:** El PIN nunca se guarda en texto plano. Se guarda como `saltHex:hashHex` derivado con PBKDF2.

---

## 10. Inteligencia Artificial (opcional)

**Archivo de servicio:** `src/services/aiService.ts`
**Configuración UI:** `src/components/AISettings.tsx`

### Función principal

```typescript
callAI(messages: AIMessage[], config: AIConfig, systemPrompt?: string): Promise<AIResponse>
```

Esta función es el único punto de entrada a la IA. Internamente enruta al proveedor correcto según `config.provider`.

### Proveedores soportados

| Proveedor | ID | Endpoint | Auth |
|-----------|-----|----------|------|
| Anthropic Claude | `'anthropic'` | `https://api.anthropic.com/v1/messages` | Header `x-api-key` |
| OpenAI | `'openai'` | `https://api.openai.com/v1/chat/completions` | Header `Authorization: Bearer` |
| Google Gemini | `'google'` | `https://generativelanguage.googleapis.com/v1beta/...` | Query param `key` |
| Mistral AI | `'mistral'` | `https://api.mistral.ai/v1/chat/completions` | Header `Authorization: Bearer` |
| Ollama (local) | `'ollama'` | `http://localhost:11434/v1/chat/completions` | Sin auth |

**Modelos recomendados en la UI:**
- Ollama: `qwen2.5:7b`, `llama3.1:8b`, `mistral:7b`
- Anthropic: Claude Haiku 4.5, Sonnet 4.6, Opus 4.6
- OpenAI: GPT-4o, GPT-4o Mini
- Google: Gemini 2.0 Flash, Gemini 1.5 Pro
- Mistral: Mistral Small, Mistral Large

### Usos de IA en la app

| Módulo | Uso |
|--------|-----|
| Exámenes médicos | Resumen del examen en lenguaje accesible |
| Proveedores de salud | Resumen del proveedor |
| Grabación de consultas (Scan) | Resumen de la consulta grabada |
| Diario de síntomas | Análisis de patrones (future) |
| Dashboard | Indicador de IA activa |

### Configuración (`AIConfig`)

```typescript
interface AIConfig {
  provider: AIProvider           // proveedor seleccionado
  apiKey: string                 // clave API (vacía para Ollama)
  model: string                  // modelo a usar
  baseUrl?: string               // URL base (requerida para Ollama)
  acceptedTerms: boolean         // el usuario aceptó costos
  acceptedDate: string           // fecha de aceptación de costos
}
```

La clave API se almacena en `AppState` → IndexedDB, nunca sale del dispositivo ni llega a servidores del autor.

---

## 11. Sistema de autenticación

**Archivo:** `src/components/Auth.tsx`

La autenticación es **opcional**. El usuario puede elegir durante el onboarding:

| Método | Descripción |
|--------|-------------|
| `'none'` | Sin bloqueo. La app abre directamente al Dashboard. |
| `'pin'` | PIN de 4 dígitos. Verificación con PBKDF2. |
| `'biometric'` | WebAuthn (huella, Face ID). Con fallback a PIN. |

**Flujo de verificación PIN:**
1. El usuario ingresa 4 dígitos en el teclado numérico.
2. Al completar el 4to dígito, se dispara `verifyPin()` automáticamente.
3. Se re-deriva la clave PBKDF2 con el PIN ingresado y el salt guardado.
4. Se compara el hash derivado con el `pinHash` almacenado.
5. Si coincide: `onUnlock()`. Si no: mensaje de error, limpiar PIN, sumar intento fallido.

**Biometría:** Usa `navigator.credentials.get()` con `PublicKeyCredentialRequestOptions`. Si falla (huella no reconocida, cancelada), recae automáticamente al teclado de PIN.

---

## 12. Sistema de archivos multimedia

**Tipo:** `MediaFile`
**Colección IndexedDB:** `media`
**Componente reutilizable:** `src/components/ImagePicker.tsx`

### Tipos de archivo soportados

| Tipo | Uso |
|------|-----|
| `'audio'` | Notas de voz en síntomas, exámenes, proveedores, grabaciones de consultas |
| `'photo'` | Fotos de medicamentos, doctores, citas, resultados de lab |
| `'scan'` | Documentos escaneados con OCR |
| `'document'` | Documentos adjuntos multiformat en exámenes y proveedores |

### Almacenamiento

Los archivos se guardan como `ArrayBuffer` directamente en IndexedDB. Esto significa que **los archivos también son offline-first** y no dependen del sistema de archivos del dispositivo.

Para mostrar un archivo se genera un `URL.createObjectURL(new Blob([mediaFile.data], { type: mediaFile.mimeType }))` en memoria.

### Componente `ImagePicker`

Props:
- `profileId`: para asociar el archivo al perfil correcto.
- `fileIds`: IDs actuales.
- `onChange(ids)`: callback al añadir o eliminar.
- `label`: etiqueta del campo.
- `maxImages`: límite de imágenes (por defecto 8).

Permite: tomar foto con cámara, seleccionar archivo desde galería, previsualizar miniaturas, eliminar imágenes individuales.

### Componente `ImageThumbs`

Muestra miniaturas en modo solo lectura. Al tocar una miniatura, abre un lightbox con la imagen a tamaño completo.

---

## 13. Sistema de calificaciones

**Tipo:** `Rating`
**Colección IndexedDB:** `ratings`

El sistema de calificaciones permite evaluar cualquier entidad relevante del sistema de salud del usuario.

**Entidades calificables:**
- `'doctor'` — doctores del directorio
- `'provider'` — proveedores de servicios médicos
- `'medication'` — medicamentos
- `'exam'` — exámenes médicos
- `'diagnosis'` — diagnósticos (preparado en tipos, no implementado en UI v1.4)

**Escala:** 1 a 5 estrellas. Tocar la estrella activa la desmarca (vuelve a 0).

**Implementación:** El rating se guarda tanto en la entidad misma (campo `rating: number?`) como en la colección `ratings` con una clave compuesta `${entityType}_${entityId}`.

**Componente `StarRating`:** Implementado inline en `MedicalExams.tsx` y `ServiceProviders.tsx`. Acepta `onChange` para modo edición (formularios) y lo omite para modo solo lectura (listas).

---

## 14. Compartir y respaldo

Ver sección 8.11. Detalles adicionales:

**Formato del archivo `.vsm`:**
```json
{
  "v": 1,
  "salt": "hex-de-16-bytes",
  "data": "base64-del-iv+ciphertext"
}
```

**Contenido del respaldo (por perfil):**
- `medicalRecord` (diagnósticos, alergias, vacunas, medicamentos, consultas, laboratorios, cirugías, antecedentes)
- `doctors`
- `appointments`
- `symptoms`
- `progress`
- `medicalExams`
- `serviceProviders`

**No incluye:** Archivos multimedia (audio, fotos) por razones de tamaño. Esto es una limitación conocida.

---

## 15. Gamificación y progreso

**Objetivo:** Motivar consistencia en el registro de salud mediante un sistema de recompensas simbólicas.

**Mecánica:**
- Cada día que el usuario registra (toma de medicamento o síntoma) cuenta como "entrada".
- 3 entradas = 1 ☀️ sol.
- Los días consecutivos forman una "racha" (`streak`).
- La racha se rompe si un día no hay ningún registro.
- Se muestran mensajes positivos rotativos en el Dashboard.

**Pantalla Progress:** Muestra los soles ganados, la racha actual, el total de entradas y hitos o mensajes motivadores.

---

## 16. Diseño visual y accesibilidad

### Paleta de colores

| Token CSS | Hex | Uso |
|-----------|-----|-----|
| `--bg` | `#F5F0E1` | Fondo principal (beige cálido) |
| `--bg-card` | `#FFFFFF` | Fondo de tarjetas |
| `--olive` | `#8A9A5B` | Color primario / header |
| `--olive-dark` | `#6B7A46` | Hover y gradientes del header |
| `--sun` | `#F4C430` | Acciones positivas / alertas de IA |
| `--text` | `#2C2C2C` | Texto principal |
| `--text-light` | `#6B7280` | Texto secundario / labels |
| `--border` | `#E5E0D0` | Bordes de tarjetas |
| Azul | `#1976D2` | Opciones de Ollama / gratuitas |

### Tipografía

- **Familia:** Nunito (Google Fonts) — redondeada y amigable.
- **Pesos:** 400 (normal), 600, 700, 800 (headings).

### Accesibilidad

- **Botones mínimos:** 60×60 px (`--min-touch`) para facilitar el uso con movilidad reducida.
- **Contraste:** Texto oscuro sobre fondo claro en todas las pantallas.
- **Voz:** Web Speech API con voz femenina es-MX para confirmaciones de acciones críticas (tomar medicamento, guardar examen, etc.).
- **Emojis como iconos:** Todos los iconos son emojis nativos para máxima compatibilidad sin fuentes de iconos.

### Layout

- Layout de app mobile-first con `height: 100dvh` (dynamic viewport height para móviles con barra de navegador).
- Header fijo con título de la vista y gradiente verde oliva.
- Barra de navegación inferior fija con 5 ítems.
- Contenido scrollable en `main.main-content` entre header y nav inferior.
- Modales en overlay full-screen con `position: fixed`.

---

## 17. Navegación

### Barra de navegación inferior (siempre visible)

| Botón | Vista | Icono |
|-------|-------|-------|
| Inicio | `dashboard` | 🏠 |
| Medicamentos | `medications` | 💊 |
| Síntomas | `symptoms` | 😊 |
| Agenda | `agenda` | 📅 |
| Más | `settings` | ⚙️ |

### Menú "Más opciones" (dentro de la vista Settings)

Al tocar "Más" en la barra inferior, además de la configuración, aparece un menú con:
- 📋 Expediente clínico → `record`
- 🔬 Exámenes médicos → `exams`
- 🏥 Proveedores de salud → `providers`
- 👨‍⚕️ Mis doctores → `doctors`
- 📈 Mi progreso → `progress`
- 📷 Escaneo y grabación → `scan`
- 📤 Compartir y respaldo → `share`

**Indicador activo:** El botón "Más" se resalta como activo cuando la vista actual es cualquiera de: `settings`, `record`, `doctors`, `progress`, `scan`, `share`, `exams`, `providers`.

### Multiperfil

Si hay más de 1 perfil registrado, aparece una barra de chips debajo del header con los perfiles disponibles y un botón `+` para añadir. Tocar un chip cambia el perfil activo instantáneamente y navega al Dashboard.

---

## 18. Tipos TypeScript del sistema

Todos los tipos están centralizados en `src/types/index.ts`. Los más importantes:

### `AppState`
Estado global persistido en IndexedDB.
```typescript
interface AppState {
  profiles: Profile[]
  activeProfileId: string | null
  onboardingDone: boolean
  agreementAccepted: boolean
  pinHash: string | null
  authMethod: 'none' | 'pin' | 'biometric'
  encryptionKey: string | null
  aiConfig?: AIConfig | null
}
```

### `AppView`
Unión de strings que representa todas las vistas posibles:
```typescript
type AppView = 'agreement' | 'onboarding' | 'auth' | 'dashboard' | 'medications' |
  'record' | 'symptoms' | 'agenda' | 'doctors' | 'progress' | 'scan' |
  'share' | 'settings' | 'backup' | 'exams' | 'providers'
```

### `MediaFile`
Archivos multimedia almacenados en IndexedDB.
```typescript
interface MediaFile {
  id: string
  profileId: string
  type: 'audio' | 'photo' | 'scan' | 'document'
  mimeType: string
  name: string
  createdAt: string
  data: ArrayBuffer
  transcript?: string
  ocrText?: string
}
```

Todos los demás tipos se detallan en el archivo `src/types/index.ts` del repositorio.

---

## 19. Base de datos IndexedDB

### API de acceso (storage.ts)

Todas las operaciones son asíncronas y usan `async/await`. La función `getDB()` devuelve la instancia de la BD (singleton).

**Funciones exportadas:**

```typescript
// AppState
loadAppState(): Promise<AppState | null>
saveAppState(state: AppState): Promise<void>

// Perfiles
getProfiles(): Promise<Profile[]>
saveProfile(profile: Profile): Promise<void>
deleteProfile(profileId: string): Promise<void>  // cascada completa

// Expediente clínico
getMedicalRecord(profileId: string): Promise<MedicalRecord>
saveMedicalRecord(record: MedicalRecord): Promise<void>

// Doctores
getDoctors(profileId: string): Promise<Doctor[]>
saveDoctor(doctor: Doctor & { profileId: string }): Promise<void>
deleteDoctor(doctorId: string): Promise<void>

// Citas
getAppointments(profileId: string): Promise<Appointment[]>
saveAppointment(appt: Appointment & { profileId: string }): Promise<void>
deleteAppointment(apptId: string): Promise<void>

// Síntomas
getSymptoms(profileId: string): Promise<SymptomEntry[]>
saveSymptom(entry: SymptomEntry): Promise<void>
deleteSymptom(id: string): Promise<void>

// Progreso
getProgress(profileId: string): Promise<ProgressRecord>
updateProgress(profileId: string): Promise<ProgressRecord>

// Media
saveMedia(file: MediaFile): Promise<void>
getMedia(id: string): Promise<MediaFile | undefined>
deleteMedia(id: string): Promise<void>

// Exámenes médicos
getMedicalExams(profileId: string): Promise<MedicalExam[]>
saveMedicalExam(exam: MedicalExam): Promise<void>
deleteMedicalExam(id: string): Promise<void>

// Proveedores de servicio
getServiceProviders(profileId: string): Promise<ServiceProvider[]>
saveServiceProvider(provider: ServiceProvider): Promise<void>
deleteServiceProvider(id: string): Promise<void>

// Calificaciones
saveRating(rating: Rating): Promise<void>
getRating(entityType: string, entityId: string): Promise<Rating | undefined>
deleteRating(entityType: string, entityId: string): Promise<void>

// Compartir
createShareToken(profileId: string, sections: string[]): Promise<ShareToken>
getShareToken(token: string): Promise<ShareToken | null>

// Respaldo
exportBackup(appState: AppState, pin: string): Promise<Blob>
importBackup(file: File, pin: string): Promise<AppState>

// Utilidades
generateId(): string          // crypto.randomUUID()
speak(text: string): void     // Web Speech API es-MX
```

---

## 20. Herramientas de desarrollo

### Comandos principales

```bash
npm run dev        # Servidor de desarrollo (localhost:5173, hot-reload)
npm run build      # Build de producción (TypeScript + Vite + PWA)
npm run preview    # Preview con Service Worker activo (localhost:4173)
npx tsc --noEmit   # Verificar tipos TypeScript sin compilar
```

### Makefile

El proyecto incluye un Makefile con targets que simplifican las tareas más comunes:

```bash
make install           # Instalar dependencias npm
make dev               # Servidor de desarrollo
make build             # Build de producción
make preview           # Preview con PWA
make check             # Verificar entorno (Node, npm, Ollama, dist)
make release VERSION=x.y.z  # Ciclo completo de publicación
make release-dry VERSION=x.y.z  # Simular publicación sin ejecutar
make changelog         # Abrir CHANGELOG.md para editar
make deploy-gh         # Desplegar manualmente en GitHub Pages
make skills-list       # Ver todos los skills de Claude Code
make skills-help SKILL=nombre  # Ver documentación de un skill
make mcp-test          # Verificar GitHub MCP
make setup-dev         # Configurar entorno desde cero
make ollama-pull-qwen  # Descargar modelo recomendado para español
make ollama-check      # Verificar estado de Ollama
make reset-dev         # Instrucciones para limpiar IndexedDB en el navegador
```

### Script de release (`scripts/release.sh`)

Automatiza el ciclo completo de publicación en 8 pasos:

1. Validar que la rama sea `main` y el estado del repositorio esté limpio.
2. Verificar que el tag de la versión no exista ya.
3. Actualizar `version` en `package.json`.
4. Verificar que exista una sección `## [VERSION]` en `CHANGELOG.md`.
5. Ejecutar `npm run build` (falla rápido si hay errores de compilación).
6. Commit: `chore(release): vVERSION`.
7. Tag anotado: `v{VERSION}`.
8. Push a `origin/main` + push del tag.
9. Crear GitHub Release con notas automáticas (`gh release create --generate-notes --latest`).

### Claude Code Skills (slash commands)

Definidos en `.claude/commands/`:

| Comando | Descripción |
|---------|-------------|
| `/nueva-funcion <desc>` | Planifica e implementa una feature completa (types, storage, componente, App.tsx, build, commit, CHANGELOG) |
| `/publicar <versión>` | Ciclo completo de release con validaciones y reporte de URLs |
| `/actualizar-docs` | Audita y sincroniza README y CHANGELOG con el código real |
| `/estado` | Snapshot del proyecto: versión, CI, Pages, commits pendientes |

### GitHub MCP Connector

Configurado en `.mcp.json`. Usa el token del `gh` CLI sin configuración adicional:

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

Permite a Claude Code crear issues, buscar código, gestionar PRs y releases directamente sin comandos de shell.

### CI/CD

GitHub Actions (`.github/workflows/deploy.yml`) con Node.js 24:
- Se activa en cada push a `main`.
- Ejecuta `npm run build`.
- Despliega en GitHub Pages en modo `workflow` (no `legacy`).

---

## 21. Restricciones y limitaciones conocidas

| Limitación | Descripción |
|------------|-------------|
| **Los archivos multimedia no se incluyen en el respaldo `.vsm`** | Fotos y audios no se respaldan para mantener el tamaño manejable |
| **La IA requiere conexión a internet** | Excepto Ollama (local). Todas las APIs de nube necesitan conectividad |
| **Sin sincronización entre dispositivos** | Cada dispositivo tiene su propia base de datos; el respaldo manual es el único mecanismo de transferencia |
| **La biometría depende del soporte del navegador** | WebAuthn puede no estar disponible en todos los navegadores o configuraciones |
| **Los tokens de compartir caducan en 24 horas** | No hay opción de extender o revocar manualmente (solo esperar expiración o borrar el token en IndexedDB) |
| **OCR offline tiene limitaciones de precisión** | Tesseract.js puede fallar con escritura a mano, fuentes decorativas o imágenes de baja calidad |
| **Sin soporte para múltiples idiomas en la UI** | La app está completamente en español (es-MX) |

---

## 22. Glosario

| Término | Definición |
|---------|------------|
| **PWA** | Progressive Web App — aplicación web que puede instalarse en el dispositivo y funcionar offline como una app nativa |
| **IndexedDB** | Base de datos de clave-valor en el navegador, persistente y offline-first |
| **FHIR R4** | Fast Healthcare Interoperability Resources v4 — estándar internacional para datos de salud. Esta app usa una versión simplificada |
| **AES-256-GCM** | Algoritmo de cifrado simétrico de 256 bits en modo Galois/Counter (autenticado y sin riesgo de padding oracle) |
| **PBKDF2** | Password-Based Key Derivation Function 2 — algoritmo para derivar claves criptográficas seguras a partir de contraseñas |
| **WebAuthn** | Web Authentication API — estándar web para autenticación con biometría (huella, Face ID) |
| **MediaRecorder API** | API del navegador para capturar audio/video del micrófono o cámara |
| **Web Speech API** | API del navegador para síntesis de voz (TTS) y reconocimiento de voz (STT) |
| **MCP** | Model Context Protocol — protocolo de Anthropic para conectar herramientas externas a Claude Code |
| **Ollama** | Software de código abierto para ejecutar modelos de lenguaje localmente sin internet y sin costo |
| **VSM** | Extensión del archivo de respaldo cifrado de Vida Sana Mayor (`.vsm`) |
| **Racha** | Número de días consecutivos en que el usuario ha registrado al menos una acción en la app |
| **Sol** | Unidad de recompensa de gamificación — se gana 1 sol por cada 3 registros |
| **CIE** | Clasificación Internacional de Enfermedades (ICD en inglés) — sistema de códigos diagnósticos estándar |
| **i131 / I-131** | Yodo radioactivo (radioisótopo) usado en tratamientos de tiroides — uno de los procedimientos especiales registrables |
| **PET scan** | Tomografía por Emisión de Positrones — procedimiento de imagen médica avanzada |

---

---

## 23. Detalle del flujo de Onboarding

**Archivo:** `src/components/Onboarding.tsx`

El Onboarding es un wizard de 4 pasos secuenciales. El estado del paso activo se maneja con la variable `step: 'name' | 'avatar' | 'pin' | 'ai' | 'done'`.

### Paso 1 — Nombre (`step: 'name'`)

- Campo de texto centrado con placeholder "Escribe tu nombre..."
- El botón "Continuar →" se habilita solo si el nombre no está vacío.
- Pressing Enter también avanza al siguiente paso.
- Al avanzar, la voz dice: `"Hola [nombre]. Elige un avatar que te identifique."`

### Paso 2 — Avatar (`step: 'avatar'`)

El usuario elige entre 12 opciones predefinidas:

```
🧑 👩 👨 👵 👴 🧒 👧 👦 🧑‍⚕️ 💛 💚 🌻
```

El avatar seleccionado se muestra grande como preview. El botón seleccionado tiene borde verde oliva y fondo semitransparente.

### Paso 3 — PIN (`step: 'pin'`)

- Checkbox "Usar PIN de 4 dígitos" (desactivado por defecto).
- Si el usuario activa el checkbox, aparecen dos campos: PIN y Confirmar PIN.
- Los campos tienen `inputMode="numeric"`, `maxLength={4}`, `type="password"`.
- Validación: exactamente 4 dígitos, ambos campos iguales.
- Si hay error, se muestra mensaje en rojo y no avanza.
- **El PIN es completamente opcional.** Si se omite, `authMethod` queda en `'none'`.

### Paso 4 — Inteligencia Artificial (`step: 'ai'`)

- Usa directamente el componente `AISettings` con un `AppState` provisional.
- Incluye botón "Omitir – configurar después" que llama a `finish(null)`.
- Si el usuario configura IA, `finish(aiConfig)` guarda la configuración.
- La voz al terminar dice: `"¡Perfecto, [nombre]! Tu espacio de salud está listo."`

### Función `finish(aiConfig)`

Al completar todos los pasos, `finish()`:
1. Valida el PIN si `usePIN` es `true`.
2. Genera un `profileId` con `crypto.randomUUID()`.
3. Crea el `Profile` primario con `isPrimary: true`, `relation: 'yo'`.
4. Construye el `AppState` completo con `onboardingDone: true`.
5. Si hay PIN: llama a `hashPin(pin)` y guarda el hash + `authMethod: 'pin'`.
6. Llama a `saveAppState(state)` para persistir en IndexedDB.
7. Llama a `onComplete(state)` para notificar a `App.tsx`.

### Modal "Añadir perfil" (`AddProfileModal`)

Exportado como named export `AddProfileModal` del mismo archivo. Se muestra como modal flotante desde `App.tsx` y `Settings.tsx`.

**Campos:**
- **Nombre:** texto libre, obligatorio.
- **Relación:** chips seleccionables con 12 opciones predefinidas:
  ```
  esposa  esposo  hijo  hija  padre  madre
  hermano  hermana  amigo  amiga  cuidador  cuidadora
  ```
  Más opción "otra..." que muestra un campo de texto libre.
- **Avatar:** mismas 12 opciones que el onboarding principal.

**Perfil resultante:** `isPrimary: false`. La relación se usa como etiqueta en la barra de chips de perfiles.

**Restricción:** No se puede eliminar el único perfil existente (validación en `Settings.tsx`).

---

## 24. Configuración de IA — Flujo detallado (AISettings)

**Archivo:** `src/components/AISettings.tsx`

El componente maneja 4 paneles internos con la variable `step: 'status' | 'features' | 'disclaimer' | 'config'`.

### Panel 1 — Estado actual (`step: 'status'`)

**Si ya hay IA configurada:** muestra el proveedor, modelo, URL base (si Ollama), fecha de aceptación, y dos botones: "✏️ Cambiar" y "🗑 Eliminar".

**Si no hay IA configurada:** muestra dos botones:
- "🤖 Ver funciones disponibles con IA" → avanza a `features`.
- "⚙️ Configurar Inteligencia Artificial" → avanza a `features`.
- "Omitir por ahora" (solo en Onboarding, prop `onSkip`).

### Panel 2 — Funciones disponibles (`step: 'features'`)

Muestra el componente `AIFeatureInfo` en modo `full` con la lista completa de funciones por módulo. Botones: "← Atrás" y "Configurar IA →" (avanza a `disclaimer`).

### Panel 3 — Aviso legal (`step: 'disclaimer'`)

**Solo para proveedores en la nube.** Para Ollama va directo a `config`.

Contiene:
1. Tarjeta azul destacando Ollama como opción gratuita con botón directo "🦙 Usar Ollama (gratis) →".
2. Tarjeta amarilla con el aviso legal detallado (4 puntos de responsabilidad de costos).
3. Checkbox de aceptación obligatorio: *"Acepto que los costos de IA en la nube son mi responsabilidad exclusiva..."*
4. El botón "Acepto, continuar →" solo se habilita cuando el checkbox está marcado.

### Panel 4 — Formulario de configuración (`step: 'config'`)

**Selector de proveedor:**
- Ollama destacado en tarjeta azul como opción gratuita.
- 4 proveedores en la nube listados verticalmente (Anthropic, OpenAI, Google, Mistral).
- Al cambiar de proveedor se limpian `model` y `apiKey`.

**Campo URL base (solo Ollama):** Pre-llenado con `http://localhost:11434`. Incluye guía de instalación inline (3 pasos).

**Campo API Key (solo nube):** Tipo `password` con toggle 👁/🙈 para mostrar/ocultar. Indica dónde obtener la clave de cada proveedor.

**Selector de modelo:** Botones con el nombre del modelo, nota opcional y badge de costo coloreado.

| Nivel de costo | Color del badge |
|---------------|----------------|
| Gratis | Azul claro |
| Muy bajo costo | Verde oscuro |
| Bajo costo | Verde claro |
| Costo medio | Amarillo/naranja |
| Costo alto | Rojo claro |

**Botón "⚡ Probar":** Envía el mensaje "Responde únicamente: OK" al proveedor configurado. Muestra toast de éxito o error. Útil para verificar que la clave y el modelo son correctos antes de guardar.

### Catálogo completo de modelos por proveedor

**Ollama (local, gratis):**
| Modelo ID | Nombre en UI | Nota |
|-----------|-------------|------|
| `qwen2.5:7b` | Qwen 2.5 7B – Recomendado | Mejor para español |
| `llama3.2:3b` | Llama 3.2 3B – Rápido y ligero | Muy rápido |
| `llama3.1:8b` | Llama 3.1 8B – Equilibrado | — |
| `mistral:7b` | Mistral 7B – Sólido y versátil | — |
| `gemma2:9b` | Gemma 2 9B – Buena comprensión | — |
| `phi3.5:mini` | Phi-3.5 Mini – Ultra ligero | Dispositivos lentos |
| `deepseek-r1:8b` | DeepSeek-R1 8B – Bueno para razonamiento | — |

**Anthropic:**
| Modelo ID | Costo |
|-----------|-------|
| `claude-haiku-4-5-20251001` | Muy bajo |
| `claude-sonnet-4-6` | Medio |
| `claude-opus-4-6` | Alto |

**OpenAI:**
| Modelo ID | Costo |
|-----------|-------|
| `gpt-4o-mini` | Muy bajo |
| `gpt-4o` | Alto |
| `gpt-3.5-turbo` | Muy bajo |

**Google:**
| Modelo ID | Costo |
|-----------|-------|
| `gemini-2.0-flash` | Bajo |
| `gemini-1.5-flash` | Muy bajo |
| `gemini-1.5-pro` | Medio |

**Mistral:**
| Modelo ID | Costo |
|-----------|-------|
| `mistral-small-latest` | Bajo |
| `mistral-large-latest` | Alto |

---

## 25. Acuerdo de Uso — 8 puntos

**Archivo:** `src/components/Agreement.tsx`

El Acuerdo de Uso se muestra obligatoriamente al primer inicio. Requiere **dos checkboxes independientes**:

- ☐ Checkbox 1: Acepto los términos generales (puntos 1-7).
- ☐ Checkbox 2: Acepto el aviso de IA y costos (punto 8).

Ambos deben estar marcados para habilitar el botón "Acepto y quiero continuar →".

### Los 8 puntos del acuerdo

| # | Título | Contenido resumido |
|---|--------|-------------------|
| 1 | Privacidad total | Todos los datos se guardan únicamente en el dispositivo del usuario. Ningún dato se envía a servidores externos. |
| 2 | Datos seguros | Los respaldos se protegen con cifrado AES-256. |
| 3 | Uso personal | La app no reemplaza la consulta médica profesional. Es una herramienta de registro y organización personal. |
| 4 | Respaldo | El usuario es responsable de hacer copias de seguridad periódicas. |
| 5 | Compartir | El usuario decide qué información comparte. Los enlaces de compartir expiran en 24 horas. |
| 6 | Código abierto | La aplicación es gratuita y de código abierto (Apache 2.0). Nunca tendrá costo de suscripción. |
| 7 | Sin publicidad | No se muestran anuncios. No se venden datos. |
| 8 | Inteligencia Artificial | Las funciones de IA son completamente opcionales. Utilizan servicios externos de terceros que cobran por su uso. Los costos son exclusiva responsabilidad del usuario que configura su clave API. El autor de la app no tiene responsabilidad alguna. |

### Función "Leer en voz alta"

Botón 🔊 que activa la narración completa de los 8 puntos mediante Web Speech API (es-MX). Al tocar de nuevo mientras está leyendo, cancela la narración.

La lectura inicia automáticamente (con 600ms de delay) al cargar la pantalla del acuerdo.

---

## 26. Funciones de IA por módulo (AIFeatureInfo)

**Archivo:** `src/components/AIFeatureInfo.tsx`

Componente informativo reutilizable con dos modos:

### Modo `'banner'` (Dashboard)
Muestra un bloque compacto con chips por sección y botón "⚙️ Configurar IA". Solo aparece cuando `aiConfig` es `null` o `undefined`.

### Modo `'full'` (AISettings → panel features)
Lista expandida con las funciones específicas de cada módulo.

### Funciones documentadas por sección

| Módulo | Funciones con IA habilitadas |
|--------|------------------------------|
| 📝 **Diario de síntomas** | Análisis de patrones en registros; sugerencias sobre posibles desencadenantes; resumen automático del historial |
| 📋 **Expediente clínico** | Resumen automático de notas de consulta; generación de resumen clínico para compartir con médicos; organización inteligente de información |
| 📷 **Escaneo de documentos** | Interpretación de resultados de laboratorio escaneados; explicación en lenguaje sencillo de términos médicos; extracción estructurada de datos de recetas |
| 💊 **Medicamentos** | Alerta sobre posibles interacciones; explicación del propósito de cada medicamento; sugerencias de horarios de toma personalizados |
| 🏠 **Panel principal** | Resumen diario personalizado del estado de salud; alertas inteligentes basadas en el historial |

**Nota de implementación:** En v1.4.0, el resumen IA está activo en Exámenes Médicos (`MedicalExams.tsx`) y Proveedores (`ServiceProviders.tsx`). Las funciones listadas para Síntomas, Expediente, Escaneo y Medicamentos están documentadas como funciones habilitadas pero la integración completa de IA en esos módulos es trabajo futuro.

---

## 27. Configuración PWA (vite.config.ts)

**Archivo:** `vite.config.ts`

### Base URL

```typescript
const base = '/vida-sana-mayor/'
```

Todas las rutas de assets y el Service Worker usan este prefijo. Es necesario porque la app se publica en un subdirectorio de GitHub Pages, no en la raíz del dominio.

### Manifest de la PWA

| Campo | Valor |
|-------|-------|
| `name` | Vida Sana Mayor |
| `short_name` | VidaSana |
| `description` | Tu salud, en tus manos. 100% privado y offline. |
| `theme_color` | `#8A9A5B` (verde oliva) |
| `background_color` | `#F5F0E1` (beige) |
| `display` | `standalone` (sin barra del navegador) |
| `orientation` | `portrait` |
| `lang` | `es-MX` |
| `start_url` | `/vida-sana-mayor/` |
| `scope` | `/vida-sana-mayor/` |

### Iconos requeridos

| Archivo | Tamaño | Propósito |
|---------|--------|-----------|
| `public/icons/icon-192.png` | 192×192px | App icon estándar + maskable |
| `public/icons/icon-512.png` | 512×512px | Splash screen + maskable |

### Estrategia de caché (Workbox)

| Patrón | Estrategia | Descripción |
|--------|------------|-------------|
| `**/*.{js,css,html,ico,png,svg,woff2}` | Pre-cache | Se cachea en la instalación del Service Worker |
| `https://fonts.googleapis.com/*` | CacheFirst | 365 días, máx 10 entradas |
| Todo lo demás | NetworkFirst (implícito) | Intenta red primero, cae a caché |

**`navigateFallback: 'index.html'`** — Cualquier ruta que no exista como archivo sirve `index.html`. Esto es necesario para que el routing del SPA funcione correctamente cuando se recarga directamente en cualquier "ruta" de la app.

**`registerType: 'autoUpdate'`** — El Service Worker se actualiza automáticamente cuando hay una nueva versión desplegada, sin requerir acción manual del usuario.

---

## 28. Dependencias del proyecto

### Dependencias de producción (`package.json → dependencies`)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react` | ^18.2.0 | Framework UI |
| `react-dom` | ^18.2.0 | Renderer de React para el DOM |
| `idb` | ^8.0.0 | Wrapper de IndexedDB con API basada en Promesas |
| `qrcode` | ^1.5.3 | Generación de códigos QR para compartir |
| `tesseract.js` | ^5.0.4 | OCR offline en el navegador (Wasm) |

### Dependencias de desarrollo (`devDependencies`)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `@types/react` | ^18.2.66 | Tipos TypeScript para React |
| `@types/react-dom` | ^18.2.22 | Tipos TypeScript para React DOM |
| `@types/qrcode` | ^1.5.5 | Tipos TypeScript para qrcode |
| `@vitejs/plugin-react` | ^4.2.1 | Plugin de Vite para React (SWC) |
| `typescript` | ^5.2.2 | Compilador TypeScript |
| `vite` | ^5.2.0 | Bundler y servidor de desarrollo |
| `vite-plugin-pwa` | ^0.19.0 | Generación automática del Service Worker y manifest |
| `workbox-precaching` | ^7.0.0 | Pre-cache de assets en Service Worker |
| `workbox-routing` | ^7.0.0 | Enrutamiento de requests en Service Worker |
| `workbox-strategies` | ^7.0.0 | Estrategias de caché (CacheFirst, NetworkFirst, etc.) |

### Por qué `idb` y no IndexedDB directamente

La API nativa de IndexedDB usa callbacks y es verbosa. `idb` la envuelve en una API de Promesas limpia que permite usar `async/await`, reduce el boilerplate y maneja los errores de manera más predecible.

### Por qué `tesseract.js` y no una API de OCR en la nube

La app debe funcionar 100% offline. `tesseract.js` compila el motor Tesseract OCR a WebAssembly y lo ejecuta en el navegador. No hay envío de imágenes a servidores externos.

---

## 29. Decisiones de arquitectura

Esta sección explica el **por qué** detrás de las decisiones técnicas más importantes. Entender el razonamiento ayuda a mantener la coherencia del proyecto al extenderlo.

### ¿Por qué no hay router (React Router, TanStack Router)?

La app es mobile-first con navegación similar a una app nativa. El modelo de "una vista activa a la vez" se expresa perfectamente con un `useState<AppView>`. Un router añadiría complejidad (URLs, historial, navegación con el botón de atrás) sin beneficio real en un SPA instalable donde el usuario no escribe URLs.

### ¿Por qué no hay gestor de estado global (Redux, Zustand, Jotai)?

El árbol de componentes es plano (máximo 2-3 niveles de profundidad desde App). El `AppState` se pasa hacia abajo como props. Las mutaciones siempre pasan por `saveAppState()` y luego `setAppState()` en `App.tsx`. No hay comunicación compleja entre ramas del árbol. Un gestor de estado global añadiría una dependencia y convenciones adicionales sin resolver ningún problema real.

### ¿Por qué IndexedDB y no localStorage?

| Criterio | localStorage | IndexedDB |
|----------|-------------|-----------|
| Límite de tamaño | ~5-10MB | Varios GB (limitado por el disco) |
| Tipo de datos | Solo strings | ArrayBuffer, Blob, objetos complejos |
| Operaciones asíncronas | No (bloquea el hilo) | Sí (no bloquea) |
| Soporte para archivos multimedia | No | Sí (almacena ArrayBuffer) |

Las fotos, audios y documentos son la razón determinante. localStorage no puede almacenarlos directamente.

### ¿Por qué no hay backend ni API propia?

El principio central de "zero datos en servidor" excluye tener un backend propio. Añadir un backend implicaría: autenticación de usuarios, infraestructura de servidor, costos operativos continuos, mantenimiento de seguridad, y sobre todo, comprometer la privacidad que es la propuesta de valor central de la app.

### ¿Por qué el respaldo no incluye los archivos multimedia?

Los archivos multimedia (audio, fotos) se almacenan como `ArrayBuffer` en IndexedDB. Incluirlos en el backup `.vsm` haría que el archivo fuese potencialmente enorme (varios GB). La solución actual es un compromiso: el respaldo cubre los datos estructurales que son los más críticos (historial médico, medicamentos, diagnósticos). Una versión futura podría explorar backups en formato zip o por partes.

### ¿Por qué Workbox y no Service Worker manual?

Workbox maneja automáticamente: pre-caching de assets en la instalación, actualizaciones de caché cuando hay nueva versión, estrategias de red por tipo de recurso, y limpieza de caches antiguas. Escribir esto manualmente requeriría cientos de líneas de código propenso a errores.

### ¿Por qué PBKDF2 con 310,000 iteraciones?

NIST SP 800-63B (2023) recomienda un mínimo de 310,000 iteraciones de PBKDF2-SHA256 para protección de contraseñas. Este número hace que un ataque de fuerza bruta offline sea computacionalmente costoso incluso en hardware moderno. El costo para el usuario legítimo (al desbloquear la app o generar un respaldo) es de aproximadamente 1 segundo, que es aceptable.

---

## 30. Guía de implementación para desarrolladores

Esta sección está diseñada para que un desarrollador junior pueda reproducir el proyecto desde cero, entender el flujo de desarrollo y contribuir correctamente.

### Requisitos previos

Antes de empezar, asegúrate de tener instalado:

```bash
# Verificar versiones mínimas
node --version   # Debe ser 18 o superior (recomendado: 24)
npm --version    # 10 o superior
git --version    # Cualquier versión reciente
gh --version     # GitHub CLI (para publicar versiones)
```

### Configuración inicial del entorno

```bash
# 1. Clonar el repositorio
git clone https://github.com/untaldouglas/vida-sana-mayor.git
cd vida-sana-mayor

# 2. Instalar dependencias
npm install
# o con el Makefile:
make install

# 3. Verificar que todo está en orden
make check

# 4. Iniciar el servidor de desarrollo
npm run dev
# La app estará disponible en http://localhost:5173/vida-sana-mayor/
```

### Ciclo de desarrollo estándar

```
1. Crear o modificar archivo en src/
2. El servidor de desarrollo (Vite) recarga automáticamente (HMR)
3. Verificar que TypeScript no tiene errores: npx tsc --noEmit
4. Hacer commit con Conventional Commits:
   git add src/components/NuevoComponente.tsx
   git commit -m "feat(nombre): descripción del cambio"
```

### Convención de commits (Conventional Commits)

| Tipo | Cuándo usarlo |
|------|--------------|
| `feat(scope):` | Nueva funcionalidad |
| `fix(scope):` | Corrección de bug |
| `docs(scope):` | Documentación |
| `chore(scope):` | Tareas de mantenimiento, configuración |
| `refactor(scope):` | Refactorización sin cambio de comportamiento |
| `ci(scope):` | Cambios en CI/CD |

Ejemplo: `feat(exams): agregar filtro por estado en lista de exámenes`

### Cómo agregar un nuevo módulo

Sigue este orden para mantener consistencia:

**Paso 1 — Agregar tipos en `src/types/index.ts`:**
```typescript
export interface NuevoTipo {
  id: string
  profileId: string
  // ... campos
  createdAt: string
}

// Si necesita vista propia, agregar a AppView:
export type AppView = ... | 'nuevo-modulo'
```

**Paso 2 — Agregar funciones de storage en `src/storage.ts`:**
```typescript
export async function getNuevos(profileId: string): Promise<NuevoTipo[]> { ... }
export async function saveNuevo(item: NuevoTipo): Promise<void> { ... }
export async function deleteNuevo(id: string): Promise<void> { ... }
```

Si necesitas una nueva colección en IndexedDB, incrementar `DB_VERSION` y agregar en `upgrade(db)`:
```typescript
if (!db.objectStoreNames.contains('nuevaColeccion')) {
  const store = db.createObjectStore('nuevaColeccion', { keyPath: 'id' })
  store.createIndex('profileId', 'profileId')
}
```

**Paso 3 — Crear componente en `src/components/NuevoModulo.tsx`:**
```typescript
interface NuevoModuloProps {
  profile: Profile
  showToast: (msg: string, type?: string) => void
  aiConfig?: AIConfig | null  // solo si usa IA
}

export default function NuevoModulo({ profile, showToast }: NuevoModuloProps) {
  // ... implementación
}
```

**Paso 4 — Registrar en `src/App.tsx`:**
```typescript
// 1. Import
import NuevoModulo from './components/NuevoModulo'

// 2. Agregar a VIEW_TITLES
'nuevo-modulo': '🆕 Nuevo Módulo',

// 3. Renderizar
{view === 'nuevo-modulo' && <NuevoModulo profile={activeProfile} showToast={showToast} />}

// 4. Agregar al menú "Más opciones"
{ icon: '🆕', label: 'Nuevo Módulo', v: 'nuevo-modulo' as AppView },
```

**Paso 5 — Verificar build:**
```bash
npm run build
# Debe completar sin errores de TypeScript ni de Vite
```

### Convenciones de estilo del código

- **Sin CSS modules ni styled-components.** Los estilos van en `App.css` (globales) o como objetos de estilo inline en el JSX.
- **Variables CSS** para colores y tipografía: usar `var(--olive)`, `var(--sun)`, `var(--text)`, etc.
- **Clases predefinidas** para componentes comunes: `card`, `btn btn-primary`, `btn btn-outline`, `btn btn-sm`, `form-group`, `item-list`, `item-row`, `modal-overlay`, `modal-box`.
- **`minHeight: 'var(--min-touch)'`** en todos los botones interactivos (60px mínimo).
- **Voz en eventos importantes:** llamar a `speak(texto)` al guardar, confirmar o alertar al usuario.

### Cómo reiniciar la app en el navegador (para pruebas)

```bash
make reset-dev
# Te muestra las instrucciones según el navegador
```

O manualmente en Chrome:
1. `F12` → Application → Storage → Clear site data
2. Recargar la página

Esto borra IndexedDB y el Service Worker, reiniciando el flujo desde el Acuerdo de Uso.

### Proceso de publicación de una nueva versión

```bash
# 1. Editar CHANGELOG.md: mover cambios de [Unreleased] a [x.y.z]
make changelog   # Abre el archivo

# 2. Publicar
make release VERSION=1.5.0

# Esto hace automáticamente:
#   ✅ Valida rama (main) y estado limpio del repo
#   ✅ Actualiza version en package.json
#   ✅ Verifica que [1.5.0] existe en CHANGELOG.md
#   ✅ npm run build (falla si hay errores)
#   ✅ Commit: chore(release): v1.5.0
#   ✅ Tag anotado: v1.5.0
#   ✅ Push a origin/main + push del tag
#   ✅ GitHub Release creado con notas automáticas
#   ✅ GitHub Actions despliega en GitHub Pages automáticamente
```

### CI/CD — GitHub Actions

**Archivo:** `.github/workflows/deploy.yml`

Se activa en cada push a `main` o manualmente (`workflow_dispatch`). Pasos:
1. Checkout del repositorio.
2. Setup Node.js 24 con caché de npm.
3. `npm ci` — instalación limpia de dependencias.
4. `npm run build` — compilación (TypeScript + Vite + PWA).
5. Upload del directorio `dist/` como artifact de Pages.
6. Deploy del artifact a GitHub Pages (modo `workflow`, no `legacy`).

**Importante:** GitHub Pages debe estar configurado en modo `workflow` (no en modo `legacy` que sirve desde la raíz del branch `main`). Verificar en: Settings → Pages → Build and deployment → Source → "GitHub Actions".

---

## 31. Checklist de requisitos funcionales

Lista completa para verificar que la implementación cumple con todos los requisitos de la app.

### Primer uso

- [ ] Al abrir por primera vez, muestra el Acuerdo de Uso antes de cualquier otra pantalla.
- [ ] El botón "Continuar" del Acuerdo requiere ambos checkboxes marcados.
- [ ] El Acuerdo se lee automáticamente en voz al cargar.
- [ ] El Onboarding guía por 4 pasos: nombre → avatar → PIN → IA.
- [ ] El PIN es opcional y configurable después desde Settings.
- [ ] La configuración de IA es opcional y configurable después desde Settings.
- [ ] Después del Onboarding, si hay PIN, la app pide autenticación.

### Autenticación

- [ ] PIN de 4 dígitos con teclado numérico en pantalla.
- [ ] La verificación del PIN usa PBKDF2 con 310,000 iteraciones.
- [ ] Si la autenticación es `'biometric'`, intenta WebAuthn automáticamente al cargar.
- [ ] Si WebAuthn falla, el usuario puede usar PIN como fallback.
- [ ] PIN incorrecto muestra mensaje de error y limpia los puntos.

### Multiperfil

- [ ] Se pueden crear múltiples perfiles con nombre, avatar y relación.
- [ ] La barra de chips de perfiles aparece solo si hay más de 1 perfil.
- [ ] Cambiar perfil activo navega automáticamente al Dashboard.
- [ ] Eliminar un perfil borra todos sus datos en cascada (todas las colecciones).
- [ ] No se puede eliminar el único perfil existente.

### Medicamentos

- [ ] Se pueden añadir medicamentos con nombre, dosis, frecuencia y horarios.
- [ ] El botón "Tomar" descuenta 1 del stock y registra en `takenHistory`.
- [ ] La voz confirma el registro de toma.
- [ ] Los medicamentos con `endDate` pasado se muestran en "Historial".
- [ ] Los medicamentos con `stock <= stockAlert` aparecen en alerta en Dashboard.
- [ ] Se pueden adjuntar hasta 8 fotos por medicamento.
- [ ] Se puede calificar con 1-5 estrellas.

### Expediente clínico

- [ ] Soporta diagnósticos con código CIE opcional y estado (activo/crónico/resuelto).
- [ ] Soporta alergias con severidad (leve/moderada/severa).
- [ ] Soporta vacunas con fecha de próxima dosis.
- [ ] Soporta cirugías, resultados de laboratorio, antecedentes familiares y consultas.
- [ ] Los diagnósticos activos/crónicos aparecen en el Dashboard.

### Exámenes médicos

- [ ] Soporta 3 categorías: laboratorio, radiología, procedimiento especial.
- [ ] Muestra chips de tipos predefinidos (55+ en total) por categoría.
- [ ] Permite tipo personalizado con "✏️ Otro...".
- [ ] El estado del examen es: pendiente / en_proceso / completado / cancelado.
- [ ] Permite vincular doctor y proveedor desde listas registradas o texto libre.
- [ ] Soporta nota de voz grabada con MediaRecorder.
- [ ] Si hay IA configurada, permite generar resumen automático.
- [ ] Soporta hasta 8 fotos (resultados, radiografías, documentos).
- [ ] Se puede calificar con 1-5 estrellas.
- [ ] Los filtros por categoría muestran contadores.

### Proveedores de servicios médicos

- [ ] Soporta 7 categorías con color e ícono diferente.
- [ ] Los chips de filtro solo aparecen para categorías con al menos 1 proveedor.
- [ ] Soporta nota de voz, resumen IA y hasta 8 fotos.
- [ ] Se puede calificar con 1-5 estrellas y comentario.
- [ ] El teléfono genera enlace `tel:` para llamada directa.
- [ ] Los proveedores registrados están disponibles para selección en Exámenes.

### Agenda y doctores

- [ ] Las citas se ordenan por fecha ascendente.
- [ ] Las próximas 3 citas aparecen en el Dashboard.
- [ ] Los doctores se vinculan a diagnósticos del expediente.
- [ ] Los doctores registrados están disponibles para selección en Citas y Exámenes.
- [ ] El teléfono del doctor genera enlace `tel:`.
- [ ] Los doctores se pueden calificar con 1-5 estrellas y comentario.

### Diario de síntomas

- [ ] Escala de dolor con 4 niveles (0-3) representados con emojis.
- [ ] Se puede adjuntar nota de voz con MediaRecorder.
- [ ] Cada registro actualiza el progreso (soles y racha).

### IA (cuando está configurada)

- [ ] Soporta 5 proveedores: Ollama, Anthropic, OpenAI, Google, Mistral.
- [ ] Para Ollama: no requiere API key, usa URL base configurable.
- [ ] Para proveedores en la nube: requiere aceptación de aviso de costos.
- [ ] La clave API se almacena solo en IndexedDB, nunca sale del dispositivo.
- [ ] El botón "⚡ Probar" verifica la conexión antes de guardar.
- [ ] El resumen IA funciona en Exámenes médicos y Proveedores.

### Respaldo y compartir

- [ ] El respaldo `.vsm` se cifra con AES-256-GCM + PBKDF2 (salt aleatorio).
- [ ] El respaldo incluye todos los datos estructurales de todos los perfiles.
- [ ] La importación del respaldo requiere el PIN correcto; si es incorrecto, muestra error.
- [ ] El QR de compartir expira en 24 horas.
- [ ] El usuario puede seleccionar qué secciones compartir.

### PWA

- [ ] La app es instalable en Android, iOS y desktop.
- [ ] Funciona completamente offline después de la primera carga.
- [ ] El Service Worker se actualiza automáticamente al haber nueva versión.
- [ ] El manifest incluye iconos de 192px y 512px.
- [ ] `display: standalone` — se muestra sin barra del navegador al instalar.

---

## 32. Historial de versiones

| Versión | Fecha | Cambios principales |
|---------|-------|---------------------|
| **1.4.0** | 2026-03-25 | Skills de Claude Code (`/nueva-funcion`, `/publicar`, `/actualizar-docs`, `/estado`); GitHub MCP connector (`.mcp.json`); targets de Makefile (`skills-list`, `mcp-test`, `setup-dev`); documentación `docs/HERRAMIENTAS_IA.md`; GitHub Actions Node.js 20 → 24 |
| **1.3.0** | 2026-03-25 | Módulo Exámenes Médicos (55+ tipos predefinidos en 3 categorías); Módulo Proveedores de Servicios Médicos (7 categorías); Sistema de calificaciones ⭐ (1-5) para doctores, medicamentos, exámenes y proveedores; adjuntos enriquecidos (nota de voz, resumen IA, hasta 8 fotos) en exámenes y proveedores; IndexedDB v2 (`medicalExams`, `serviceProviders`, `ratings`) |
| **1.2.0** | 2026-03-18 | Fotos en medicamentos (caja, receta, indicaciones); fotos en doctores; fotos en citas médicas; componentes `ImagePicker` y `ImageThumbs` reutilizables |
| **1.1.0** | 2026-03-10 | Inteligencia Artificial opcional (5 proveedores); `AISettings.tsx` con selector de modelos y test de conexión; `AIFeatureInfo.tsx`; `aiService.ts`; biometría WebAuthn; aviso explícito de costos de IA en Acuerdo y Onboarding |
| **1.0.0** | 2026-03-01 | Lanzamiento inicial: PWA offline 100%; multiperfil; expediente FHIR R4; medicamentos con recordatorios y stock; agenda; doctores; diario de síntomas; OCR offline (Tesseract.js); grabación de consultas; progreso y gamificación; compartir temporal (QR 24h); respaldo cifrado AES-256-GCM; autenticación PIN + PBKDF2; voz femenina es-MX |

---

*Documento generado el 2026-03-25 a las 16:57 a partir del código fuente de Vida Sana Mayor v1.4.0.*
*Para mantenerse actualizado, ejecutar `/actualizar-docs` en Claude Code o revisar `CHANGELOG.md`.*
