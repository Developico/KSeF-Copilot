import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { ParsedInvoice, ParsedInvoiceItem, ParsedInvoiceType, KsefInvoice, KsefInvoiceItem } from './types'

/**
 * Strip XML namespace prefixes (e.g. tns:Faktura → Faktura) and xmlns declarations
 * so that the parser can handle FA(2) and FA(3) schemas uniformly.
 */
function stripNamespaces(xml: string): string {
  // Remove namespace declarations: xmlns:tns="..." and xmlns="..."
  let cleaned = xml.replace(/\s+xmlns(?::\w+)?="[^"]*"/g, '')
  // Remove namespace prefixes from tags: <tns:Faktura> → <Faktura>, </tns:Fa> → </Fa>
  cleaned = cleaned.replace(/<\/?[\w-]+:/g, (match) => match.charAt(0) === '<' && match.charAt(1) === '/' ? '</' : '<')
  return cleaned
}

/**
 * Parse FA(2)/FA(3) invoice XML from KSeF
 */
export function parseInvoiceXml(xml: string): ParsedInvoice {
  // Strip namespace prefixes to handle both FA(2) and FA(3) schemas
  const cleanXml = stripNamespaces(xml)

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
  })

  const doc = parser.parse(cleanXml)

  // FA(2)/FA(3) structure - the root element is Faktura
  const faktura = doc.Faktura || doc

  // Extract header info
  const naglowek = faktura.Naglowek || {}
  const podmiot1 = faktura.Podmiot1 || {} // Seller
  const podmiot2 = faktura.Podmiot2 || {} // Buyer
  const fa = faktura.Fa || {}

  // Parse supplier (Podmiot1 - seller)
  const supplierData = podmiot1.DaneIdentyfikacyjne || {}
  const supplierAddress = podmiot1.Adres || {}

  // Parse buyer (Podmiot2 - buyer, that's us)
  const buyerData = podmiot2.DaneIdentyfikacyjne || {}
  const buyerAddress = podmiot2.Adres || {}

  // Parse invoice type (RodzajFaktury)
  const rodzajFaktury = String(fa.RodzajFaktury || 'VAT').toUpperCase()
  const invoiceType: ParsedInvoiceType = (
    ['VAT', 'KOR', 'ZAL', 'ROZ', 'UPR', 'KOR_ZAL'].includes(rodzajFaktury)
      ? rodzajFaktury
      : 'VAT'
  ) as ParsedInvoiceType

  // Parse correction-specific fields
  let correctedInvoiceNumber: string | undefined
  let correctionReason: string | undefined
  let correctedInvoiceKsefRef: string | undefined
  let correctionPeriodFrom: string | undefined
  let correctionPeriodTo: string | undefined

  if (invoiceType === 'KOR' || invoiceType === 'KOR_ZAL') {
    // FA(2): NrFaKorygowanej, FA(3): may use different path
    correctedInvoiceNumber = fa.NrFaKorygowanej
      ? String(fa.NrFaKorygowanej)
      : fa.FaKorygujaca?.NrFaKorygowanej
        ? String(fa.FaKorygujaca.NrFaKorygowanej)
        : undefined

    correctionReason = fa.PrzyczynaKorekty
      ? String(fa.PrzyczynaKorekty)
      : fa.FaKorygujaca?.PrzyczynaKorekty
        ? String(fa.FaKorygujaca.PrzyczynaKorekty)
        : undefined

    // KSeF reference of corrected invoice
    correctedInvoiceKsefRef = fa.NrKSeFFaKorygowanej
      ? String(fa.NrKSeFFaKorygowanej)
      : fa.FaKorygujaca?.NrKSeFFaKorygowanej
        ? String(fa.FaKorygujaca.NrKSeFFaKorygowanej)
        : undefined

    // Correction period
    const okres = fa.OkresFaKorygowanej || fa.FaKorygujaca?.OkresFaKorygowanej
    if (okres) {
      correctionPeriodFrom = okres.DataOd ? String(okres.DataOd) : undefined
      correctionPeriodTo = okres.DataDo ? String(okres.DataDo) : undefined
    }
  }

  // Parse amounts
  const netAmount = parseFloat(fa.P_13_1 || '0')
  const grossAmount = parseFloat(fa.P_15 || '0')
  const vatAmount = grossAmount - netAmount

  // Parse due date from payment terms
  const terminPlatnosci = fa.TerminPlatnosci || fa.Platnosc?.TerminPlatnosci
  const dueDate = terminPlatnosci?.Termin || undefined

  // Parse line items
  const items: ParsedInvoiceItem[] = []
  const faWiersze = fa.FaWiersz || []
  const wierszArray = Array.isArray(faWiersze) ? faWiersze : [faWiersze]

  for (const wiersz of wierszArray) {
    if (!wiersz || typeof wiersz !== 'object') continue

    items.push({
      description: wiersz.P_7 || wiersz.NazwaUslugi || '',
      quantity: parseFloat(wiersz.P_8A || '1'),
      unit: wiersz.P_8B || 'szt.',
      unitPrice: parseFloat(wiersz.P_9A || wiersz.P_9B || '0'),
      netAmount: parseFloat(wiersz.P_11 || '0'),
      vatRate: wiersz.P_12 || '23',
      vatAmount: parseFloat(wiersz.P_11_Vat || '0'),
      grossAmount: parseFloat(wiersz.P_11 || '0') + parseFloat(wiersz.P_11_Vat || '0'),
    })
  }

  return {
    invoiceNumber: String(fa.P_2 || naglowek.NumerFaktury || ''),
    invoiceDate: String(fa.P_1 || naglowek.DataWystawienia || ''),
    dueDate,
    supplier: {
      nip: formatNip(supplierData.NIP),
      name: String(supplierData.Nazwa || supplierData.PelnaNazwa || ''),
      address: formatAddress(supplierAddress),
    },
    buyer: {
      nip: formatNip(buyerData.NIP),
      name: String(buyerData.Nazwa || buyerData.PelnaNazwa || ''),
      address: formatAddress(buyerAddress),
    },
    netAmount,
    vatAmount,
    grossAmount,
    items,
    rawXml: xml,
    // Invoice type and correction fields
    invoiceType,
    correctedInvoiceNumber,
    correctionReason,
    correctedInvoiceKsefRef,
    correctionPeriodFrom,
    correctionPeriodTo,
  }
}

/**
 * Format NIP to always be a 10-digit string with leading zeros
 */
function formatNip(nip: unknown): string {
  if (nip === undefined || nip === null || nip === '') return ''
  const nipStr = String(nip).replace(/\D/g, '')
  return nipStr.padStart(10, '0')
}

/**
 * Format address object to string
 */
function formatAddress(address: Record<string, unknown>): string {
  if (!address || typeof address !== 'object') return ''

  const parts = [
    address.Ulica,
    address.NrDomu,
    address.NrLokalu ? `/${address.NrLokalu}` : '',
    ', ',
    address.KodPocztowy,
    ' ',
    address.Miejscowosc,
  ].filter(Boolean)

  return parts.join('').trim().replace(/^,\s*/, '')
}

/**
 * Validate parsed invoice has required fields
 */
export function validateParsedInvoice(invoice: ParsedInvoice): string[] {
  const errors: string[] = []

  if (!invoice.invoiceNumber) {
    errors.push('Missing invoice number')
  }

  if (!invoice.invoiceDate) {
    errors.push('Missing invoice date')
  }

  if (!invoice.supplier.nip) {
    errors.push('Missing supplier NIP')
  }

  if (!invoice.supplier.name) {
    errors.push('Missing supplier name')
  }

  if (invoice.grossAmount <= 0) {
    errors.push('Invalid gross amount')
  }

  return errors
}

/**
 * Build FA(2) XML from invoice data for sending to KSeF
 */
export function buildInvoiceXml(invoice: KsefInvoice): string {
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate totals by VAT rate
  const vatRates = groupByVatRate(invoice.items)
  
  const fa = {
    Faktura: {
      '@_xmlns': 'http://crd.gov.pl/wzor/2023/06/29/12648/',
      Naglowek: {
        KodFormularza: {
          '@_kodSystemowy': 'FA (2)',
          '@_wersjaSchemy': '1-0E',
          '#text': 'FA',
        },
        WariantFormularza: 2,
        DataWytworzeniaFa: today,
        SystemInfo: 'KSeF Integration by Developico',
      },
      Podmiot1: {
        DaneIdentyfikacyjne: {
          NIP: invoice.seller.nip,
          Nazwa: invoice.seller.name,
        },
        Adres: {
          KodKraju: invoice.seller.address.country || 'PL',
          AdresL1: formatAddressLine(invoice.seller.address),
          AdresL2: `${invoice.seller.address.postalCode} ${invoice.seller.address.city}`,
        },
      },
      Podmiot2: {
        DaneIdentyfikacyjne: {
          NIP: invoice.buyer.nip,
          Nazwa: invoice.buyer.name,
        },
        Adres: {
          KodKraju: invoice.buyer.address.country || 'PL',
          AdresL1: formatAddressLine(invoice.buyer.address),
          AdresL2: `${invoice.buyer.address.postalCode} ${invoice.buyer.address.city}`,
        },
      },
      Fa: {
        KodWaluty: invoice.currency || 'PLN',
        P_1: invoice.invoiceDate,
        P_2: invoice.invoiceNumber,
        P_6: today, // Date of sale
        ...buildVatSummary(vatRates),
        P_15: calculateGrossTotal(invoice.items),
        Adnotacje: {
          P_16: 2, // Not split payment
          P_17: 2, // Not self-billing
          P_18: 2, // Not reverse charge
          P_18A: 2, // Not margin scheme
          P_19: 2, // No links to other invoices
          P_22: 2, // Not cash register
          P_23: 2, // Not simplified invoice
          P_PMarzy: 2, // Not margin procedure
        },
        FaWiersz: invoice.items.map((item, index) => buildLineItem(item, index + 1)),
      },
      Stopka: {
        Informacje: {
          StopkaFaktury: invoice.notes || '',
        },
      },
    },
  }
  
  // Add payment info if provided
  if (invoice.dueDate || invoice.bankAccount) {
    (fa.Faktura.Fa as Record<string, unknown>).Platnosc = {
      TerminPlatnosci: invoice.dueDate ? { Termin: invoice.dueDate } : undefined,
      FormaPlatnosci: invoice.paymentMethod || 'przelew',
      RachunekBankowy: invoice.bankAccount ? { NrRB: invoice.bankAccount } : undefined,
    }
  }
  
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    format: true,
    suppressEmptyNode: true,
  })
  
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + builder.build(fa)
}

/**
 * Parse invoice from XML (alias for backwards compatibility)
 */
export function parseInvoiceFromXml(xml: string): KsefInvoice {
  const parsed = parseInvoiceXml(xml)
  
  // Convert ParsedInvoice to KsefInvoice format
  return {
    invoiceNumber: parsed.invoiceNumber,
    invoiceDate: parsed.invoiceDate,
    dueDate: parsed.dueDate,
    seller: {
      nip: parsed.supplier.nip,
      name: parsed.supplier.name,
      address: parseAddressFromString(parsed.supplier.address || ''),
    },
    buyer: {
      nip: parsed.buyer.nip,
      name: parsed.buyer.name,
      address: parseAddressFromString(parsed.buyer.address || ''),
    },
    items: parsed.items.map((item, index) => ({
      lineNumber: index + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || 'szt.',
      unitPrice: item.unitPrice,
      netAmount: item.netAmount,
      vatRate: parseVatRate(item.vatRate),
      vatAmount: item.vatAmount,
      grossAmount: item.grossAmount,
    })),
    currency: 'PLN',
  }
}

/**
 * Group items by VAT rate for summary
 */
function groupByVatRate(items: KsefInvoiceItem[]): Map<number, { net: number; vat: number }> {
  const rates = new Map<number, { net: number; vat: number }>()
  
  for (const item of items) {
    const current = rates.get(item.vatRate) || { net: 0, vat: 0 }
    rates.set(item.vatRate, {
      net: current.net + item.netAmount,
      vat: current.vat + item.vatAmount,
    })
  }
  
  return rates
}

/**
 * Build VAT summary fields (P_13_1 to P_13_11)
 */
function buildVatSummary(vatRates: Map<number, { net: number; vat: number }>): Record<string, number> {
  const summary: Record<string, number> = {}
  
  // P_13_1 - Net amount for 23%
  // P_14_1 - VAT amount for 23%
  // P_13_2 - Net amount for 8%
  // etc.
  
  const rateMap: Record<number, number> = {
    23: 1,
    22: 1,
    8: 2,
    7: 2,
    5: 3,
    0: 4, // 0% (export)
  }
  
  for (const [rate, amounts] of vatRates) {
    const index = rateMap[rate] || 1
    summary[`P_13_${index}`] = (summary[`P_13_${index}`] || 0) + amounts.net
    summary[`P_14_${index}`] = (summary[`P_14_${index}`] || 0) + amounts.vat
  }
  
  return summary
}

/**
 * Build line item for FA(2) XML
 */
function buildLineItem(item: KsefInvoiceItem, lineNumber: number): Record<string, unknown> {
  const line: Record<string, unknown> = {
    NrWierszaFa: lineNumber,
    P_7: item.description,
    P_8A: item.quantity,
    P_8B: item.unit,
    P_9A: item.unitPrice,
    P_11: item.netAmount,
    P_12: formatVatRate(item.vatRate),
  }
  
  if (item.pkwiu) {
    line.PKWiU = item.pkwiu
  }
  
  if (item.gtu) {
    line.GTU = item.gtu
  }
  
  return line
}

/**
 * Calculate gross total from items
 */
function calculateGrossTotal(items: KsefInvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.grossAmount, 0)
}

/**
 * Format address line from address object
 */
function formatAddressLine(address: { street: string; buildingNumber: string; apartmentNumber?: string }): string {
  let line = `${address.street} ${address.buildingNumber}`
  if (address.apartmentNumber) {
    line += `/${address.apartmentNumber}`
  }
  return line
}

/**
 * Parse address from string (best effort)
 */
function parseAddressFromString(address: string): { street: string; buildingNumber: string; apartmentNumber?: string; postalCode: string; city: string; country: string } {
  // Very basic parsing - in production this would need to be more robust
  const parts = address.split(',').map(p => p.trim())
  
  return {
    street: parts[0] || '',
    buildingNumber: '',
    postalCode: parts[1]?.split(' ')[0] || '',
    city: parts[1]?.split(' ').slice(1).join(' ') || '',
    country: 'PL',
  }
}

/**
 * Parse VAT rate from string to number
 */
function parseVatRate(rate: string): number {
  if (rate === 'zw' || rate === 'ZW') return -1
  if (rate === 'np' || rate === 'NP') return 0
  return parseInt(rate, 10) || 23
}

/**
 * Format VAT rate for XML
 */
function formatVatRate(rate: number): string {
  if (rate === -1) return 'zw'
  if (rate === 0) return 'np'
  return rate.toString()
}
