/**
 * Seed Suppliers from Existing Invoices
 *
 * Scans all settings (environments), fetches invoices for each,
 * extracts unique supplier NIPs, and creates Supplier records
 * for any that don't already exist.
 *
 * Usage:
 *   pnpm tsx scripts/seed-suppliers-from-invoices.ts              # All settings
 *   pnpm tsx scripts/seed-suppliers-from-invoices.ts --dry-run    # Preview only
 *   pnpm tsx scripts/seed-suppliers-from-invoices.ts --setting=ID # Single setting
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
  let cleanup = false

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--cleanup') cleanup = true
    else if (arg.startsWith('--setting=')) settingId = arg.split('=')[1]
  }

  return { dryRun, settingId, cleanup }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const { dryRun, settingId, cleanup } = parseArgs()

  // Dynamic imports — must be after env vars are loaded
  const { settingService } = await import('../src/lib/dataverse/services/setting-service')
  const { supplierService } = await import('../src/lib/dataverse/services/supplier-service')
  const { dataverseClient } = await import('../src/lib/dataverse/client')
  const { DV } = await import('../src/lib/dataverse/config')

  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║  Seed Suppliers from Existing Invoices               ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  if (dryRun) console.log('  ⚠  DRY-RUN mode — no records will be created/deleted\n')
  if (cleanup) console.log('  ⚠  CLEANUP mode — existing suppliers will be deleted first\n')

  // 1. Get settings
  let settings = await settingService.getAll(false) // include inactive too
  if (settingId) {
    settings = settings.filter(s => s.id === settingId)
    if (settings.length === 0) {
      console.error(`Setting ${settingId} not found`)
      process.exit(1)
    }
  }

  console.log(`Found ${settings.length} setting(s):\n`)

  let totalCreated = 0
  let totalSkipped = 0
  let totalErrors = 0
  let totalDeleted = 0

  for (const setting of settings) {
    console.log(`─── ${setting.companyName} (${setting.nip}) — ${setting.environment} ───`)
    console.log(`    Setting ID: ${setting.id}`)

    // Cleanup: delete existing suppliers for this setting
    if (cleanup) {
      const existing = await supplierService.getAll({ settingId: setting.id })
      const count = existing.length
      if (count > 0) {
        if (dryRun) {
          console.log(`    [DRY-RUN] Would delete ${count} existing supplier(s)`)
        } else {
          for (const s of existing) {
            try {
              await dataverseClient.delete(DV.supplier.entitySet, s.id)
            } catch { /* ignore delete errors */ }
          }
          console.log(`    Deleted ${count} existing supplier(s)`)
        }
        totalDeleted += count
      }
    }

    // 2. Fetch invoices filtered by settingId (not tenantNip!)
    const invoiceEntity = DV.invoice.entitySet
    const filter = `_dvlp_settingid_value eq ${setting.id} and statecode eq 0`
    const select = [
      DV.invoice.sellerNip,
      DV.invoice.sellerName,
      DV.invoice.sellerAddress,
      DV.invoice.sellerCountry,
      DV.invoice.invoiceDate,
    ].join(',')
    const query = `$filter=${filter}&$select=${select}&$orderby=${DV.invoice.invoiceDate} desc`

    type RawInvoice = Record<string, string | number | null>
    const invoices = await dataverseClient.listAll<RawInvoice>(invoiceEntity, query)

    if (invoices.length === 0) {
      console.log('    No invoices found — skipping\n')
      continue
    }
    console.log(`    Invoices: ${invoices.length}`)

    // 3. Group by supplier NIP — keep the first (most recent due to orderby desc)
    const nipMap = new Map<string, RawInvoice>()
    for (const inv of invoices) {
      const nip = inv[DV.invoice.sellerNip] as string | null
      if (!nip) continue
      if (!nipMap.has(nip)) {
        nipMap.set(nip, inv)
      }
    }

    console.log(`    Unique supplier NIPs: ${nipMap.size}`)

    let created = 0
    let skipped = 0
    let errors = 0

    for (const [nip, inv] of nipMap) {
      try {
        // Check if supplier already exists
        const existingSupplier = await supplierService.getByNip(nip, setting.id)
        if (existingSupplier) {
          skipped++
          continue
        }

        const name = (inv[DV.invoice.sellerName] as string) || nip
        const address = inv[DV.invoice.sellerAddress] as string | undefined
        const country = (inv[DV.invoice.sellerCountry] as string) || 'PL'

        if (dryRun) {
          console.log(`    [DRY-RUN] Would create: ${name} (NIP: ${nip})`)
          created++
          continue
        }

        // Create supplier from invoice data
        await supplierService.create({
          nip,
          name,
          settingId: setting.id,
          street: address || undefined,
          country,
          status: 'Active',
          source: 'KSeF',
          hasSelfBillingAgreement: false,
        })
        created++
        console.log(`    ✓ Created: ${name} (NIP: ${nip})`)
      } catch (err) {
        // "Failed to fetch created supplier" means the POST succeeded but the
        // subsequent GET failed — the record was still created in Dataverse
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Failed to fetch created supplier')) {
          created++
          const name = (inv[DV.invoice.sellerName] as string) || nip
          console.log(`    ✓ Created (fetch warning): ${name} (NIP: ${nip})`)
        } else {
          errors++
          console.error(`    ✗ Failed NIP ${nip}: ${msg}`)
        }
      }
    }

    console.log(`    Result: created=${created}, skipped=${skipped}, errors=${errors}\n`)
    totalCreated += created
    totalSkipped += skipped
    totalErrors += errors
  }

  console.log('══════════════════════════════════════════════════════')
  if (cleanup) console.log(`DELETED: ${totalDeleted}`)
  console.log(`TOTAL: created=${totalCreated}, skipped=${totalSkipped}, errors=${totalErrors}`)
  console.log('══════════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
