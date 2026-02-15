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
import { Pencil, Sparkles } from 'lucide-react'
import { useUpdateInvoice } from '@/hooks/use-api'
import { toast } from 'sonner'
import type { Invoice } from '@/lib/types'

interface ClassificationEditDialogProps {
  invoice: Invoice
}

export function ClassificationEditDialog({ invoice }: ClassificationEditDialogProps) {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const [mpk, setMpk] = useState(invoice.mpk ?? '')
  const [category, setCategory] = useState(invoice.category ?? '')
  const [description, setDescription] = useState(invoice.description ?? '')
  const [project, setProject] = useState(invoice.project ?? '')

  const updateInvoice = useUpdateInvoice()

  useEffect(() => {
    if (open) {
      setMpk(invoice.mpk ?? '')
      setCategory(invoice.category ?? '')
      setDescription(invoice.description ?? '')
      setProject(invoice.project ?? '')
    }
  }, [open, invoice])

  function handleSave() {
    updateInvoice.mutate(
      { id: invoice.id, data: { mpk, category, description, project } },
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-1" />
          {intl.formatMessage({ id: 'common.edit' })}
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
            <Input id="mpk" value={mpk} onChange={(e) => setMpk(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">{intl.formatMessage({ id: 'invoices.category' })}</Label>
            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project">{intl.formatMessage({ id: 'invoices.project' })}</Label>
            <Input id="project" value={project} onChange={(e) => setProject(e.target.value)} />
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
