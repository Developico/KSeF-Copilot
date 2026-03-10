import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Label } from '@/components/ui'
import { Textarea } from '@/components/ui'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui'
import { Pencil, Sparkles } from 'lucide-react'
import { useUpdateInvoice } from '@/hooks/use-api'
import { useMpkCenters } from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { toast } from 'sonner'
import type { Invoice } from '@/lib/types'

interface ClassificationEditDialogProps {
  invoice: Invoice
}

export function ClassificationEditDialog({ invoice }: ClassificationEditDialogProps) {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [mpk, setMpk] = useState((invoice.mpkCenterName || invoice.mpk) ?? '')
  const [category, setCategory] = useState(invoice.category ?? '')
  const [description, setDescription] = useState(invoice.description ?? '')
  const [project, setProject] = useState(invoice.project ?? '')

  const { selectedCompany } = useCompanyContext()
  const { data: mpkCentersData } = useMpkCenters(selectedCompany?.id ?? '')
  const mpkOptions = mpkCentersData?.mpkCenters?.map(mc => ({ id: mc.id, name: mc.name })) ?? []

  const updateInvoice = useUpdateInvoice()

  useEffect(() => {
    if (open) {
      setMpk((invoice.mpkCenterName || invoice.mpk) ?? '')
      setCategory(invoice.category ?? '')
      setDescription(invoice.description ?? '')
      setProject(invoice.project ?? '')
    }
  }, [open, invoice])

  function handleSave() {
    // Resolve MPK name to center ID
    const selectedCenter = mpkOptions.find(o => o.name === mpk)
    updateInvoice.mutate(
      { id: invoice.id, data: { mpkCenterId: selectedCenter?.id || undefined, category, description, project } },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'invoices.classificationUpdated' }))
          setOpen(false)
        },
        onError: () => {
          toast.error(intl.formatMessage({ id: 'invoices.classificationUpdateError' }))
        },
      },
    )
  }

  function applyAiSuggestion() {
    if (invoice.aiMpkSuggestion) setMpk(invoice.aiMpkSuggestion)
    if (invoice.aiCategorySuggestion) setCategory(invoice.aiCategorySuggestion)
    if (invoice.aiDescription) setDescription(invoice.aiDescription)
  }

  const hasAiSuggestion = invoice.aiMpkSuggestion || invoice.aiCategorySuggestion || invoice.aiDescription

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          <Pencil className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{intl.formatMessage({ id: 'invoices.editClassification' })}</DialogTitle>
          <DialogDescription>{invoice.invoiceNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mpk">{intl.formatMessage({ id: 'invoices.mpk' })}</Label>
            <Select value={mpk} onValueChange={setMpk}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={intl.formatMessage({ id: 'invoices.mpk' })} />
              </SelectTrigger>
              <SelectContent>
                {mpkOptions.map((option) => (
                  <SelectItem key={option.id} value={option.name}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{intl.formatMessage({ id: 'invoices.category' })}</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{intl.formatMessage({ id: 'invoices.description' })}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {hasAiSuggestion && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={applyAiSuggestion}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-1 text-purple-500" />
              {intl.formatMessage({ id: 'invoices.applyAiSuggestion' })}
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {intl.formatMessage({ id: 'common.cancel' })}
          </Button>
          <Button onClick={handleSave} disabled={updateInvoice.isPending}>
            {intl.formatMessage({ id: 'common.save' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
