import { useState } from 'react'
import { useIntl } from 'react-intl'
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button, Input, Separator,
} from '@/components/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { FileText, Plus, Trash2, Pencil } from 'lucide-react'
import {
  useSbTemplates, useCreateSbTemplate, useUpdateSbTemplate,
  useDeleteSbTemplate,
} from '@/hooks/use-api'
import type { SbTemplate } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { toast } from 'sonner'

interface Props {
  supplierId: string
  settingId: string
}

const emptyForm = {
  name: '',
  itemDescription: '',
  quantity: 1,
  unit: 'szt.',
  unitPrice: 0,
  vatRate: 23,
  currency: 'PLN',
}

export function SupplierSbTemplates({ supplierId, settingId }: Props) {
  const intl = useIntl()
  const t = (id: string, values?: Record<string, string | number>) =>
    intl.formatMessage({ id }, values)

  const { data } = useSbTemplates({ settingId })
  const createMutation = useCreateSbTemplate()
  const updateMutation = useUpdateSbTemplate()
  const deleteMutation = useDeleteSbTemplate()

  const templates = (data?.templates ?? []).filter(
    (tpl) => tpl.supplierId === supplierId,
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(tpl: SbTemplate) {
    setEditingId(tpl.id)
    setForm({
      name: tpl.name,
      itemDescription: tpl.itemDescription,
      quantity: tpl.quantity,
      unit: tpl.unit,
      unitPrice: tpl.unitPrice,
      vatRate: tpl.vatRate,
      currency: tpl.currency,
    })
    setDialogOpen(true)
  }

  function handleSave() {
    const payload = { ...form, supplierId, settingId }
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            toast.success(t('suppliers.templates.updated'))
            setDialogOpen(false)
          },
          onError: (err) => toast.error(err.message),
        },
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success(t('suppliers.templates.created'))
          setDialogOpen(false)
        },
        onError: (err) => toast.error(err.message),
      })
    }
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success(t('suppliers.templates.deleted')),
      onError: (err) => toast.error(err.message),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {t('suppliers.templates.title')}
            {templates.length > 0 && (
              <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
            )}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t('suppliers.templates.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('suppliers.templates.empty')}
          </p>
        ) : (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">{t('suppliers.templates.name')}</th>
                  <th className="p-3 text-left font-medium">{t('suppliers.templates.item')}</th>
                  <th className="p-3 text-right font-medium">{t('suppliers.templates.unitPrice')}</th>
                  <th className="p-3 text-center font-medium">{t('suppliers.templates.vat')}</th>
                  <th className="p-3 text-right font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {templates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-medium">{tpl.name}</td>
                    <td className="p-3 text-muted-foreground">
                      {tpl.itemDescription}
                      <span className="ml-1 text-xs">
                        ({tpl.quantity} {tpl.unit})
                      </span>
                    </td>
                    <td className="p-3 text-right">{formatCurrency(tpl.unitPrice)}</td>
                    <td className="p-3 text-center">{tpl.vatRate}%</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tpl)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(tpl.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('suppliers.templates.edit') : t('suppliers.templates.add')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">{t('suppliers.templates.name')}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('suppliers.templates.item')}</label>
              <Input
                value={form.itemDescription}
                onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">{t('suppliers.templates.quantity')}</label>
                <Input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('suppliers.templates.unit')}</label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('suppliers.templates.unitPrice')}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">{t('suppliers.templates.vat')}</label>
                <Input
                  type="number"
                  value={form.vatRate}
                  onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('suppliers.templates.currency')}</label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? t('common.save') : t('suppliers.templates.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
