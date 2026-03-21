'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MonthPicker } from '@/components/ui/month-picker'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Wand2, CheckCircle, AlertTriangle, Building2, FileText, Loader2 } from 'lucide-react'
import { useCompanyContext } from '@/contexts/company-context'
import { usePreviewSelfBilling, useGenerateSelfBilling } from '@/hooks/use-api'
import type { SelfBillingGeneratePreview, SelfBillingGenerateResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

export function GenerateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('selfBilling')
  const tCommon = useTranslations('common')
  const { selectedCompany } = useCompanyContext()
  const previewMutation = usePreviewSelfBilling()
  const generateMutation = useGenerateSelfBilling()

  const [period, setPeriod] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [previewed, setPreviewed] = useState(false)
  const [diagnostics, setDiagnostics] = useState<SelfBillingGenerateResponse['diagnostics']>()
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [previewData, setPreviewData] = useState<SelfBillingGeneratePreview[]>([])

  const selectedSummary = useMemo(() => {
    let supplierCount = 0
    let netAmount = 0
    let vatAmount = 0
    let grossAmount = 0

    for (const preview of previewData) {
      const selectedItems = preview.items.filter(i => selectedTemplates.has(i.templateId))
      if (selectedItems.length > 0) {
        supplierCount++
        for (const item of selectedItems) {
          netAmount += item.netAmount
          vatAmount += item.vatAmount
          grossAmount += item.grossAmount
        }
      }
    }

    return { supplierCount, netAmount, vatAmount, grossAmount }
  }, [previewData, selectedTemplates])

  function resetState() {
    setPreviewed(false)
    setPreviewData([])
    setDiagnostics(undefined)
    setSelectedTemplates(new Set())
  }

  function handlePreview() {
    const [year, month] = period.split('-').map(Number)
    previewMutation.mutate(
      { settingId: selectedCompany?.id ?? '', period: { month, year } },
      {
        onSuccess: (result) => {
          const previews = result.previews ?? []
          setPreviewData(previews)
          setDiagnostics(result.diagnostics)
          const allIds = new Set<string>()
          for (const p of previews) {
            for (const item of p.items) {
              allIds.add(item.templateId)
            }
          }
          setSelectedTemplates(allIds)
          setPreviewed(true)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function handleConfirm() {
    const [year, month] = period.split('-').map(Number)

    // Build filtered previews from the selected templates
    const filteredPreviews = previewData
      .map((preview) => {
        const selectedItems = preview.items.filter(i => selectedTemplates.has(i.templateId))
        if (selectedItems.length === 0) return null
        const totals = selectedItems.reduce(
          (acc, item) => ({
            netAmount: acc.netAmount + item.netAmount,
            vatAmount: acc.vatAmount + item.vatAmount,
            grossAmount: acc.grossAmount + item.grossAmount,
          }),
          { netAmount: 0, vatAmount: 0, grossAmount: 0 },
        )
        return { ...preview, items: selectedItems, totals }
      })
      .filter(Boolean) as typeof previewData

    generateMutation.mutate(
      {
        settingId: selectedCompany?.id ?? '',
        period: { month, year },
        previews: filteredPreviews,
      },
      {
        onSuccess: (result) => {
          if (result.generated > 0) {
            toast.success(t('generatedSuccess', { count: result.generated }))
            onOpenChange(false)
            resetState()
          } else if (result.failed > 0) {
            toast.error(t('generateFailed', { count: result.failed }))
          } else {
            toast.warning(t('previewCount', { count: 0 }))
          }
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  function toggleTemplate(templateId: string) {
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) {
        next.delete(templateId)
      } else {
        next.add(templateId)
      }
      return next
    })
  }

  function toggleAllForSupplier(preview: SelfBillingGeneratePreview) {
    const ids = preview.items.map(i => i.templateId)
    const allSelected = ids.every(id => selectedTemplates.has(id))
    setSelectedTemplates(prev => {
      const next = new Set(prev)
      for (const id of ids) {
        if (allSelected) {
          next.delete(id)
        } else {
          next.add(id)
        }
      }
      return next
    })
  }

  function getSkipReasonLabel(reason: string): string {
    if (reason === 'no_active_agreement') return t('diagnostics.noActiveAgreement')
    if (reason === 'no_templates') return t('diagnostics.noTemplates')
    if (reason.startsWith('agreement_not_yet_valid')) return t('diagnostics.agreementNotYetValid')
    if (reason.startsWith('agreement_expired')) return t('diagnostics.agreementExpired')
    return reason
  }

  const skippedSuppliers = diagnostics?.supplierDetails?.filter(s => s.skipReason) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('generateTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!previewed ? (
            <>
              <label className="text-sm font-medium">{t('period')}</label>
              <MonthPicker value={period} onChange={setPeriod} />
            </>
          ) : previewData.length > 0 ? (
            <div className="space-y-4">
              {previewData.map((preview) => {
                const supplierAllSelected = preview.items.every(i => selectedTemplates.has(i.templateId))
                const supplierSomeSelected = preview.items.some(i => selectedTemplates.has(i.templateId))

                return (
                  <div key={preview.supplierId} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-3 py-2 bg-muted/50 cursor-pointer"
                      onClick={() => toggleAllForSupplier(preview)}
                    >
                      <Checkbox
                        checked={supplierAllSelected ? true : supplierSomeSelected ? 'indeterminate' : false}
                        onCheckedChange={() => toggleAllForSupplier(preview)}
                      />
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{preview.supplierName}</p>
                        <p className="text-xs text-muted-foreground">
                          NIP: {preview.supplierNip} &middot; {t('preview.templatesCount', { count: preview.items.length })}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y">
                      {preview.items.map((item) => (
                        <label
                          key={item.templateId}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTemplates.has(item.templateId)}
                            onCheckedChange={() => toggleTemplate(item.templateId)}
                          />
                          <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{item.templateName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.itemDescription} &middot; {item.quantity} &times; {formatCurrency(item.unitPrice)} &middot; VAT {item.vatRate}%
                            </p>
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">
                            {formatCurrency(item.grossAmount)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}

              {selectedSummary.supplierCount > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  <div className="flex justify-between">
                    <span>{t('preview.selectedSuppliers', { count: selectedSummary.supplierCount })}</span>
                    <span className="font-semibold">{formatCurrency(selectedSummary.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                    <span>{t('preview.net')}: {formatCurrency(selectedSummary.netAmount)}</span>
                    <span>VAT: {formatCurrency(selectedSummary.vatAmount)}</span>
                  </div>
                </div>
              )}

              {skippedSuppliers.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-muted-foreground">{t('diagnostics.skippedTitle')}</p>
                  {skippedSuppliers.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-muted-foreground bg-muted/50 rounded px-2 py-1">
                      <span>{s.name}</span>
                      <span className="text-xs">{getSkipReasonLabel(s.skipReason!)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-semibold">{t('previewCount', { count: 0 })}</p>
              </div>
              {diagnostics && diagnostics.suppliersFound === 0 && (
                <p className="text-sm text-muted-foreground">{t('diagnostics.noSuppliers')}</p>
              )}
              {skippedSuppliers.length > 0 && (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{t('diagnostics.skippedTitle')}</p>
                  {skippedSuppliers.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-muted-foreground bg-muted/50 rounded px-2 py-1">
                      <span>{s.name}</span>
                      <span className="text-xs">{getSkipReasonLabel(s.skipReason!)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              resetState()
            }}
          >
            {tCommon('cancel')}
          </Button>
          {!previewed ? (
            <Button onClick={handlePreview} disabled={previewMutation.isPending}>
              <Wand2 className="h-4 w-4 mr-2" />
              {t('generatePreview')}
            </Button>
          ) : selectedSummary.supplierCount > 0 ? (
            <Button onClick={handleConfirm} disabled={generateMutation.isPending}>
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {generateMutation.isPending ? t('generating') : t('confirmAndCreate')} ({selectedSummary.supplierCount})
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
