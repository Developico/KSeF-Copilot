#!/usr/bin/env node
/**
 * Build and prepare .deploy/ directory for Azure App Service.
 *
 * Usage: node scripts/build-deploy.mjs
 *
 * Strategy: Local build + deploy artifacts with WEBSITE_RUN_FROM_PACKAGE=1.
 * Azure mounts the ZIP directly as read-only filesystem — no tar extraction needed.
 *
 * Steps:
 * 1. `next build` using existing pnpm node_modules
 * 2. Creates .deploy/ with: .next/, public/, server.js, config, deps
 * 3. Runs `npm install --omit=dev` inside .deploy/ — flat node_modules
 * 4. Installs Linux native binaries for Azure
 */

import { execSync } from 'child_process'
import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync, statSync, readdirSync, writeFileSync, readFileSync } from 'fs'
import { join, sep } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const DEPLOY_DIR = join(ROOT, '.deploy')

console.log('=== KSeF Web — Azure Deploy Build ===\n')

// ── Step 1: next build ──────────────────────────────────────────────
console.log('1/4  Building Next.js...')
execSync('npx next build', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})

if (!existsSync(join(ROOT, '.next'))) {
  console.error('ERROR: .next/ not created — build failed.')
  process.exit(1)
}
console.log('     ✓ Build OK\n')

// ── Step 2: Prepare .deploy/ ────────────────────────────────────────
console.log('2/4  Preparing .deploy/ ...')
if (existsSync(DEPLOY_DIR)) rmSync(DEPLOY_DIR, { recursive: true })
mkdirSync(DEPLOY_DIR, { recursive: true })

// Copy .next/ (build output — without cache)
cpSync(join(ROOT, '.next'), join(DEPLOY_DIR, '.next'), {
  recursive: true,
  filter: (src) => !src.includes('.next' + sep + 'cache'),
})
console.log('     ✓ .next/ (without cache)')

// Copy public/
if (existsSync(join(ROOT, 'public'))) {
  cpSync(join(ROOT, 'public'), join(DEPLOY_DIR, 'public'), { recursive: true })
  console.log('     ✓ public/')
}

// Copy server.js
copyFileSync(join(ROOT, 'server.js'), join(DEPLOY_DIR, 'server.js'))
console.log('     ✓ server.js')

// Copy startup.sh
copyFileSync(join(ROOT, 'startup.sh'), join(DEPLOY_DIR, 'startup.sh'))
console.log('     ✓ startup.sh')

// Copy next.config.mjs
copyFileSync(join(ROOT, 'next.config.mjs'), join(DEPLOY_DIR, 'next.config.mjs'))
console.log('     ✓ next.config.mjs')

// Copy .env.production
if (existsSync(join(ROOT, '.env.production'))) {
  copyFileSync(join(ROOT, '.env.production'), join(DEPLOY_DIR, '.env.production'))
  console.log('     ✓ .env.production')
}

// Create src/app/ directory with placeholder (Next.js findPagesDir() requires it at runtime)
// Note: empty dirs are dropped by ZIP — must include a file
mkdirSync(join(DEPLOY_DIR, 'src', 'app'), { recursive: true })
writeFileSync(join(DEPLOY_DIR, 'src', 'app', '.gitkeep'), '')
console.log('     ✓ src/app/ (required by Next.js findPagesDir)')

// Create production package.json (only production deps)
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const deployPkg = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  scripts: { start: 'node server.js' },
  dependencies: pkg.dependencies,
}
writeFileSync(join(DEPLOY_DIR, 'package.json'), JSON.stringify(deployPkg, null, 2))
console.log('     ✓ package.json (prod only)')

// Copy .npmrc
if (existsSync(join(ROOT, '.npmrc'))) {
  copyFileSync(join(ROOT, '.npmrc'), join(DEPLOY_DIR, '.npmrc'))
  console.log('     ✓ .npmrc')
}

// Create .deployment (disable Oryx build on Azure)
writeFileSync(join(DEPLOY_DIR, '.deployment'), '[config]\nSCM_DO_BUILD_DURING_DEPLOYMENT=false\n')
console.log('     ✓ .deployment (Oryx disabled)')

// ── Step 3: npm install (production deps, flat node_modules) ────────
console.log('\n3/4  Installing production dependencies in .deploy/ ...')
execSync('npm install --omit=dev --legacy-peer-deps', {
  cwd: DEPLOY_DIR,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})

// Install Linux-specific native binaries needed on Azure (we build on Windows)
const linuxPkgs = [
  '@next/swc-linux-x64-gnu',
  '@swc/core-linux-x64-gnu',
  '@parcel/watcher-linux-x64-glibc',
  '@img/sharp-linux-x64',
]
console.log('     Installing Linux native binaries for Azure...')
execSync(`npm install --no-save --force ${linuxPkgs.join(' ')}`, {
  cwd: DEPLOY_DIR,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})
console.log('     ✓ node_modules installed (with Linux binaries)\n')

// ── Step 4: Summary ─────────────────────────────────────────────────
function dirSize(dir) {
  let total = 0
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      total += e.isDirectory() ? dirSize(p) : statSync(p).size
    }
  } catch { /* skip unreadable */ }
  return total
}

const sizeMB = (dirSize(DEPLOY_DIR) / 1024 / 1024).toFixed(1)
console.log(`4/4  Summary`)
console.log(`     .deploy/ size: ${sizeMB} MB`)
console.log(`\n✓ Ready! Deploy via VS Code "Deploy to Web App"`)
