#!/usr/bin/env node
/**
 * Build and prepare .deploy/ directory for Azure App Service.
 *
 * Usage: node scripts/build-deploy.mjs
 *
 * Strategy: Next.js standalone output — self-contained server with minimal deps.
 * No Oryx build needed on Azure. Deploy as-is.
 *
 * Steps:
 * 1. `next build` (with output: 'standalone' in next.config.mjs)
 * 2. Creates .deploy/ from .next/standalone/ + .next/static/ + public/
 * 3. Installs Linux native binaries for Azure
 */

import { execSync } from 'child_process'
import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync, statSync, readdirSync, writeFileSync, readFileSync } from 'fs'
import { join, sep } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const DEPLOY_DIR = join(ROOT, '.deploy')
const STANDALONE_DIR = join(ROOT, '.next', 'standalone')

// In npm workspaces the standalone output nests the app under the workspace folder name.
// Detect automatically: if standalone/web/ exists, the app is there; otherwise it's at top level.
function findStandaloneApp(standaloneDir) {
  const nested = join(standaloneDir, 'web')
  if (existsSync(join(nested, 'server.js'))) return nested
  if (existsSync(join(standaloneDir, 'server.js'))) return standaloneDir
  return null
}

// Shared node_modules live at the standalone root when using workspaces.
function findStandaloneNodeModules(standaloneDir, appDir) {
  if (appDir !== standaloneDir) {
    const rootNM = join(standaloneDir, 'node_modules')
    if (existsSync(rootNM)) return rootNM
  }
  return null
}

console.log('=== KSeF Web — Azure Deploy Build (standalone) ===\n')

// ── Step 1: next build ──────────────────────────────────────────────
console.log('1/3  Building Next.js (standalone)...')
execSync('npx next build', {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})

if (!existsSync(STANDALONE_DIR)) {
  console.error('ERROR: .next/standalone/ not created — is output: "standalone" set in next.config.mjs?')
  process.exit(1)
}

const APP_DIR = findStandaloneApp(STANDALONE_DIR)
if (!APP_DIR) {
  console.error('ERROR: Cannot find server.js in standalone output.')
  console.error('Contents:', readdirSync(STANDALONE_DIR))
  process.exit(1)
}
console.log(`     ✓ Build OK (app at: ${APP_DIR === STANDALONE_DIR ? 'root' : 'web/'})\n`)

// ── Step 2: Prepare .deploy/ ────────────────────────────────────────
console.log('2/3  Preparing .deploy/ ...')
if (existsSync(DEPLOY_DIR)) rmSync(DEPLOY_DIR, { recursive: true })

// Copy the actual app (server.js, .next/, package.json, etc.)
cpSync(APP_DIR, DEPLOY_DIR, { recursive: true })
console.log('     ✓ standalone app → .deploy/')

// Copy static assets (.next/static → .deploy/.next/static)
const staticSrc = join(ROOT, '.next', 'static')
const staticDst = join(DEPLOY_DIR, '.next', 'static')
if (existsSync(staticSrc)) {
  cpSync(staticSrc, staticDst, { recursive: true })
  console.log('     ✓ .next/static/')
}

// Copy public/
if (existsSync(join(ROOT, 'public'))) {
  cpSync(join(ROOT, 'public'), join(DEPLOY_DIR, 'public'), { recursive: true })
  console.log('     ✓ public/')
}

// Copy startup.sh
copyFileSync(join(ROOT, 'startup.sh'), join(DEPLOY_DIR, 'startup.sh'))
console.log('     ✓ startup.sh')

// Copy .env.production
if (existsSync(join(ROOT, '.env.production'))) {
  copyFileSync(join(ROOT, '.env.production'), join(DEPLOY_DIR, '.env.production'))
  console.log('     ✓ .env.production')
}

// Create .deployment (disable Oryx build on Azure)
writeFileSync(join(DEPLOY_DIR, '.deployment'), '[config]\nSCM_DO_BUILD_DURING_DEPLOYMENT=false\n')
console.log('     ✓ .deployment (Oryx disabled)')

// Create package.json for Azure detection
writeFileSync(join(DEPLOY_DIR, 'package.json'), JSON.stringify({
  name: '@dvlp-ksef/web',
  version: '0.1.0',
  private: true,
  scripts: { start: 'node server.js' },
}, null, 2))
console.log('     ✓ package.json')

// ── Step 3: Install Linux native binaries ───────────────────────────
// IMPORTANT: npm install runs BEFORE copying shared node_modules because
// npm prunes modules not listed in package.json. The shared modules copy
// must happen AFTER to preserve all standalone dependencies (next, react, etc.).
console.log('\n3/3  Installing Linux native binaries for Azure...')
const linuxPkgs = [
  '@next/swc-linux-x64-gnu',
]
execSync(`npm install --no-save --force ${linuxPkgs.join(' ')}`, {
  cwd: DEPLOY_DIR,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})
console.log('     ✓ Linux binaries installed')

// Copy shared workspace node_modules AFTER npm install to prevent pruning.
// In npm workspaces, standalone output splits modules between the workspace root
// (shared: next, react, sharp, etc.) and the app directory (workspace-specific).
// npm install above prunes modules not in package.json, so we copy shared modules
// last to ensure they are present in the final .deploy/node_modules/.
const sharedNM = findStandaloneNodeModules(STANDALONE_DIR, APP_DIR)
if (sharedNM) {
  cpSync(sharedNM, join(DEPLOY_DIR, 'node_modules'), { recursive: true })
  console.log('     ✓ workspace node_modules (merged after npm install)')
}

// Re-copy app-specific node_modules from standalone/web/node_modules/ on top.
// With npm workspaces, some packages (e.g. 'next') end up ONLY in the nested
// web/node_modules/ and NOT in the shared root node_modules/. The npm install
// step above prunes them, and the shared NM copy doesn't restore them.
// This final merge ensures all app-specific deps (including 'next') are present.
if (APP_DIR !== STANDALONE_DIR) {
  const appNM = join(APP_DIR, 'node_modules')
  if (existsSync(appNM)) {
    cpSync(appNM, join(DEPLOY_DIR, 'node_modules'), { recursive: true })
    console.log('     ✓ app-specific node_modules (merged last — includes next)')
  }
}
console.log('')

// ── Verify deploy contents ──────────────────────────────────────────
const buildId = join(DEPLOY_DIR, '.next', 'BUILD_ID')
const serverJs = join(DEPLOY_DIR, 'server.js')
if (!existsSync(buildId)) {
  console.error('ERROR: .deploy/.next/BUILD_ID is missing — build is broken!')
  process.exit(1)
}
if (!existsSync(serverJs)) {
  console.error('ERROR: .deploy/server.js is missing!')
  process.exit(1)
}
console.log(`     ✓ Verified: BUILD_ID = ${readFileSync(buildId, 'utf8').trim()}`)
console.log(`     ✓ Verified: server.js present`)

// ── Summary ─────────────────────────────────────────────────────────
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
console.log(`Summary`)
console.log(`     .deploy/ size: ${sizeMB} MB`)
console.log(`\n✓ Ready! Deploy .deploy/ via VS Code "Deploy to Web App"`)

