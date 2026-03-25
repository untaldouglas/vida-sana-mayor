# ☀️ Vida Sana Mayor

**Tu salud, en tus manos. 100% privado, 100% offline.**

Progressive Web App (PWA) gratuita y de código abierto para adultos con enfermedades crónicas y sus cuidadores.

[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-8A9A5B.svg)](https://web.dev/progressive-web-apps/)
[![Offline](https://img.shields.io/badge/Offline-100%25-F4C430.svg)](#)
[![AI Optional](https://img.shields.io/badge/IA-Opcional-blue.svg)](#-inteligencia-artificial-opcional)

---

## 🌟 Características

| Módulo | Descripción |
|--------|-------------|
| 👥 **Multiperfil** | Titular + perfiles familiares (esposa, hijo, cuidador...) |
| 📋 **Expediente FHIR R4** | Diagnósticos, alergias, vacunas, cirugías, antecedentes familiares |
| 💊 **Medicamentos** | Recordatorios por voz, inventario con alertas, registro de toma |
| 📅 **Agenda médica** | Citas, doctores vinculados, vista semanal |
| 😊 **Diario de síntomas** | Escala de dolor con caritas, grabación de voz, foto |
| 📷 **Escaneo OCR** | Foto de documentos + extracción de texto |
| 🎙 **Grabación consulta** | Graba consultas médicas con notas y resumen |
| 📈 **Progreso** | Soles que crecen, racha de días, mensajes motivadores |
| 🔗 **Compartir temporal** | QR + enlace de 24 horas para médicos |
| 🔒 **Autenticación** | PIN de 4 dígitos |
| 💾 **Respaldo cifrado** | Archivo `.vsm` con AES-256-GCM |
| 🗣 **Voz en español** | Narración femenina dulce en es-MX |
| 🤖 **IA opcional** | Análisis y asistencia con tu propio proveedor (Ollama local o nube) |

---

## 🤖 Inteligencia Artificial (opcional)

La IA es **completamente opcional**. La app funciona 100% sin configurarla.

Al habilitarla, desbloqueas funciones como:

- 📝 **Diario de síntomas** – Análisis de patrones y sugerencias basadas en tus registros
- 📋 **Expediente clínico** – Resúmenes automáticos de consultas y notas médicas
- 📷 **Escaneo inteligente** – Interpretación de resultados de laboratorio y documentos
- 💊 **Medicamentos** – Alerta sobre posibles interacciones entre medicamentos
- 🏠 **Dashboard** – Resumen personalizado de tu estado de salud

### Proveedores soportados

| Proveedor | Tipo | Costo | Modelos recomendados |
|-----------|------|-------|----------------------|
| 🦙 **Ollama** | Local (tu equipo) | **Gratis** | qwen2.5:7b, llama3.1:8b, mistral:7b |
| 🔶 **Anthropic** | Nube | Pago | Claude Haiku 4.5, Sonnet 4.6, Opus 4.6 |
| ⬛ **OpenAI** | Nube | Pago | GPT-4o, GPT-4o Mini |
| 🔷 **Google** | Nube | Pago | Gemini 2.0 Flash, 1.5 Pro |
| 🌊 **Mistral AI** | Nube | Pago | Mistral Small, Large |

### ⚠️ Aviso de costos y responsabilidad

> **Vida Sana Mayor es gratuita (Apache 2.0). El uso de la app no tiene ningún costo.**
>
> Las funciones de IA en la nube utilizan servicios de terceros (Anthropic, OpenAI, Google, Mistral)
> que **cobran por cada uso según sus propias tarifas**.
>
> **Los costos generados son exclusiva responsabilidad del usuario que configura su clave API.**
> El autor de esta aplicación **no tiene responsabilidad alguna** por dichos costos
> bajo ninguna circunstancia.
>
> Se recomienda Ollama para uso local gratuito.

La app solicita aceptación explícita de estos términos antes de permitir configurar cualquier proveedor en la nube.

### Configurar Ollama (gratis)

```bash
# Instalar Ollama
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Descargar modelo recomendado (bueno para español)
ollama pull qwen2.5:7b

# O con Make:
make ollama-pull-qwen    # qwen2.5:7b  – recomendado para español
make ollama-pull-llama   # llama3.1:8b – equilibrado
make ollama-pull-mistral # mistral:7b  – versátil
```

En la app: **⚙️ Más → Configuración → Inteligencia Artificial → Ollama (local)**

---

## 🚀 Inicio rápido

### Prerrequisitos
- Node.js 18+ y npm

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/vida-sana-mayor.git
cd vida-sana-mayor

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Construir para producción
npm run build

# Vista previa de producción (con Service Worker activo)
npm run preview
```

### Con Makefile

```bash
make help         # Ver todos los comandos disponibles
make install      # Instalar dependencias
make dev          # Servidor de desarrollo (localhost:5173)
make build        # Build de producción
make preview      # Preview con PWA completo (localhost:4173)
make check        # Verificar entorno y dependencias
make clean        # Limpiar build

# Ollama (IA local gratuita)
make ollama-check        # Verificar que Ollama está corriendo
make ollama-pull-qwen    # Descargar modelo recomendado (español)
make ollama-pull-llama   # Descargar Llama 3.1 8B
make ollama-pull-all     # Descargar todos los modelos recomendados

# Despliegue
make deploy-gh    # GitHub Pages
```

---

## 📱 Instalación como PWA

1. Abre la app en Chrome/Safari/Edge
2. Busca el botón "Instalar" o "Añadir a inicio"
3. ¡Listo! La app funciona 100% sin internet

---

## 🔒 Privacidad y seguridad

- **Zero datos en servidor** – todo vive en tu dispositivo
- **IndexedDB** para almacenamiento local
- **AES-256-GCM** para respaldos cifrados
- **PBKDF2** con 310,000 iteraciones para derivación de claves
- **Sin rastreo, sin analytics, sin publicidad**
- **Clave API de IA** almacenada solo en tu dispositivo, nunca en servidores del autor

---

## 🏗 Arquitectura

```
src/
├── main.tsx                # Punto de entrada
├── App.tsx                 # Aplicación principal + navegación
├── App.css                 # Estilos globales (diseño cálido)
├── storage.ts              # IndexedDB + cifrado AES-256
├── types/
│   └── index.ts            # Tipos TypeScript (FHIR R4 simplificado + AIConfig)
├── services/
│   └── aiService.ts        # Capa de servicio IA (Ollama, Anthropic, OpenAI, Google, Mistral)
└── components/
    ├── Agreement.tsx        # Acuerdo de uso (incl. aviso de IA) con voz
    ├── Onboarding.tsx       # Onboarding + configuración IA inicial + añadir perfiles
    ├── Auth.tsx             # PIN + biometría
    ├── Dashboard.tsx        # Pantalla principal + estado de IA
    ├── Medications.tsx      # Gestión de medicamentos
    ├── MedicalRecord.tsx    # Expediente clínico (FHIR R4)
    ├── SymptomDiary.tsx     # Diario de síntomas
    ├── Agenda.tsx           # Agenda y citas
    ├── Doctors.tsx          # Gestión de doctores
    ├── Progress.tsx         # Progreso y soles
    ├── Scan.tsx             # OCR + grabación de consultas
    ├── ShareExport.tsx      # QR + respaldo cifrado
    ├── Settings.tsx         # Configuración + autoría + donativos
    ├── AISettings.tsx       # Configuración de proveedor IA (Ollama/nube)
    └── AIFeatureInfo.tsx    # Componente informativo de funciones con IA
```

---

## 🎨 Diseño

Paleta cálida inspirada en papel reciclado:

| Color | Hex | Uso |
|-------|-----|-----|
| Beige | `#F5F0E1` | Fondo principal |
| Verde oliva | `#8A9A5B` | Primario / header |
| Amarillo sol | `#F4C430` | Acciones positivas / avisos IA |
| Rosa pastel | `#F8D7DA` | Alertas suaves |
| Azul | `#1976D2` | Ollama / opciones gratuitas |

**Tipografía**: Nunito (redondeada, amigable)
**Botones mínimos**: 60×60 px para accesibilidad táctil

---

## 🌐 Tecnología

- **React 18** + TypeScript
- **Vite 5** + vite-plugin-pwa
- **Workbox** (Service Worker, caché offline)
- **IndexedDB** via `idb`
- **Web Crypto API** (AES-256-GCM nativa del navegador)
- **Tesseract.js** (OCR offline)
- **QRCode.js** (generación de QR)
- **Web Speech API** (voz + reconocimiento es-MX)
- **Fetch API** (llamadas a proveedores de IA, usando credenciales del usuario)

---

## 🗂 Flujo de primer uso

```
Acuerdo de uso
  └── Acepta términos generales (puntos 1-7)
  └── Acepta aviso de IA y costos (punto 8) ← obligatorio por separado
        ↓
Onboarding
  └── Nombre → Avatar → PIN opcional → Configurar IA (opcional)
        ↓
Dashboard
  └── Banner "Configurar IA" si aún no está configurada
  └── Estado "IA activa" si está configurada
```

---

## 📜 Licencia

Apache License 2.0 – Libre, gratuito, sin fines de lucro.

Esta licencia **no cubre** los costos de servicios externos de IA. Ver sección
[⚠️ Aviso de costos](#️-aviso-de-costos-y-responsabilidad).

---

## 👤 Autor

**Douglas Galindo**
🌐 [untaldouglas.info](https://www.untaldouglas.info/)

---

## ☕ Apoya el proyecto

Si esta app te ha sido útil, considera hacer una donación voluntaria:

**[Ko-fi · ko-fi.com/untaldouglas](https://ko-fi.com/untaldouglas)**

La app siempre será gratuita. Los donativos ayudan a mantener y mejorar el proyecto.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:

1. Abre un issue describiendo el cambio
2. Haz fork y crea una rama `feature/tu-mejora`
3. Envía un Pull Request

---

*"Esto es mío, me cuida, y avanzo."*
