# ============================================================
# Makefile – Vida Sana Mayor
# ============================================================

.PHONY: install dev build preview clean lint icons help

## help: Muestra esta ayuda
help:
	@echo "☀️  Vida Sana Mayor – Comandos disponibles:"
	@echo ""
	@grep -E '^## ' Makefile | sed 's/## /  make /g'
	@echo ""

## install: Instala dependencias
install:
	npm install

## dev: Servidor de desarrollo (localhost:5173)
dev:
	npm run dev

## build: Build de producción
build:
	npm run build

## preview: Preview con PWA y Service Worker activos (localhost:4173)
preview: build
	npm run preview

## lint: Verificar código TypeScript
lint:
	npm run lint

## clean: Limpiar archivos generados
clean:
	rm -rf dist node_modules/.cache

## clean-all: Limpiar todo incluyendo node_modules
clean-all: clean
	rm -rf node_modules

## icons: Generar iconos PNG desde SVG
icons:
	@echo "Generando iconos..."
	@cd public/icons && bash generate-icons.sh

## check: Verificar que todo está listo
check:
	@echo "📋 Verificando entorno..."
	@node --version
	@npm --version
	@echo "✅ Entorno listo"
	@echo "📦 Dependencias:"
	@test -d node_modules && echo "  ✅ node_modules presente" || echo "  ⚠️  Ejecuta: make install"
	@echo "🏗  Build:"
	@test -d dist && echo "  ✅ dist presente" || echo "  ⚠️  Ejecuta: make build"

## deploy-gh: Desplegar en GitHub Pages
deploy-gh: build
	@echo "Desplegando en GitHub Pages..."
	@npx gh-pages -d dist

## serve-local: Servir build con HTTPS local (requiere mkcert)
serve-local: build
	@npx serve dist -p 4173 --ssl-cert ~/.local/share/mkcert/localhost.pem --ssl-key ~/.local/share/mkcert/localhost-key.pem

.DEFAULT_GOAL := help
