#!/bin/bash
# Azure App Service startup script for Next.js

cd /home/site/wwwroot

# Azure compresses node_modules to tar.gz during ZIP deployment.
# Extract if not already done (check for a key package).
if [ -f node_modules.tar.gz ] && [ ! -d node_modules/next ]; then
    echo "Extracting node_modules.tar.gz..."
    mkdir -p node_modules
    tar xzf node_modules.tar.gz -C . 2>/dev/null
    echo "Done. node_modules size: $(du -sh node_modules 2>/dev/null | cut -f1)"
fi

echo "Starting Next.js server..."
echo "Node: $(node --version)"
echo "Dirs: $(ls -d .next src/app node_modules/next 2>/dev/null)"

node server.js
