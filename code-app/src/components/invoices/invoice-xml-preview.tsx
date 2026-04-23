import { useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { FileCode, Printer, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Address {
  country?: string
  line1?: string
  line2?: string
}

interface Party {
  nip: string
  name: string
  address: Address
}

interface LineItem {
  nr: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: string
  netAmount: number
  vatAmount: number
  grossAmount: number
}

interface VatSummaryRow {
  rate: string
  netAmount: number
  vatAmount: number
  grossAmount: number
}

interface AdditionalDescription {
  key: string
  value: string
}

interface ParsedPreviewData {
  formCode: string
  variant: number
  creationDate: string
  systemInfo: string
  seller: Party
  buyer: Party
  issuer?: { nip: string; name: string; role?: number }
  currency: string
  invoiceNumber: string
  invoiceDate: string
  saleDate: string
  grossTotal: number
  isSplitPayment: boolean
  isSelfBilling: boolean
  isReverseCharge: boolean
  items: LineItem[]
  vatSummary: VatSummaryRow[]
  dueDate?: string
  paymentMethod?: string
  bankAccount?: string
  additionalDescriptions: AdditionalDescription[]
  footer?: string
}

// ---------------------------------------------------------------------------
// XML parser (client-side, uses DOMParser)
// ---------------------------------------------------------------------------

function parseXmlForPreview(xml: string): ParsedPreviewData | null {
  if (!xml) return null

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) return null

    const el = (parent: Element | Document, tag: string): Element | null => {
      const elements = parent.getElementsByTagName(tag)
      return elements.length > 0 ? elements[0] : null
    }

    const txt = (parent: Element | Document, tag: string): string => {
      const e = el(parent, tag)
      return e?.textContent?.trim() || ''
    }

    const num = (parent: Element | Document, tag: string): number =>
      parseFloat(txt(parent, tag)) || 0

    const faktura = el(doc, 'Faktura') || doc.documentElement

    // Header
    const naglowek = el(faktura, 'Naglowek')
    const kodFormularza = naglowek ? el(naglowek, 'KodFormularza') : null
    const formCode = kodFormularza?.textContent?.trim() || 'FA'
    const variant = naglowek ? parseInt(txt(naglowek, 'WariantFormularza') || '2', 10) : 2
    const creationDate = naglowek ? txt(naglowek, 'DataWytworzeniaFa') : ''
    const systemInfo = naglowek ? txt(naglowek, 'SystemInfo') : ''

    // Parties
    const parseParty = (tagName: string): Party => {
      const podmiot = el(faktura, tagName)
      if (!podmiot) return { nip: '', name: '', address: {} }
      const dane = el(podmiot, 'DaneIdentyfikacyjne')
      const adres = el(podmiot, 'Adres')
      return {
        nip: dane ? txt(dane, 'NIP') : '',
        name: dane ? (txt(dane, 'Nazwa') || txt(dane, 'PelnaNazwa')) : '',
        address: adres
          ? {
              country: txt(adres, 'KodKraju'),
              line1: txt(adres, 'AdresL1'),
              line2: txt(adres, 'AdresL2'),
            }
          : {},
      }
    }

    const seller = parseParty('Podmiot1')
    const buyer = parseParty('Podmiot2')

    // Issuer (Podmiot3)
    let issuer: ParsedPreviewData['issuer']
    const podmiot3 = el(faktura, 'Podmiot3')
    if (podmiot3) {
      const dane3 = el(podmiot3, 'DaneIdentyfikacyjne')
      issuer = {
        nip: dane3 ? txt(dane3, 'NIP') : '',
        name: dane3 ? (txt(dane3, 'Nazwa') || txt(dane3, 'PelnaNazwa')) : '',
        role: parseInt(txt(podmiot3, 'Rola') || '0', 10) || undefined,
      }
    }

    // Fa section
    const fa = el(faktura, 'Fa')
    if (!fa) return null

    const currency = txt(fa, 'KodWaluty') || 'PLN'
    const invoiceDate = txt(fa, 'P_1')
    const invoiceNumber = txt(fa, 'P_2')
    const saleDate = txt(fa, 'P_6')
    const grossTotal = num(fa, 'P_15')

    // Annotations
    const adnotacje = el(fa, 'Adnotacje')
    const isSplitPayment = adnotacje ? txt(adnotacje, 'P_16') === '1' : false
    const isSelfBilling = adnotacje ? txt(adnotacje, 'P_17') === '1' : false
    const isReverseCharge = adnotacje ? txt(adnotacje, 'P_18') === '1' : false

    // Line items
    const items: LineItem[] = []
    const wiersze = fa.getElementsByTagName('FaWiersz')
    for (let i = 0; i < wiersze.length; i++) {
      const w = wiersze[i]
      const net = num(w, 'P_11')
      const vat = num(w, 'P_11_Vat')
      items.push({
        nr: parseInt(txt(w, 'NrWierszaFa') || String(i + 1), 10),
        description: txt(w, 'P_7'),
        quantity: num(w, 'P_8A') || 1,
        unit: txt(w, 'P_8B') || 'szt.',
        unitPrice: num(w, 'P_9A') || num(w, 'P_9B'),
        vatRate: txt(w, 'P_12') || '23',
        netAmount: net,
        vatAmount: vat,
        grossAmount: net + vat,
      })
    }

    // VAT summary
    const vatMap = new Map<string, VatSummaryRow>()
    for (const item of items) {
      const existing = vatMap.get(item.vatRate)
      if (existing) {
        existing.netAmount += item.netAmount
        existing.vatAmount += item.vatAmount
        existing.grossAmount += item.grossAmount
      } else {
        vatMap.set(item.vatRate, {
          rate: item.vatRate,
          netAmount: item.netAmount,
          vatAmount: item.vatAmount,
          grossAmount: item.grossAmount,
        })
      }
    }
    const vatSummary = Array.from(vatMap.values())

    // Payment
    const platnosc = el(fa, 'Platnosc')
    const terminPlatnosci = platnosc ? el(platnosc, 'TerminPlatnosci') : null
    const dueDate = terminPlatnosci ? txt(terminPlatnosci, 'Termin') : undefined
    const paymentMethod = platnosc ? txt(platnosc, 'FormaPlatnosci') : undefined
    const rachunekBankowy = platnosc ? el(platnosc, 'RachunekBankowy') : null
    const bankAccount = rachunekBankowy ? txt(rachunekBankowy, 'NrRB') : undefined

    // DodatkowyOpis
    const additionalDescriptions: AdditionalDescription[] = []
    const opisElements = fa.getElementsByTagName('DodatkowyOpis')
    for (let i = 0; i < opisElements.length; i++) {
      const o = opisElements[i]
      const key = txt(o, 'Klucz')
      const value = txt(o, 'Wartosc')
      if (key) additionalDescriptions.push({ key, value })
    }

    // Stopka
    const stopka = el(faktura, 'Stopka')
    const info = stopka ? el(stopka, 'Informacje') : null
    const footer = info ? txt(info, 'StopkaFaktury') : undefined

    return {
      formCode, variant, creationDate, systemInfo,
      seller, buyer, issuer,
      currency, invoiceNumber, invoiceDate, saleDate, grossTotal,
      isSplitPayment, isSelfBilling, isReverseCharge,
      items, vatSummary,
      dueDate, paymentMethod, bankAccount,
      additionalDescriptions, footer,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNipDisplay(nip: string): string {
  const n = nip.replace(/\D/g, '')
  if (n.length !== 10) return nip
  return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`
}

function formatAddress(addr: Address): string {
  return [addr.line1, addr.line2].filter(Boolean).join(', ')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface InvoiceXmlPreviewProps {
  xml: string
  downloadUrl?: string
  showActions?: boolean
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function InvoiceXmlPreview({
  xml,
  downloadUrl,
  showActions = true,
  collapsible = false,
  defaultExpanded = false,
}: InvoiceXmlPreviewProps) {
  const intl = useIntl()
  const t = (id: string) => intl.formatMessage({ id: `xmlPreview.${id}` })
  const [expanded, setExpanded] = useState(defaultExpanded)

  const data = useMemo(() => parseXmlForPreview(xml), [xml])

  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileCode className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">{t('parseError')}</p>
        </CardContent>
      </Card>
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadXml = () => {
    // Always build a blob from the in-memory xml string so the download
    // does not require a separate authenticated HTTP request.
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.invoiceNumber || 'invoice'}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const header = (
    <CardHeader
      className={`flex flex-row items-center justify-between ${collapsible ? 'cursor-pointer hover:bg-muted/50' : ''}`}
      onClick={collapsible ? () => setExpanded(!expanded) : undefined}
    >
      <CardTitle className="text-base flex items-center gap-2">
        <FileCode className="h-4 w-4" />
        {t('title')}
      </CardTitle>
      <div className="flex items-center gap-2">
        {showActions && (
          <div className="flex gap-2 print:hidden" onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              {t('print')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadXml}>
              <Download className="h-4 w-4 mr-1" />
              {t('downloadXml')}
            </Button>
          </div>
        )}
        {collapsible && (
          expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </CardHeader>
  )

  if (collapsible && !expanded) {
    return <Card>{header}</Card>
  }

  return (
    <Card>
      {header}
      <CardContent>
        <div className="invoice-preview space-y-5 text-sm print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold">{t('invoiceTitle')}</h2>
              <p className="text-xs text-muted-foreground">
                {data.formCode} ({data.variant}) — {data.systemInfo}
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>{t('creationDate')}: {data.creationDate}</p>
            </div>
          </div>

          {/* Invoice Number & Dates */}
          <div className="grid grid-cols-3 gap-4 bg-muted/50 rounded-md p-3">
            <div>
              <p className="text-xs text-muted-foreground">{t('invoiceNumber')}</p>
              <p className="font-semibold">{data.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('invoiceDate')}</p>
              <p className="font-medium">{data.invoiceDate.substring(0, 10)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('saleDate')}</p>
              <p className="font-medium">{data.saleDate}</p>
            </div>
          </div>

          {/* Seller & Buyer */}
          <div className="grid grid-cols-2 gap-6">
            <div className="border rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('seller')}
              </p>
              <p className="font-semibold">{data.seller.name}</p>
              <p className="text-xs">NIP: {formatNipDisplay(data.seller.nip)}</p>
              {formatAddress(data.seller.address) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatAddress(data.seller.address)}
                </p>
              )}
            </div>
            <div className="border rounded-md p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('buyer')}
              </p>
              <p className="font-semibold">{data.buyer.name}</p>
              <p className="text-xs">NIP: {formatNipDisplay(data.buyer.nip)}</p>
              {formatAddress(data.buyer.address) && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatAddress(data.buyer.address)}
                </p>
              )}
            </div>
          </div>

          {/* Issuer (Podmiot3) */}
          {data.issuer && (
            <div className="border rounded-md p-3 bg-blue-50/50 dark:bg-blue-950/20">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('issuer')}
              </p>
              <p className="font-semibold">{data.issuer.name}</p>
              <p className="text-xs">NIP: {formatNipDisplay(data.issuer.nip)}</p>
            </div>
          )}

          <Separator />

          {/* Line Items */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {t('lineItems')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 w-10 font-medium text-muted-foreground">{t('colNr')}</th>
                    <th className="p-2 font-medium text-muted-foreground">{t('colDescription')}</th>
                    <th className="p-2 text-right w-16 font-medium text-muted-foreground">{t('colQty')}</th>
                    <th className="p-2 w-14 font-medium text-muted-foreground">{t('colUnit')}</th>
                    <th className="p-2 text-right w-24 font-medium text-muted-foreground">{t('colUnitPrice')}</th>
                    <th className="p-2 text-right w-16 font-medium text-muted-foreground">{t('colVatRate')}</th>
                    <th className="p-2 text-right w-24 font-medium text-muted-foreground">{t('colNet')}</th>
                    <th className="p-2 text-right w-24 font-medium text-muted-foreground">{t('colVat')}</th>
                    <th className="p-2 text-right w-24 font-medium text-muted-foreground">{t('colGross')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.nr} className="border-b">
                      <td className="p-2">{item.nr}</td>
                      <td className="p-2 max-w-[200px] truncate" title={item.description}>{item.description}</td>
                      <td className="p-2 text-right">{item.quantity}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2 text-right">{item.vatRate}%</td>
                      <td className="p-2 text-right">{formatCurrency(item.netAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.vatAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(item.grossAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* VAT Summary */}
          {data.vatSummary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('vatSummary')}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 font-medium text-muted-foreground">{t('colVatRate')}</th>
                    <th className="p-2 text-right font-medium text-muted-foreground">{t('colNet')}</th>
                    <th className="p-2 text-right font-medium text-muted-foreground">{t('colVat')}</th>
                    <th className="p-2 text-right font-medium text-muted-foreground">{t('colGross')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vatSummary.map((row) => (
                    <tr key={row.rate} className="border-b">
                      <td className="p-2">{row.rate}%</td>
                      <td className="p-2 text-right">{formatCurrency(row.netAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(row.vatAmount)}</td>
                      <td className="p-2 text-right">{formatCurrency(row.grossAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Grand Total */}
          <div className="flex justify-end">
            <div className="bg-primary/5 border border-primary/20 rounded-md px-6 py-3 text-right">
              <p className="text-xs text-muted-foreground">{t('grossTotal')}</p>
              <p className="text-xl font-bold">{formatCurrency(data.grossTotal)} {data.currency}</p>
            </div>
          </div>

          {/* Annotations */}
          {(data.isSelfBilling || data.isSplitPayment || data.isReverseCharge) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('annotations')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {data.isSelfBilling && <Badge variant="secondary">{t('selfBilling')}</Badge>}
                {data.isSplitPayment && <Badge variant="secondary">{t('splitPayment')}</Badge>}
                {data.isReverseCharge && <Badge variant="secondary">{t('reverseCharge')}</Badge>}
              </div>
            </div>
          )}

          {/* Payment */}
          {(data.dueDate || data.paymentMethod || data.bankAccount) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('payment')}
              </p>
              <div className="grid grid-cols-3 gap-4 text-xs">
                {data.dueDate && (
                  <div>
                    <span className="text-muted-foreground">{t('dueDate')}: </span>
                    <span className="font-medium">{data.dueDate.substring(0, 10)}</span>
                  </div>
                )}
                {data.paymentMethod && (
                  <div>
                    <span className="text-muted-foreground">{t('paymentMethod')}: </span>
                    <span className="font-medium">{data.paymentMethod}</span>
                  </div>
                )}
                {data.bankAccount && (
                  <div>
                    <span className="text-muted-foreground">{t('bankAccount')}: </span>
                    <span className="font-mono font-medium">{data.bankAccount}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DodatkowyOpis */}
          {data.additionalDescriptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                {t('additionalInfo')}
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2 w-1/3 font-medium text-muted-foreground">{t('colKey')}</th>
                    <th className="p-2 font-medium text-muted-foreground">{t('colValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.additionalDescriptions.map((d, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-medium">{d.key}</td>
                      <td className="p-2 font-mono text-xs">{d.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          {data.footer && (
            <div className="border-t pt-3 mt-3">
              <p className="text-xs text-muted-foreground italic">{data.footer}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
