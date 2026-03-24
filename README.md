# ☀️ Vida Sana Mayor

**Tu salud, en tus manos. 100% privado, 100% offline.**

Progressive Web App (PWA) gratuita y de código abierto para adultos con enfermedades crónicas y sus cuidadores.

[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-8A9A5B.svg)](https://web.dev/progressive-web-apps/)
[![Offline](https://img.shields.io/badge/Offline-100%25-F4C430.svg)](#)

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
| 🔒 **Autenticación** | PIN de 4 dígitos + biometría (WebAuthn) |
| 💾 **Respaldo cifrado** | Archivo `.vsm` con AES-256-GCM |
| 🗣 **Voz en español** | Narración femenina dulce en es-MX |

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
make install    # Instalar dependencias
make dev        # Servidor de desarrollo
make build      # Build de producción
make preview    # Preview con PWA completo
make clean      # Limpiar build
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

---

## 🏗 Arquitectura

```
src/
├── main.tsx              # Punto de entrada
├── App.tsx               # Aplicación principal + navegación
├── App.css               # Estilos globales (diseño cálido)
├── storage.ts            # IndexedDB + cifrado AES-256
├── types/
│   └── index.ts          # Tipos TypeScript (FHIR R4 simplificado)
└── components/
    ├── Agreement.tsx      # Acuerdo de uso con voz
    ├── Onboarding.tsx     # Onboarding + añadir perfiles
    ├── Auth.tsx           # PIN + biometría
    ├── Dashboard.tsx      # Pantalla principal
    ├── Medications.tsx    # Gestión de medicamentos
    ├── MedicalRecord.tsx  # Expediente clínico (FHIR R4)
    ├── SymptomDiary.tsx   # Diario de síntomas
    ├── Agenda.tsx         # Agenda y citas
    ├── Doctors.tsx        # Gestión de doctores
    ├── Progress.tsx       # Progreso y soles
    ├── Scan.tsx           # OCR + grabación de consultas
    ├── ShareExport.tsx    # QR + respaldo cifrado
    └── Settings.tsx       # Configuración
```

---

## 🎨 Diseño

Paleta cálida inspirada en papel reciclado:

| Color | Hex | Uso |
|-------|-----|-----|
| Beige | `#F5F0E1` | Fondo principal |
| Verde oliva | `#8A9A5B` | Primario / header |
| Amarillo sol | `#F4C430` | Acciones positivas |
| Rosa pastel | `#F8D7DA` | Alertas suaves |

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

---

## 📜 Licencia

Apache License 2.0 – Libre, gratuito, sin fines de lucro.

Desarrollado con ❤️ para adultos con enfermedades crónicas y sus familias.

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Por favor:
1. Abre un issue describiendo el cambio
2. Haz fork y crea una rama `feature/tu-mejora`
3. Envía un Pull Request

---

*"Esto es mío, me cuida, y avanzo."*
