#!/bin/bash
# Azure App Service startup script for Next.js (standalone mode)

cd /home/site/wwwroot

echo "=== KSeF Web Startup ==="
echo "Node: $(node --version)"
echo "PWD:  $(pwd)"

# Verify standalone build exists
if [ ! -f "server.js" ]; then
    echo "ERROR: server.js not found — standalone build missing"
    ls -la
    exit 1
fi

if [ ! -d ".next" ]; then
    echo "ERROR: .next/ directory not found"
    ls -la
    exit 1
fi

echo "Starting Next.js standalone server..."
node server.js
