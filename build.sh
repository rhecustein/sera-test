#!/bin/sh
set -e

echo "=== Build Backend ==="
npm ci
npm run build

echo "=== Build Frontend ==="
cd frontend
npm ci
npm run build
cd ..

echo "=== Build selesai. Jalankan: ==="
echo "docker-compose -f docker-compose.vps.yml up -d --build"
