#!/bin/bash
# Genera iconos PNG desde el SVG (requiere Inkscape o rsvg-convert o ImageMagick)
# Ejecutar desde la carpeta public/icons/

if command -v rsvg-convert &> /dev/null; then
  rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
  rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
  echo "✅ Iconos generados con rsvg-convert"
elif command -v convert &> /dev/null; then
  convert -background none icon.svg -resize 192x192 icon-192.png
  convert -background none icon.svg -resize 512x512 icon-512.png
  echo "✅ Iconos generados con ImageMagick"
elif command -v inkscape &> /dev/null; then
  inkscape -w 192 -h 192 icon.svg -o icon-192.png
  inkscape -w 512 -h 512 icon.svg -o icon-512.png
  echo "✅ Iconos generados con Inkscape"
else
  echo "⚠️  No se encontró rsvg-convert, ImageMagick ni Inkscape."
  echo "    Por favor genera los iconos manualmente o usa un servicio en línea."
  echo "    Tamaños necesarios: 192x192 y 512x512"
fi
