import { XMLParser } from 'fast-xml-parser'
import { ParsedInvoice, ParsedInvoiceItem } from './types'

/**
 * Parse FA(2) invoice XML from KSeF
 */
export function parseInvoiceXml(xml: string): ParsedInvoice {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    parseTagValue: true,
    trimValues: true,
  })

  const doc = parser.parse(xml)

  // FA(2) structure - the root element is Faktura
  const faktura = doc.Faktura || doc['tns:Faktura'] || doc

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

  // Parse amounts
  const netAmount = parseFloat(fa.P_13_1 || fa.RodzajFaktury?.P_13_1 || '0')
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
    invoiceNumber: fa.P_2 || naglowek.NumerFaktury || '',
    invoiceDate: fa.P_1 || naglowek.DataWystawienia || '',
    dueDate,
    supplier: {
      nip: supplierData.NIP || '',
      name: supplierData.Nazwa || supplierData.PelnaNazwa || '',
      address: formatAddress(supplierAddress),
    },
    buyer: {
      nip: buyerData.NIP || '',
      name: buyerData.Nazwa || buyerData.PelnaNazwa || '',
      address: formatAddress(buyerAddress),
    },
    netAmount,
    vatAmount,
    grossAmount,
    items,
    rawXml: xml,
  }
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
