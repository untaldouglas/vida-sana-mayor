# ============================================================
# Makefile – Vida Sana Mayor
# Autor: Douglas Galindo · https://www.untaldouglas.info/
# Licencia: Apache 2.0
# ============================================================

.PHONY: help install dev build preview lint clean clean-all check \
        icons deploy-gh serve-local \
        ollama-check ollama-start ollama-pull-qwen ollama-pull-llama \
        ollama-pull-mistral ollama-pull-gemma ollama-pull-phi \
        ollama-pull-all ollama-list \
        ai-test reset-dev

# ─── AYUDA ───────────────────────────────────────────────────

## help: Muestra esta ayuda
help:
	@echo ""
	@echo "☀️  Vida Sana Mayor – Comandos disponibles"
	@echo "    Autor: Douglas Galindo · https://www.untaldouglas.info/"
	@echo ""
	@echo "  DESARROLLO"
	@grep -E '^## (install|dev|build|preview|lint|clean|check|icons):' Makefile | sed 's/## /    make /g'
	@echo ""
	@echo "  DESPLIEGUE"
	@grep -E '^## (deploy|serve):' Makefile | sed 's/## /    make /g'
	@echo ""
	@echo "  INTELIGENCIA ARTIFICIAL (Ollama – local, gratuito)"
	@grep -E '^## ollama' Makefile | sed 's/## /    make /g'
	@echo ""
	@echo "  UTILIDADES"
	@grep -E '^## (ai-test|reset-dev):' Makefile | sed 's/## /    make /g'
	@echo ""

# ─── DESARROLLO ──────────────────────────────────────────────

## install: Instalar dependencias npm
install:
	npm install

## dev: Servidor de desarrollo con hot-reload (localhost:5173)
dev:
	npm run dev

## dev-host: Servidor de desarrollo accesible en la red local
dev-host:
	npm run dev -- --host

## build: Build de producción (TypeScript + Vite + PWA)
build:
	npm run build

## preview: Preview de producción con PWA y Service Worker (localhost:4173)
preview: build
	npm run preview

## lint: Verificar tipos TypeScript
lint:
	npx tsc --noEmit

## clean: Limpiar archivos de build y caché
clean:
	rm -rf dist node_modules/.cache

## clean-all: Limpiar todo incluyendo node_modules (reinstalar con make install)
clean-all: clean
	rm -rf node_modules

## icons: Generar iconos PNG desde SVG
icons:
	@echo "Generando iconos..."
	@cd public/icons && bash generate-icons.sh

## check: Verificar que el entorno está listo para desarrollo
check:
	@echo ""
	@echo "📋 Verificando entorno – Vida Sana Mayor"
	@echo ""
	@printf "  Node.js: "; node --version
	@printf "  npm:     "; npm --version
	@echo ""
	@echo "  Dependencias:"
	@test -d node_modules && echo "    ✅ node_modules presente" || echo "    ⚠️  Ejecuta: make install"
	@echo "  Build:"
	@test -d dist && echo "    ✅ dist presente" || echo "    ⚠️  Ejecuta: make build"
	@echo "  Ollama:"
	@command -v ollama >/dev/null 2>&1 && echo "    ✅ ollama instalado ($$(ollama --version 2>/dev/null || echo 'versión desconocida'))" || echo "    ℹ️  No instalado (opcional). Ver: https://ollama.com"
	@echo ""

# ─── DESPLIEGUE ──────────────────────────────────────────────

## deploy-gh: Desplegar en GitHub Pages
deploy-gh: build
	@echo "🚀 Desplegando en GitHub Pages..."
	npx gh-pages -d dist
	@echo "✅ Desplegado"

## serve-local: Servir build con HTTPS local (requiere mkcert instalado)
serve-local: build
	@echo "🔒 Sirviendo con HTTPS local en puerto 4173..."
	npx serve dist -p 4173 \
	  --ssl-cert ~/.local/share/mkcert/localhost.pem \
	  --ssl-key ~/.local/share/mkcert/localhost-key.pem

# ─── OLLAMA (IA local, gratuita) ─────────────────────────────

## ollama-check: Verificar si Ollama está instalado y corriendo
ollama-check:
	@echo ""
	@echo "🦙 Estado de Ollama"
	@echo ""
	@command -v ollama >/dev/null 2>&1 \
	  && echo "  ✅ Ollama instalado: $$(ollama --version 2>/dev/null)" \
	  || (echo "  ❌ Ollama no instalado. Instalar en https://ollama.com" && exit 1)
	@curl -s http://localhost:11434/api/tags >/dev/null 2>&1 \
	  && echo "  ✅ Servidor corriendo en localhost:11434" \
	  || echo "  ⚠️  Servidor no responde. Ejecuta: ollama serve"
	@echo ""
	@echo "  Modelos descargados:"
	@ollama list 2>/dev/null || echo "    (ninguno aún)"
	@echo ""

## ollama-start: Iniciar el servidor Ollama en segundo plano
ollama-start:
	@echo "🦙 Iniciando Ollama..."
	ollama serve &
	@sleep 2
	@echo "✅ Ollama corriendo en http://localhost:11434"

## ollama-pull-qwen: Descargar Qwen 2.5 7B (recomendado – excelente en español)
ollama-pull-qwen:
	@echo "🦙 Descargando Qwen 2.5 7B (recomendado para español)..."
	ollama pull qwen2.5:7b
	@echo "✅ Modelo listo: qwen2.5:7b"

## ollama-pull-llama: Descargar Llama 3.1 8B (equilibrado)
ollama-pull-llama:
	@echo "🦙 Descargando Llama 3.1 8B..."
	ollama pull llama3.1:8b
	@echo "✅ Modelo listo: llama3.1:8b"

## ollama-pull-llama-fast: Descargar Llama 3.2 3B (rápido y ligero)
ollama-pull-llama-fast:
	@echo "🦙 Descargando Llama 3.2 3B (versión rápida)..."
	ollama pull llama3.2:3b
	@echo "✅ Modelo listo: llama3.2:3b"

## ollama-pull-mistral: Descargar Mistral 7B (versátil)
ollama-pull-mistral:
	@echo "🦙 Descargando Mistral 7B..."
	ollama pull mistral:7b
	@echo "✅ Modelo listo: mistral:7b"

## ollama-pull-gemma: Descargar Gemma 2 9B (buena comprensión)
ollama-pull-gemma:
	@echo "🦙 Descargando Gemma 2 9B..."
	ollama pull gemma2:9b
	@echo "✅ Modelo listo: gemma2:9b"

## ollama-pull-phi: Descargar Phi-3.5 Mini (ultra ligero, dispositivos lentos)
ollama-pull-phi:
	@echo "🦙 Descargando Phi-3.5 Mini (ultra ligero)..."
	ollama pull phi3.5:mini
	@echo "✅ Modelo listo: phi3.5:mini"

## ollama-pull-all: Descargar todos los modelos recomendados
ollama-pull-all: ollama-pull-qwen ollama-pull-llama ollama-pull-llama-fast ollama-pull-mistral
	@echo ""
	@echo "✅ Todos los modelos recomendados descargados"
	@echo "   Modelo sugerido para español: qwen2.5:7b"
	@echo ""

## ollama-list: Listar modelos Ollama disponibles localmente
ollama-list:
	@echo "🦙 Modelos Ollama disponibles:"
	@ollama list

# ─── UTILIDADES ──────────────────────────────────────────────

## ai-test: Probar conexión con Ollama (envía un mensaje de prueba)
ai-test:
	@echo "🤖 Probando Ollama en localhost:11434..."
	@MODEL=$$(ollama list 2>/dev/null | awk 'NR==2{print $$1}'); \
	  if [ -z "$$MODEL" ]; then \
	    echo "  ⚠️  No hay modelos descargados. Ejecuta: make ollama-pull-qwen"; \
	  else \
	    echo "  Usando modelo: $$MODEL"; \
	    curl -s http://localhost:11434/v1/chat/completions \
	      -H "Content-Type: application/json" \
	      -d "{\"model\":\"$$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Responde solo: OK\"}]}" \
	    | python3 -c "import sys,json; d=json.load(sys.stdin); print('  ✅ Respuesta: ' + d['choices'][0]['message']['content'])" \
	    2>/dev/null || echo "  ❌ Error al conectar. ¿Está Ollama corriendo? (make ollama-start)"; \
	  fi
	@echo ""

## reset-dev: Instrucciones para reiniciar la app desde cero en el navegador
reset-dev:
	@echo ""
	@echo "🔄 Reinicio de app en desarrollo (borra IndexedDB)"
	@echo ""
	@echo "  Opción A – Chrome DevTools:"
	@echo "    1. Abre http://localhost:5173/vida-sana-mayor/"
	@echo "    2. F12 → Application → Storage → Clear site data"
	@echo ""
	@echo "  Opción B – Solo IndexedDB:"
	@echo "    F12 → Application → IndexedDB → vida-sana-mayor → clic derecho → Delete database"
	@echo ""
	@echo "  Opción C – Hard refresh (borra Service Worker y caché):"
	@echo "    Cmd+Shift+R (macOS) / Ctrl+Shift+R (Linux/Windows)"
	@echo ""
	@echo "  Después recarga la página para ver el flujo completo desde el Acuerdo de Uso."
	@echo ""

.DEFAULT_GOAL := help
