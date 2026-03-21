'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useContextSbTemplates,
  useCreateSbTemplate,
  useUpdateSbTemplate,
  useDeleteSbTemplate,
} from '@/hooks/use-api'
import { formatCurrency } from '@/lib/format'

interface SupplierSbTemplatesProps {
  supplierId: string
  settingId: string
}

export function SupplierSbTemplates({ supplierId, settingId }: SupplierSbTemplatesProps) {
  const t = useTranslations('suppliers')
  const tCommon = useTranslations('common')

  const { data: templatesData } = useContextSbTemplates(supplierId)
  const createMutation = useCreateSbTemplate()
  const updateMutation = useUpdateSbTemplate()
  const deleteMutation = useDeleteSbTemplate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', itemDescription: '', quantity: 1, unit: 'szt.', unitPrice: 0, vatRate: 23, currency: 'PLN',
    paymentTermDays: null as number | null,
    paymentTermSelect: 'none' as string,
  })

  const templates = templatesData?.templates ?? []

  const PRESET_DAYS = [0, 7, 14, 30, 60, 90]

  function paymentTermDaysToSelect(days: number | null | undefined): string {
    if (days === null || days === undefined) return 'none'
    if (PRESET_DAYS.includes(days)) return String(days)
    return 'custom'
  }

  function openAdd() {
    setEditingId(null)
    setForm({
      name: '', itemDescription: '', quantity: 1, unit: 'szt.', unitPrice: 0, vatRate: 23, currency: 'PLN',
      paymentTermDays: null, paymentTermSelect: 'none',
    })
    setDialogOpen(true)
  }

  function openEdit(tpl: typeof templates[number]) {
    setEditingId(tpl.id)
    setForm({
      name: tpl.name,
      itemDescription: tpl.itemDescription,
      quantity: tpl.quantity,
      unit: tpl.unit,
      unitPrice: tpl.unitPrice,
      vatRate: tpl.vatRate,
      currency: tpl.currency,
      paymentTermDays: tpl.paymentTermDays ?? null,
      paymentTermSelect: paymentTermDaysToSelect(tpl.paymentTermDays),
    })
    setDialogOpen(true)
  }

  function handleSave() {
    const { paymentTermSelect: _sel, ...rest } = form
    const payload = { ...rest, supplierId, settingId }
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload }, {
        onSuccess: () => setDialogOpen(false),
      })
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('templates.title')}
            {templates.length > 0 && (
              <Badge variant="secondary">{templates.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t('templates.empty')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('templates.name')}</TableHead>
                  <TableHead>{t('templates.item')}</TableHead>
                  <TableHead className="text-right">{t('templates.unitPrice')}</TableHead>
                  <TableHead className="text-center">{t('templates.vat')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((tpl) => (
                  <TableRow key={tpl.id} className="cursor-pointer" onDoubleClick={() => openEdit(tpl)}>
                    <TableCell className="font-medium">{tpl.name}</TableCell>
                    <TableCell>
                      {tpl.itemDescription}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({tpl.quantity} {tpl.unit})
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(tpl.unitPrice)}</TableCell>
                    <TableCell className="text-center">{tpl.vatRate}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(tpl)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex gap-2 px-4 py-3 border-t">
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" />
              {t('templates.add')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('templates.edit') : t('templates.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t('templates.name')}</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">{t('templates.item')}</label>
              <Input value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">{t('templates.quantity')}</label>
                <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('templates.unit')}</label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('templates.unitPrice')}</label>
                <Input type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('templates.vat')}</label>
                <Input type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-sm font-medium">{t('templates.currency')}</label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{t('templates.paymentTerm')}</label>
              <div className="flex gap-2">
                <Select
                  value={form.paymentTermSelect}
                  onValueChange={(val) => {
                    if (val === 'none') {
                      setForm({ ...form, paymentTermSelect: 'none', paymentTermDays: null })
                    } else if (val === 'custom') {
                      setForm({ ...form, paymentTermSelect: 'custom', paymentTermDays: form.paymentTermDays ?? 0 })
                    } else {
                      setForm({ ...form, paymentTermSelect: val, paymentTermDays: Number(val) })
                    }
                  }}
                >
                  <SelectTrigger className={form.paymentTermSelect === 'custom' ? 'w-2/3' : 'w-full'}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('templates.paymentTermNone')}</SelectItem>
                    <SelectItem value="0">{t('templates.paymentTermOnInvoice')}</SelectItem>
                    <SelectItem value="7">+ 7 {t('templates.paymentTermDays')}</SelectItem>
                    <SelectItem value="14">+ 14 {t('templates.paymentTermDays')}</SelectItem>
                    <SelectItem value="30">+ 30 {t('templates.paymentTermDays')}</SelectItem>
                    <SelectItem value="60">+ 60 {t('templates.paymentTermDays')}</SelectItem>
                    <SelectItem value="90">+ 90 {t('templates.paymentTermDays')}</SelectItem>
                    <SelectItem value="custom">{t('templates.paymentTermCustom')}</SelectItem>
                  </SelectContent>
                </Select>
                {form.paymentTermSelect === 'custom' && (
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    className="w-1/3"
                    value={form.paymentTermDays ?? 0}
                    onChange={(e) => setForm({ ...form, paymentTermDays: Number(e.target.value) })}
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? tCommon('save') : t('templates.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
