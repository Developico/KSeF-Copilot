#!/bin/bash

# Azure App Service startup script for Next.js
cd /home/site/wwwroot

# Install dependencies if needed (usually done during build)
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm ci
fi

# Build if .next doesn't exist
if [ ! -d ".next" ]; then
    echo "Building application..."
    npm run build
fi

# Start the application
echo "Starting Next.js application..."
npm start
