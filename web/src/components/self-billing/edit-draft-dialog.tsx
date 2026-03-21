'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useUpdateSelfBillingInvoice } from '@/hooks/use-api'
import type { SelfBillingInvoice, SelfBillingInvoiceUpdateData } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

interface LineItem {
  templateId?: string
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  paymentTermDays?: number | null
}

export function EditDraftDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: SelfBillingInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('selfBilling')
  const tCommon = useTranslations('common')
  const updateMutation = useUpdateSelfBillingInvoice()

  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTermSelect, setPaymentTermSelect] = useState('none')
  const [customDays, setCustomDays] = useState(0)
  const [items, setItems] = useState<LineItem[]>([])

  const PRESET_DAYS = [0, 7, 14, 30, 60, 90]

  function computeDueDate(invDate: string, days: number): string {
    if (!invDate) return ''
    const d = new Date(invDate)
    d.setDate(d.getDate() + days)
    return d.toISOString().substring(0, 10)
  }

  function inferPaymentTermSelect(invDate: string, due: string): { select: string; days: number } {
    if (!invDate || !due) return { select: 'none', days: 0 }
    const diffMs = new Date(due).getTime() - new Date(invDate).getTime()
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
    if (days < 0) return { select: 'none', days: 0 }
    if (PRESET_DAYS.includes(days)) return { select: String(days), days }
    return { select: 'custom', days }
  }

  useEffect(() => {
    if (invoice && open) {
      setInvoiceNumber(invoice.invoiceNumber ?? '')
      const invDate = invoice.invoiceDate?.split('T')[0] ?? ''
      const due = invoice.dueDate?.split('T')[0] ?? ''
      setInvoiceDate(invDate)
      setDueDate(due)
      const inferred = inferPaymentTermSelect(invDate, due)
      setPaymentTermSelect(inferred.select)
      setCustomDays(inferred.days)
      const invoiceItems = invoice.items ?? []
      setItems(
        invoiceItems.length > 0
          ? invoiceItems.map((it) => ({
              templateId: it.templateId,
              itemDescription: it.itemDescription,
              quantity: it.quantity,
              unit: it.unit,
              unitPrice: it.unitPrice,
              vatRate: it.vatRate,
              paymentTermDays: it.paymentTermDays ?? null,
            }))
          : [{
              itemDescription: '',
              quantity: 1,
              unit: 'szt.',
              unitPrice: 0,
              vatRate: 23,
            }],
      )
    }
  }, [invoice, open]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePaymentTermChange(val: string) {
    setPaymentTermSelect(val)
    if (val === 'none') {
      setDueDate('')
    } else if (val === 'custom') {
      setDueDate(computeDueDate(invoiceDate, customDays))
    } else {
      const days = Number(val)
      setDueDate(computeDueDate(invoiceDate, days))
    }
  }

  function handleCustomDaysChange(days: number) {
    setCustomDays(days)
    setDueDate(computeDueDate(invoiceDate, days))
  }

  function handleInvoiceDateChange(val: string) {
    setInvoiceDate(val)
    // Recompute dueDate based on current payment term
    if (paymentTermSelect === 'none') {
      setDueDate('')
    } else if (paymentTermSelect === 'custom') {
      setDueDate(computeDueDate(val, customDays))
    } else {
      setDueDate(computeDueDate(val, Number(paymentTermSelect)))
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(amount)

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { itemDescription: '', quantity: 1, unit: 'szt.', unitPrice: 0, vatRate: 23 },
    ])
  }

  function removeItem(index: number) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const totals = items.reduce(
    (acc, item) => {
      const net = item.quantity * item.unitPrice
      const vat = item.vatRate >= 0 ? net * item.vatRate / 100 : 0
      return {
        netAmount: acc.netAmount + net,
        vatAmount: acc.vatAmount + vat,
        grossAmount: acc.grossAmount + net + vat,
      }
    },
    { netAmount: 0, vatAmount: 0, grossAmount: 0 },
  )

  function handleSave() {
    if (!invoice) return

    const data: SelfBillingInvoiceUpdateData = {}
    if (invoiceNumber && invoiceNumber !== invoice.invoiceNumber) data.invoiceNumber = invoiceNumber
    if (invoiceDate) data.invoiceDate = invoiceDate
    if (dueDate) data.dueDate = dueDate
    if (items.length > 0) data.items = items

    updateMutation.mutate(
      { id: invoice.id, data },
      {
        onSuccess: () => {
          toast.success(t('editSuccess'))
          onOpenChange(false)
        },
        onError: (err) => toast.error(err.message),
      },
    )
  }

  if (!invoice) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editDraftTitle')} — {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice number */}
          <div className="space-y-2">
            <Label>{t('invoiceNumber')}</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('invoiceDate')}</Label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => handleInvoiceDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('paymentTerm')}</Label>
              <div className="flex gap-2">
                <Select value={paymentTermSelect} onValueChange={handlePaymentTermChange}>
                  <SelectTrigger className={paymentTermSelect === 'custom' ? 'w-2/3' : 'w-full'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('paymentTermNone')}</SelectItem>
                    <SelectItem value="0">{t('paymentTermOnInvoice')}</SelectItem>
                    <SelectItem value="7">+ 7 {t('paymentTermDays')}</SelectItem>
                    <SelectItem value="14">+ 14 {t('paymentTermDays')}</SelectItem>
                    <SelectItem value="30">+ 30 {t('paymentTermDays')}</SelectItem>
                    <SelectItem value="60">+ 60 {t('paymentTermDays')}</SelectItem>
                    <SelectItem value="90">+ 90 {t('paymentTermDays')}</SelectItem>
                    <SelectItem value="custom">{t('paymentTermCustom')}</SelectItem>
                  </SelectContent>
                </Select>
                {paymentTermSelect === 'custom' && (
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    className="w-1/3"
                    value={customDays}
                    onChange={(e) => handleCustomDaysChange(Number(e.target.value))}
                  />
                )}
              </div>
              {dueDate && (
                <p className="text-xs text-muted-foreground">
                  {t('dueDate')}: {dueDate}
                </p>
              )}
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('lineItems')}</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" />
                {t('addItem')}
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="border rounded-md p-3 space-y-2 bg-muted/30"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder={t('itemDescription')}
                        value={item.itemDescription}
                        onChange={(e) => updateItem(idx, 'itemDescription', e.target.value)}
                      />
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">{t('quantity')}</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t('unit')}</Label>
                          <Input
                            value={item.unit}
                            onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t('unitPrice')}</Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">{t('vatRateLabel')}</Label>
                          <Input
                            type="number"
                            min={-1}
                            max={100}
                            value={item.vatRate}
                            onChange={(e) => updateItem(idx, 'vatRate', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 mt-1 shrink-0"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="text-sm space-y-1 text-right">
              <div>{t('netAmount')}: <span className="font-medium">{formatCurrency(totals.netAmount)}</span></div>
              <div>VAT: <span className="font-medium">{formatCurrency(totals.vatAmount)}</span></div>
              <div>{t('grossAmount')}: <span className="font-bold">{formatCurrency(totals.grossAmount)}</span></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
