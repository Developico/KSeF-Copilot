/**
 * Link Invoices to Suppliers
 *
 * For each setting, matches invoices to supplier records by sellerNip
 * and sets the _dvlp_supplierid_value lookup on the invoice.
 * Then refreshes cached stats on each supplier.
 *
 * Usage:
 *   npx tsx scripts/link-invoices-to-suppliers.ts              # All settings
 *   npx tsx scripts/link-invoices-to-suppliers.ts --dry-run    # Preview only
 *   npx tsx scripts/link-invoices-to-suppliers.ts --setting=ID # Single setting
 *
 * Run from: api/ directory
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env vars from local.settings.json (Azure Functions format)
const settingsPath = resolve(__dirname, '../local.settings.json')
const localSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
for (const [key, value] of Object.entries(localSettings.Values || {})) {
  if (!process.env[key]) process.env[key] = value as string
}

// ── CLI args ────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2)
  let dryRun = false
  let settingId: string | undefined

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true
    else if (arg.startsWith('--setting=')) settingId = arg.split('=')[1]
  }

  return { dryRun, settingId }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const { dryRun, settingId } = parseArgs()

  const { settingService } = await import('../src/lib/dataverse/services/setting-service')
  const { supplierService } = await import('../src/lib/dataverse/services/supplier-service')
  const { dataverseClient } = await import('../src/lib/dataverse/client')
  const { DV } = await import('../src/lib/dataverse/config')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  Link Invoices to Suppliers                          ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  if (dryRun) console.log('  ⚠  DRY-RUN mode — no records will be updated\n')

  // 1. Get settings
  let settings = await settingService.getAll(false)
  if (settingId) {
    settings = settings.filter(s => s.id === settingId)
    if (settings.length === 0) {
      console.error(`Setting ${settingId} not found`)
      process.exit(1)
    }
  }

  console.log(`Found ${settings.length} setting(s):\n`)

  let totalLinked = 0
  let totalAlready = 0
  let totalNoSupplier = 0
  let totalErrors = 0

  for (const setting of settings) {
    console.log(`─── ${setting.companyName} (${setting.nip}) — ${setting.environment} ───`)

    // 2. Get all suppliers for this setting → build NIP→id map
    const suppliers = await supplierService.getAll({ settingId: setting.id })
    const nipToSupplierId = new Map<string, string>()
    for (const s of suppliers) {
      if (s.nip) nipToSupplierId.set(s.nip, s.id)
    }
    console.log(`    Suppliers: ${suppliers.length}`)

    // 3. Fetch all invoices for this setting
    const inv = DV.invoice
    const filter = `_dvlp_settingid_value eq ${setting.id} and statecode eq 0`
    const select = [inv.id, inv.sellerNip, inv.supplierLookup].join(',')
    const query = `$filter=${filter}&$select=${select}`

    type RawInvoice = Record<string, string | number | null>
    const invoices = await dataverseClient.listAll<RawInvoice>(inv.entitySet, query)
    console.log(`    Invoices: ${invoices.length}`)

    let linked = 0
    let already = 0
    let noSupplier = 0
    let errors = 0

    // Track which suppliers got new links (for stats refresh)
    const suppliersToRefresh = new Set<string>()

    for (const invoice of invoices) {
      const invoiceId = invoice[inv.id] as string
      const sellerNip = invoice[inv.sellerNip] as string | null
      const currentSupplier = invoice[inv.supplierLookup] as string | null

      if (!sellerNip) continue

      const supplierId = nipToSupplierId.get(sellerNip)

      if (!supplierId) {
        noSupplier++
        continue
      }

      if (currentSupplier === supplierId) {
        already++
        continue
      }

      if (dryRun) {
        linked++
        suppliersToRefresh.add(supplierId)
        continue
      }

      try {
        await dataverseClient.update(inv.entitySet, invoiceId, {
          [inv.supplierBind]: `/${DV.supplier.entitySet}(${supplierId})`,
        })
        linked++
        suppliersToRefresh.add(supplierId)
      } catch (err) {
        errors++
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`    ✗ Invoice ${invoiceId}: ${msg}`)
      }
    }

    console.log(`    Linked: ${linked}, Already linked: ${already}, No supplier: ${noSupplier}, Errors: ${errors}`)

    // 4. Refresh cached stats on suppliers that got new links
    if (suppliersToRefresh.size > 0 && !dryRun) {
      console.log(`    Refreshing stats for ${suppliersToRefresh.size} supplier(s)...`)
      for (const sid of suppliersToRefresh) {
        try {
          await supplierService.updateCachedStats(sid)
        } catch {
          console.error(`    ✗ Failed to refresh stats for supplier ${sid}`)
        }
      }
      // Also refresh suppliers that were already linked (their stats might be stale)
      for (const s of suppliers) {
        if (!suppliersToRefresh.has(s.id)) {
          try {
            await supplierService.updateCachedStats(s.id)
          } catch { /* ignore */ }
        }
      }
      console.log(`    Stats refreshed`)
    }

    console.log()
    totalLinked += linked
    totalAlready += already
    totalNoSupplier += noSupplier
    totalErrors += errors
  }

  console.log('══════════════════════════════════════════════════════')
  console.log(`TOTAL: linked=${totalLinked}, already=${totalAlready}, noSupplier=${totalNoSupplier}, errors=${totalErrors}`)
  console.log('══════════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
