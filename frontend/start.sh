#!/bin/sh
set -e
echo "=== Building ==="
npm run build
echo "=== Starting server ==="
node server.js
