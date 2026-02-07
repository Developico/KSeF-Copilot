#!/bin/bash
# Azure App Service startup script for Next.js
# Handles Oryx's node_modules.tar.gz compression optimization

cd /home/site/wwwroot

# Azure compresses node_modules to tar.gz during ZIP deployment.
# The default Oryx startup extracts them, but our custom startup must do it manually.
if [ -f node_modules.tar.gz ] && [ ! -d node_modules/next ]; then
    echo "Extracting node_modules.tar.gz..."
    mkdir -p node_modules
    tar xzf node_modules.tar.gz -C .
    echo "node_modules extracted ($(du -sh node_modules | cut -f1))"
fi

echo "Starting Next.js server..."
node server.js
