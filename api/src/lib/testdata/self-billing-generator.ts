/**
 * Self-billing test data generator
 * Creates suppliers, agreements, templates, and self-billing invoices
 * for testing the self-billing module end-to-end.
 */

import type { SupplierCreate } from '../../types/supplier'
import type { SbAgreementCreate, SbTemplateCreate, SelfBillingInvoiceCreate } from '../../types/self-billing'
import { formatDate } from './templates'

// ── Sample Supplier Data ────────────────────────────────────────

const SELF_BILLING_SUPPLIERS: Array<
  Omit<SupplierCreate, 'settingId'> & { _templates: Array<Omit<SbTemplateCreate, 'supplierId' | 'settingId'>> }
> = [
  {
    nip: '5260250995', // PKO BP – valid checksum
    name: 'Usługi IT Solutions Sp. z o.o.',
    shortName: 'IT Solutions',
    street: 'ul. Marszałkowska 100',
    city: 'Warszawa',
    postalCode: '00-001',
    country: 'PL',
    email: 'fakturowanie@itsolutions.pl',
    bankAccount: 'PL61109010140000071219812874',
    vatStatus: 'Czynny',
    hasSelfBillingAgreement: true,
    status: 'Active',
    source: 'Manual',
    _templates: [
      {
        name: 'Konsultacje IT – miesięczne',
        itemDescription: 'Usługi konsultingowe IT – ryczałt miesięczny',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 15000,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 0,
      },
      {
        name: 'Wsparcie helpdesk',
        itemDescription: 'Wsparcie techniczne helpdesk – pakiet miesięczny',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 5000,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
  {
    nip: '7740001454', // valid checksum
    name: 'Transport Krajowy Sp. z o.o.',
    shortName: 'Transport Krajowy',
    street: 'ul. Przemysłowa 42',
    city: 'Łódź',
    postalCode: '90-001',
    country: 'PL',
    email: 'rozliczenia@transportkrajowy.pl',
    bankAccount: 'PL27114020040000300201355387',
    vatStatus: 'Czynny',
    hasSelfBillingAgreement: true,
    status: 'Active',
    source: 'Manual',
    _templates: [
      {
        name: 'Transport krajowy – stawka za km',
        itemDescription: 'Usługa transportowa – dostawa krajowa',
        quantity: 500,
        unit: 'km',
        unitPrice: 3.5,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 0,
      },
    ],
  },
  {
    nip: '1132191233', // valid checksum
    name: 'Sprzątanie Premium Sp. z o.o.',
    shortName: 'Sprzątanie Premium',
    street: 'ul. Długa 15',
    city: 'Kraków',
    postalCode: '30-001',
    country: 'PL',
    email: 'biuro@sprzataniepremium.pl',
    vatStatus: 'Czynny',
    hasSelfBillingAgreement: false,
    status: 'Active',
    source: 'VatApi',
    _templates: [],
  },
  {
    nip: '5252344078', // valid checksum
    name: 'Archiwum Cyfrowe S.A.',
    shortName: 'Archiwum Cyfrowe',
    street: 'ul. Nowa 88',
    city: 'Wrocław',
    postalCode: '50-001',
    country: 'PL',
    vatStatus: 'Czynny',
    hasSelfBillingAgreement: true,
    status: 'Inactive',
    source: 'Manual',
    _templates: [
      {
        name: 'Digitalizacja dokumentów',
        itemDescription: 'Usługa digitalizacji dokumentów – pakiet 1000 stron',
        quantity: 1,
        unit: 'pakiet',
        unitPrice: 2500,
        vatRate: 23,
        currency: 'PLN',
        isActive: false,
        sortOrder: 0,
      },
    ],
  },
  {
    nip: '6462933353', // valid checksum
    name: 'Ochrona Mienia Sp. z o.o.',
    shortName: 'Ochrona Mienia',
    street: 'ul. Bezpieczna 7',
    city: 'Katowice',
    postalCode: '40-001',
    country: 'PL',
    email: 'ochrona@mienie.pl',
    bankAccount: 'PL83109028350000000146017374',
    vatStatus: 'Czynny',
    hasSelfBillingAgreement: true,
    status: 'Active',
    source: 'Manual',
    _templates: [
      {
        name: 'Ochrona fizyczna – dyżur miesięczny',
        itemDescription: 'Usługa ochrony fizycznej obiektu – ryczałt miesięczny',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 8000,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 0,
      },
      {
        name: 'Monitoring CCTV',
        itemDescription: 'Monitoring wizyjny CCTV – abonament miesięczny',
        quantity: 1,
        unit: 'szt.',
        unitPrice: 1200,
        vatRate: 23,
        currency: 'PLN',
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
]

// ── Generator ───────────────────────────────────────────────────

export interface SelfBillingTestDataOptions {
  settingId: string
}

export interface SelfBillingTestData {
  suppliers: Array<SupplierCreate>
  agreements: Array<Omit<SbAgreementCreate, 'supplierId'> & { _supplierNip: string }>
  templates: Array<Omit<SbTemplateCreate, 'supplierId'> & { _supplierNip: string }>
  invoices: Array<Omit<SelfBillingInvoiceCreate, 'agreementId' | 'supplierId'> & { _supplierNip: string }>
}

/**
 * Generate a full set of self-billing test data.
 * Returns structured data that the testdata endpoint can use
 * to create records in Dataverse.
 */
export function generateSelfBillingTestData(
  options: SelfBillingTestDataOptions
): SelfBillingTestData {
  const { settingId } = options
  const now = new Date()
  const sixMonthsAgo = new Date(now)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const suppliers: SupplierCreate[] = SELF_BILLING_SUPPLIERS.map((s) => {
    const { _templates: _t, ...supplierData } = s
    return { ...supplierData, settingId }
  })

  const agreements: SelfBillingTestData['agreements'] = []
  const templates: SelfBillingTestData['templates'] = []
  const invoices: SelfBillingTestData['invoices'] = []

  for (const supplierDef of SELF_BILLING_SUPPLIERS) {
    if (!supplierDef.hasSelfBillingAgreement) continue

    // Active agreement
    agreements.push({
      _supplierNip: supplierDef.nip,
      name: `Umowa samofakturowania – ${supplierDef.shortName || supplierDef.name}`,
      agreementDate: formatDate(sixMonthsAgo),
      validFrom: formatDate(sixMonthsAgo),
      validTo: formatDate(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())),
      approvalProcedure: 'Akceptacja mailowa w ciągu 5 dni roboczych',
      notes: `Umowa testowa dla ${supplierDef.name}`,
      settingId,
    })

    // For Archiwum Cyfrowe (Inactive), also add an expired agreement
    if (supplierDef.status === 'Inactive') {
      const expiredDate = new Date(now)
      expiredDate.setMonth(expiredDate.getMonth() - 1)
      agreements.push({
        _supplierNip: supplierDef.nip,
        name: `Umowa wygasła – ${supplierDef.shortName || supplierDef.name}`,
        agreementDate: formatDate(new Date(now.getFullYear() - 2, 0, 1)),
        validFrom: formatDate(new Date(now.getFullYear() - 2, 0, 1)),
        validTo: formatDate(expiredDate),
        settingId,
      })
    }

    // Templates
    for (const tmpl of supplierDef._templates) {
      templates.push({
        _supplierNip: supplierDef.nip,
        ...tmpl,
        settingId,
      })
    }

    // Sample invoices in various states
    if (supplierDef._templates.length > 0 && supplierDef.status === 'Active') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
      const items = supplierDef._templates
        .filter((t) => t.isActive)
        .map((t) => ({
          itemDescription: t.itemDescription,
          quantity: t.quantity,
          unit: t.unit,
          unitPrice: t.unitPrice,
          vatRate: t.vatRate,
        }))

      if (items.length > 0) {
        // Draft invoice
        invoices.push({
          _supplierNip: supplierDef.nip,
          invoiceDate: formatDate(lastMonth),
          items,
          settingId,
        })

        // PendingSeller invoice (previous month)
        const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 15)
        invoices.push({
          _supplierNip: supplierDef.nip,
          invoiceDate: formatDate(twoMonthsAgo),
          items,
          settingId,
        })

        // SentToKsef invoice (3 months ago)
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 15)
        invoices.push({
          _supplierNip: supplierDef.nip,
          invoiceDate: formatDate(threeMonthsAgo),
          items,
          settingId,
        })
      }
    }
  }

  return { suppliers, agreements, templates, invoices }
}
