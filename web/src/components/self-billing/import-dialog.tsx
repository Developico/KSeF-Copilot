'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Upload, Download, CheckCircle, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react'
import { useCompanyContext } from '@/contexts/company-context'
import {
  useImportSelfBilling,
  useConfirmSelfBillingImport,
} from '@/hooks/use-api'
import type { SelfBillingImportResult, SbImportEnrichedRow } from '@/lib/api'
import { toast } from 'sonner'
import { buildXlsx } from '@/lib/xlsx-builder'

// Column definitions for the SB import template
// Rows with the same invoiceNumber+supplierNip are grouped into one invoice with multiple line items.
const TEMPLATE_COLUMNS = [
  'invoiceNumber',
  'supplierNip',
  'supplierName',
  'invoiceDate',
  'dueDate',
  'currency',
  'itemDescription',
  'quantity',
  'unit',
  'unitPrice',
  'vatRate',
  'paymentTermDays',
  'sortOrder',
] as const

const SAMPLE_ROWS = [
  [
    'SF/2026/01/001',
    '1234567890',
    'Supplier Name',
    '2026-01-15',
    '2026-02-14',
    'PLN',
    'Consulting services',
    '10',
    'h',
    '150.00',
    '23',
    '30',
    '1',
  ],
  [
    'SF/2026/01/001',
    '1234567890',
    'Supplier Name',
    '2026-01-15',
    '2026-02-14',
    'PLN',
    'Travel expenses',
    '1',
    'szt.',
    '500.00',
    '23',
    '30',
    '2',
  ],
  [
    'SF/2026/01/002',
    '9876543210',
    'Other Supplier',
    '2026-01-20',
    '2026-02-19',
    'PLN',
    'Material delivery',
    '100',
    'kg',
    '12.50',
    '23',
    '14',
    '1',
  ],
]

function downloadFile(content: string | Uint8Array, fileName: string, mimeType: string) {
  const blob = new Blob([content instanceof Uint8Array ? content.buffer as ArrayBuffer : content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function generateCsv(headers: readonly string[], sampleRows: string[][]): string {
  const BOM = '\uFEFF'
  const headerLine = headers.join(';')
  const dataLines = sampleRows.map((row) => row.join(';'))
  return BOM + [headerLine, ...dataLines].join('\r\n') + '\r\n'
}

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('selfBilling')
  const tCommon = useTranslations('common')
  const { selectedCompany } = useCompanyContext()
  const importMutation = useImportSelfBilling()
  const confirmMutation = useConfirmSelfBillingImport()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<SelfBillingImportResult | null>(null)

  function handleDownloadCsv() {
    const csv = generateCsv(TEMPLATE_COLUMNS, SAMPLE_ROWS)
    downloadFile(csv, 'self-billing-import-template.csv', 'text/csv;charset=utf-8')
  }

  function handleDownloadExcel() {
    const xlsx = buildXlsx(TEMPLATE_COLUMNS, SAMPLE_ROWS)
    downloadFile(xlsx, 'self-billing-import-template.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setPreview(null)
  }

  function handleImport() {
    if (!file || !selectedCompany) return
    importMutation.mutate(
      { file, settingId: selectedCompany.id },
      {
        onSuccess: (result) => {
          setPreview(result)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleConfirmImport() {
    if (!preview || !selectedCompany) return
    const validRows = preview.rows.filter((r) => r.valid)
    if (validRows.length === 0) return

    confirmMutation.mutate(
      { settingId: selectedCompany.id, rows: validRows },
      {
        onSuccess: (result) => {
          toast.success(t('generatedSuccess', { count: result.created }))
          handleClose()
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleClose() {
    onOpenChange(false)
    setFile(null)
    setPreview(null)
  }

  const validRows = preview?.rows.filter((r) => r.valid) ?? []
  const invalidRows = preview?.rows.filter((r) => !r.valid) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('importTitle')}</DialogTitle>
        </DialogHeader>

        {!preview ? (
          /* Step 1: Upload */
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{t('importDescription')}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('downloadTemplate')}:</span>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <FileText className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          /* Step 2: Preview */
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="flex gap-4 text-sm">
              <span>{t('totalRows')}: <strong>{preview.totalRows}</strong></span>
              <span className="text-green-600">{t('validRows')}: <strong>{preview.validRows}</strong></span>
              <span className="text-red-600">{t('invalidRows')}: <strong>{preview.invalidRows}</strong></span>
            </div>

            {/* Parse errors */}
            {preview.parseErrors.length > 0 && (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-700 mb-1">{t('parseErrors')}:</p>
                <ul className="list-disc list-inside text-red-600 space-y-0.5">
                  {preview.parseErrors.map((e, i) => (
                    <li key={i}>{t('rowError', { row: e.row, message: e.message })}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Invalid rows */}
            {invalidRows.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {t('invalidRowsDetail')}:
                </p>
                <ul className="list-disc list-inside text-amber-600 space-y-0.5">
                  {invalidRows.map((row, i) => (
                    <li key={i}>
                      {row.supplierNip} — {row.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Valid rows preview */}
            {validRows.length > 0 && (
              <div className="max-h-60 overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-2">{t('supplier')}</th>
                      <th className="text-left p-2">{t('item')}</th>
                      <th className="text-right p-2">{t('quantity')}</th>
                      <th className="text-right p-2">{t('netAmount')}</th>
                      <th className="text-right p-2">{t('grossAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{row.supplierName ?? row.supplierNip}</td>
                        <td className="p-2">{row.itemDescription}</td>
                        <td className="p-2 text-right">{row.quantity} {row.unit}</td>
                        <td className="p-2 text-right">{row.netAmount.toFixed(2)}</td>
                        <td className="p-2 text-right">{row.grossAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          {!preview ? (
            <Button onClick={handleImport} disabled={!file || importMutation.isPending}>
              <Upload className="h-4 w-4 mr-2" />
              {t('import')}
            </Button>
          ) : (
            <Button
              onClick={handleConfirmImport}
              disabled={validRows.length === 0 || confirmMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('confirmAndCreate')} ({validRows.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
