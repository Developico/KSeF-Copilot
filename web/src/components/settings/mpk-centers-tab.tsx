'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Edit,
  Trash2,
  Users,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  Play,
  Square,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserAvatar } from '@/components/ui/user-avatar'
import { useToast } from '@/hooks/use-toast'
import { useCompanyContext } from '@/contexts/company-context'
import {
  useContextMpkCenters,
  useCreateMpkCenter,
  useUpdateMpkCenter,
  useDeactivateMpkCenter,
  useApplyApproval,
  useRevokeApproval,
  useMpkApprovers,
  useSetMpkApprovers,
  useMpkBudgetStatus,
  useContextDvUsers,
} from '@/hooks/use-api'
import type { MpkCenter, MpkCenterCreate, MpkCenterUpdate, BudgetPeriod } from '@/lib/api'
import { formatNumber } from '@/lib/format'

// ---------------------------------------------------------------------------
// MPK Centers Tab
// ---------------------------------------------------------------------------

export function MpkCentersTab() {
  const t = useTranslations('settings.mpkCenters')
  const tCommon = useTranslations('common')
  const { toast } = useToast()
  const { selectedCompany } = useCompanyContext()

  const { data: mpkData, isLoading } = useContextMpkCenters()
  const createMutation = useCreateMpkCenter()
  const updateMutation = useUpdateMpkCenter()
  const deactivateMutation = useDeactivateMpkCenter()

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newApprovalRequired, setNewApprovalRequired] = useState(false)
  const [newSlaHours, setNewSlaHours] = useState('')
  const [newEffectiveFrom, setNewEffectiveFrom] = useState('')
  const [newBudgetAmount, setNewBudgetAmount] = useState('')
  const [newBudgetPeriod, setNewBudgetPeriod] = useState<BudgetPeriod | ''>('')
  const [newBudgetStartDate, setNewBudgetStartDate] = useState('')

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editingMpk, setEditingMpk] = useState<MpkCenter | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editApprovalRequired, setEditApprovalRequired] = useState(false)
  const [editSlaHours, setEditSlaHours] = useState('')
  const [editEffectiveFrom, setEditEffectiveFrom] = useState('')
  const [editBudgetAmount, setEditBudgetAmount] = useState('')
  const [editBudgetPeriod, setEditBudgetPeriod] = useState<BudgetPeriod | ''>('')
  const [editBudgetStartDate, setEditBudgetStartDate] = useState('')

  // Approvers dialog state
  const [approversOpen, setApproversOpen] = useState(false)
  const [approversMpkId, setApproversMpkId] = useState<string | null>(null)

  // Budget dialog state
  const [budgetMpkId, setBudgetMpkId] = useState<string | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)

  // Apply/Revoke approval dialog state
  const [applyMpkId, setApplyMpkId] = useState<string | null>(null)
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyMode, setApplyMode] = useState<'apply' | 'revoke'>('apply')
  const [applyScope, setApplyScope] = useState<'unprocessed' | 'decided' | 'all'>('unprocessed')
  const [revokeScope, setRevokeScope] = useState<'pending' | 'decided' | 'all'>('pending')
  const applyMutation = useApplyApproval()
  const revokeMutation = useRevokeApproval()

  const mpkCenters = mpkData?.mpkCenters ?? []

  // --- Handlers ---

  function resetCreateForm() {
    setNewName('')
    setNewDescription('')
    setNewApprovalRequired(false)
    setNewSlaHours('')
    setNewEffectiveFrom('')
    setNewBudgetAmount('')
    setNewBudgetPeriod('')
    setNewBudgetStartDate('')
  }

  async function handleCreate() {
    if (!selectedCompany?.id || !newName.trim()) return

    const data: MpkCenterCreate = {
      name: newName.trim(),
      settingId: selectedCompany.id,
      description: newDescription.trim() || undefined,
      approvalRequired: newApprovalRequired,
      approvalSlaHours: newSlaHours ? Number(newSlaHours) : undefined,
      approvalEffectiveFrom: newEffectiveFrom || null,
      budgetAmount: newBudgetAmount ? Number(newBudgetAmount) : undefined,
      budgetPeriod: newBudgetPeriod || undefined,
      budgetStartDate: newBudgetStartDate || undefined,
    }

    try {
      await createMutation.mutateAsync(data)
      toast({ title: t('created'), description: t('createdDesc', { name: newName }) })
      resetCreateForm()
      setCreateOpen(false)
    } catch {
      toast({ title: t('createError'), variant: 'destructive' })
    }
  }

  function openEdit(mpk: MpkCenter) {
    setEditingMpk(mpk)
    setEditName(mpk.name)
    setEditDescription(mpk.description ?? '')
    setEditApprovalRequired(mpk.approvalRequired)
    setEditSlaHours(mpk.approvalSlaHours?.toString() ?? '')
    setEditEffectiveFrom(mpk.approvalEffectiveFrom ?? '')
    setEditBudgetAmount(mpk.budgetAmount?.toString() ?? '')
    setEditBudgetPeriod(mpk.budgetPeriod ?? '')
    setEditBudgetStartDate(mpk.budgetStartDate ?? '')
    setEditOpen(true)
  }

  async function handleUpdate() {
    if (!editingMpk) return

    const data: MpkCenterUpdate = {
      name: editName.trim() || undefined,
      description: editDescription.trim() || undefined,
      approvalRequired: editApprovalRequired,
      approvalSlaHours: editApprovalRequired ? (editSlaHours ? Number(editSlaHours) : undefined) : null,
      approvalEffectiveFrom: editApprovalRequired ? (editEffectiveFrom || null) : null,
      budgetAmount: editBudgetAmount ? Number(editBudgetAmount) : undefined,
      budgetPeriod: editBudgetPeriod || undefined,
      budgetStartDate: editBudgetStartDate || undefined,
    }

    try {
      await updateMutation.mutateAsync({ id: editingMpk.id, data })
      toast({ title: t('updated'), description: t('updatedDesc', { name: editName }) })
      setEditOpen(false)
      setEditingMpk(null)
    } catch {
      toast({ title: t('updateError'), variant: 'destructive' })
    }
  }

  async function handleDeactivate(mpk: MpkCenter) {
    try {
      await deactivateMutation.mutateAsync(mpk.id)
      toast({ title: t('deactivated'), description: t('deactivatedDesc', { name: mpk.name }) })
    } catch {
      toast({ title: t('deactivateError'), variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={resetCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              {t('add')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('addTitle')}</DialogTitle>
              <DialogDescription>{t('addDesc')}</DialogDescription>
            </DialogHeader>
            <MpkForm
              name={newName}
              onNameChange={setNewName}
              description={newDescription}
              onDescriptionChange={setNewDescription}
              approvalRequired={newApprovalRequired}
              onApprovalRequiredChange={setNewApprovalRequired}
              slaHours={newSlaHours}
              onSlaHoursChange={setNewSlaHours}
              effectiveFrom={newEffectiveFrom}
              onEffectiveFromChange={setNewEffectiveFrom}
              budgetAmount={newBudgetAmount}
              onBudgetAmountChange={setNewBudgetAmount}
              budgetPeriod={newBudgetPeriod}
              onBudgetPeriodChange={setNewBudgetPeriod}
              budgetStartDate={newBudgetStartDate}
              onBudgetStartDateChange={setNewBudgetStartDate}
              t={t}
            />
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!newName.trim() || createMutation.isPending}>
                {createMutation.isPending ? tCommon('saving') : tCommon('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {mpkCenters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p>{t('noMpkCenters')}</p>
            <p className="text-sm">{t('noMpkCentersDesc')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('nameLabel')}</TableHead>
                  <TableHead>{t('approval')}</TableHead>
                  <TableHead>{t('approversColumn')}</TableHead>
                  <TableHead>{t('budget')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-right">{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mpkCenters.map((mpk) => (
                  <MpkRow
                    key={mpk.id}
                    mpk={mpk}
                    onEdit={() => openEdit(mpk)}
                    onDeactivate={() => handleDeactivate(mpk)}
                    onApprovers={() => {
                      setApproversMpkId(mpk.id)
                      setApproversOpen(true)
                    }}
                    onBudget={() => {
                      setBudgetMpkId(mpk.id)
                      setBudgetOpen(true)
                    }}
                    onApplyApproval={mpk.approvalRequired ? () => {
                      setApplyMpkId(mpk.id)
                      setApplyMode('apply')
                      setApplyScope('unprocessed')
                      setApplyOpen(true)
                    } : undefined}
                    onRevokeApproval={mpk.approvalRequired ? () => {
                      setApplyMpkId(mpk.id)
                      setApplyMode('revoke')
                      setRevokeScope('pending')
                      setApplyOpen(true)
                    } : undefined}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('editTitle')}</DialogTitle>
          </DialogHeader>
          <MpkForm
            name={editName}
            onNameChange={setEditName}
            description={editDescription}
            onDescriptionChange={setEditDescription}
            approvalRequired={editApprovalRequired}
            onApprovalRequiredChange={setEditApprovalRequired}
            slaHours={editSlaHours}
            onSlaHoursChange={setEditSlaHours}
            effectiveFrom={editEffectiveFrom}
            onEffectiveFromChange={setEditEffectiveFrom}
            budgetAmount={editBudgetAmount}
            onBudgetAmountChange={setEditBudgetAmount}
            budgetPeriod={editBudgetPeriod}
            onBudgetPeriodChange={setEditBudgetPeriod}
            budgetStartDate={editBudgetStartDate}
            onBudgetStartDateChange={setEditBudgetStartDate}
            t={t}
          />
          <DialogFooter>
            <Button onClick={handleUpdate} disabled={!editName.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? tCommon('saving') : tCommon('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approvers dialog */}
      <ApproversDialog
        open={approversOpen}
        onOpenChange={setApproversOpen}
        mpkId={approversMpkId}
      />

      {/* Budget status dialog */}
      <BudgetStatusDialog
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        mpkId={budgetMpkId}
      />

      {/* Apply / Revoke approval dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{applyMode === 'apply' ? t('applyApproval') : t('revokeApproval')}</DialogTitle>
            <DialogDescription>{applyMode === 'apply' ? t('applyApprovalDesc') : t('revokeApprovalDesc')}</DialogDescription>
          </DialogHeader>

          {applyMode === 'apply' ? (
            <>
              <div className="space-y-3">
                <Label>{t('applyApprovalScope')}</Label>
                <Select value={applyScope} onValueChange={(v) => setApplyScope(v as typeof applyScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unprocessed">{t('scopeUnprocessed')}</SelectItem>
                    <SelectItem value="decided">{t('scopeDecided')}</SelectItem>
                    <SelectItem value="all">{t('scopeAll')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {applyScope === 'unprocessed' && t('scopeUnprocessedDesc')}
                  {applyScope === 'decided' && t('scopeDecidedDesc')}
                  {applyScope === 'all' && t('scopeAllDesc')}
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={applyMutation.isPending}
                  onClick={() => {
                    if (!applyMpkId) return
                    applyMutation.mutate(
                      { id: applyMpkId, scope: applyScope, dryRun: true },
                      {
                        onSuccess: (result) => {
                          toast({
                            title: t('applyDryRun'),
                            description: t('applyPreviewResult', {
                              updated: result.updated,
                              skipped: result.skipped,
                              autoApproved: result.autoApproved,
                              total: result.total,
                            }),
                          })
                        },
                        onError: () => toast({ title: t('applyError'), variant: 'destructive' }),
                      }
                    )
                  }}
                >
                  {t('applyDryRun')}
                </Button>
                <Button
                  disabled={applyMutation.isPending}
                  onClick={() => {
                    if (!applyMpkId) return
                    applyMutation.mutate(
                      { id: applyMpkId, scope: applyScope },
                      {
                        onSuccess: (result) => {
                          toast({
                            title: t('applySuccess'),
                            description: t('applyResult', {
                              updated: result.updated,
                              skipped: result.skipped,
                              autoApproved: result.autoApproved,
                              total: result.total,
                            }),
                          })
                          setApplyOpen(false)
                        },
                        onError: () => toast({ title: t('applyError'), variant: 'destructive' }),
                      }
                    )
                  }}
                >
                  {t('applyExecute')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <Label>{t('revokeScope')}</Label>
                <Select value={revokeScope} onValueChange={(v) => setRevokeScope(v as typeof revokeScope)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('scopePending')}</SelectItem>
                    <SelectItem value="decided">{t('scopeDecided')}</SelectItem>
                    <SelectItem value="all">{t('scopeAll')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {revokeScope === 'pending' && t('scopePendingDesc')}
                  {revokeScope === 'decided' && t('revokeDecidedDesc')}
                  {revokeScope === 'all' && t('revokeAllDesc')}
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  disabled={revokeMutation.isPending}
                  onClick={() => {
                    if (!applyMpkId) return
                    revokeMutation.mutate(
                      { id: applyMpkId, scope: revokeScope, dryRun: true },
                      {
                        onSuccess: (result) => {
                          toast({
                            title: t('revokeDryRun'),
                            description: t('revokePreviewResult', {
                              updated: result.updated,
                              skipped: result.skipped,
                              total: result.total,
                            }),
                          })
                        },
                        onError: () => toast({ title: t('revokeError'), variant: 'destructive' }),
                      }
                    )
                  }}
                >
                  {t('revokeDryRun')}
                </Button>
                <Button
                  variant="destructive"
                  disabled={revokeMutation.isPending}
                  onClick={() => {
                    if (!applyMpkId) return
                    revokeMutation.mutate(
                      { id: applyMpkId, scope: revokeScope },
                      {
                        onSuccess: (result) => {
                          toast({
                            title: t('revokeSuccess'),
                            description: t('revokeResult', {
                              updated: result.updated,
                              skipped: result.skipped,
                              total: result.total,
                            }),
                          })
                          setApplyOpen(false)
                        },
                        onError: () => toast({ title: t('revokeError'), variant: 'destructive' }),
                      }
                    )
                  }}
                >
                  {t('revokeExecute')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MpkFormProps {
  name: string
  onNameChange: (v: string) => void
  description: string
  onDescriptionChange: (v: string) => void
  approvalRequired: boolean
  onApprovalRequiredChange: (v: boolean) => void
  slaHours: string
  onSlaHoursChange: (v: string) => void
  effectiveFrom: string
  onEffectiveFromChange: (v: string) => void
  budgetAmount: string
  onBudgetAmountChange: (v: string) => void
  budgetPeriod: BudgetPeriod | ''
  onBudgetPeriodChange: (v: BudgetPeriod | '') => void
  budgetStartDate: string
  onBudgetStartDateChange: (v: string) => void
  t: ReturnType<typeof useTranslations>
}

function MpkForm({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  approvalRequired,
  onApprovalRequiredChange,
  slaHours,
  onSlaHoursChange,
  effectiveFrom,
  onEffectiveFromChange,
  budgetAmount,
  onBudgetAmountChange,
  budgetPeriod,
  onBudgetPeriodChange,
  budgetStartDate,
  onBudgetStartDateChange,
  t,
}: MpkFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('nameLabel')}</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('namePlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('descriptionLabel')}</Label>
        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
        />
      </div>

      {/* Approval settings */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="approvalRequired"
          checked={approvalRequired}
          onCheckedChange={(checked) => onApprovalRequiredChange(checked === true)}
        />
        <Label htmlFor="approvalRequired">{t('approvalRequired')}</Label>
      </div>

      {approvalRequired && (
        <div className="space-y-2 pl-6">
          <Label>{t('slaHours')}</Label>
          <Input
            type="number"
            min="1"
            value={slaHours}
            onChange={(e) => onSlaHoursChange(e.target.value)}
            placeholder={t('slaHoursPlaceholder')}
          />
          <Label>{t('approvalEffectiveFrom')}</Label>
          <Input
            type="date"
            value={effectiveFrom}
            onChange={(e) => onEffectiveFromChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">{t('approvalEffectiveFromHint')}</p>
        </div>
      )}

      {/* Budget settings */}
      <div className="space-y-2">
        <Label>{t('budgetAmount')}</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={budgetAmount}
          onChange={(e) => onBudgetAmountChange(e.target.value)}
          placeholder={t('budgetAmountPlaceholder')}
        />
      </div>

      {budgetAmount && Number(budgetAmount) > 0 && (
        <>
          <div className="space-y-2">
            <Label>{t('budgetPeriod')}</Label>
            <Select
              value={budgetPeriod}
              onValueChange={(v) => onBudgetPeriodChange(v as BudgetPeriod)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('budgetPeriodPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Monthly">{t('monthly')}</SelectItem>
                <SelectItem value="Quarterly">{t('quarterly')}</SelectItem>
                <SelectItem value="HalfYearly">{t('halfYearly')}</SelectItem>
                <SelectItem value="Annual">{t('yearly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t('budgetStartDate')}</Label>
            <Input
              type="date"
              value={budgetStartDate}
              onChange={(e) => onBudgetStartDateChange(e.target.value)}
            />
          </div>
        </>
      )}
    </div>
  )
}

function MpkRow({
  mpk,
  onEdit,
  onDeactivate,
  onApprovers,
  onBudget,
  onApplyApproval,
  onRevokeApproval,
  t,
}: {
  mpk: MpkCenter
  onEdit: () => void
  onDeactivate: () => void
  onApprovers: () => void
  onBudget: () => void
  onApplyApproval?: () => void
  onRevokeApproval?: () => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <TableRow>
      <TableCell>
        <div>
          <span className="font-medium">{mpk.name}</span>
          {mpk.description && (
            <p className="text-sm text-muted-foreground">{mpk.description}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {mpk.approvalRequired ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="default" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  {t('required')}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {mpk.approvalSlaHours
                  ? t('slaInfo', { hours: mpk.approvalSlaHours })
                  : t('noSla')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Badge variant="outline">{t('notRequired')}</Badge>
        )}
      </TableCell>
      <TableCell>
        <ApproversCell mpkId={mpk.id} onManage={onApprovers} t={t} />
      </TableCell>
      <TableCell>
        <BudgetCell mpk={mpk} onBudget={onBudget} t={t} />
      </TableCell>
      <TableCell>
        <Badge variant={mpk.isActive ? 'default' : 'secondary'}>
          {mpk.isActive ? t('active') : t('inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {mpk.approvalRequired && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onApprovers}>
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('manageApprovers')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onApplyApproval && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onApplyApproval}>
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('applyApproval')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onRevokeApproval && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onRevokeApproval}>
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('revokeApproval')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          {mpk.isActive && (
            <Button variant="ghost" size="icon" onClick={onDeactivate}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ---------------------------------------------------------------------------
// Budget Cell (mini progress bar + hover popover)
// ---------------------------------------------------------------------------

function BudgetCell({
  mpk,
  onBudget,
  t,
}: {
  mpk: MpkCenter
  onBudget: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const { data, isLoading } = useMpkBudgetStatus(mpk.id)

  if (!mpk.budgetAmount || mpk.budgetAmount <= 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const periodLabel =
    mpk.budgetPeriod === 'Monthly' ? t('monthly')
    : mpk.budgetPeriod === 'Quarterly' ? t('quarterly')
    : mpk.budgetPeriod === 'HalfYearly' ? t('halfYearly')
    : mpk.budgetPeriod === 'Annual' ? t('yearly')
    : ''

  const budget = data?.data
  const pct = budget?.utilizationPercent ?? 0
  const progressClass = budget?.isExceeded
    ? '[&>div]:bg-red-500'
    : budget?.isWarning
      ? '[&>div]:bg-amber-500'
      : '[&>div]:bg-emerald-500'

  const content = (
    <button onClick={onBudget} className="text-left w-full min-w-[140px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-sm">
          {formatNumber(mpk.budgetAmount, 'pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} PLN
        </span>
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-1.5 w-full mt-1.5 rounded-full" />
      ) : budget ? (
        <div className="mt-1.5 space-y-0.5">
          <Progress value={Math.min(pct, 100)} className={`h-1.5 ${progressClass}`} />
          <span className="text-[10px] text-muted-foreground font-mono">{pct.toFixed(0)}%</span>
        </div>
      ) : null}
    </button>
  )

  if (!budget) return content

  return (
    <Popover>
      <PopoverTrigger asChild>{content}</PopoverTrigger>
      <PopoverContent className="w-64 p-3" side="bottom" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t('budgetStatusTitle')}</span>
            {budget.isExceeded && (
              <Badge variant="destructive" className="text-[10px] px-1.5">{t('budgetExceeded')}</Badge>
            )}
            {!budget.isExceeded && budget.isWarning && (
              <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-800">{t('budgetWarning')}</Badge>
            )}
          </div>
          <Progress value={Math.min(pct, 100)} className={`h-2 ${progressClass}`} />
          <div className="flex justify-between text-xs">
            <span className="font-mono font-medium">{pct.toFixed(1)}%</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <span className="text-muted-foreground">{t('utilized')}:</span>
            <span className="text-right font-mono">{formatNumber(budget.utilized)} PLN</span>
            <span className="text-muted-foreground">{t('remaining')}:</span>
            <span className="text-right font-mono">{formatNumber(budget.remaining)} PLN</span>
            <span className="text-muted-foreground">{t('invoiceCountLabel')}:</span>
            <span className="text-right font-mono">{budget.invoiceCount}</span>
            <span className="text-muted-foreground">{t('periodRange')}:</span>
            <span className="text-right text-[10px]">
              {new Date(budget.periodStart).toLocaleDateString('pl-PL')} – {new Date(budget.periodEnd).toLocaleDateString('pl-PL')}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// Approvers Cell (avatar row in table)
// ---------------------------------------------------------------------------

function ApproversCell({
  mpkId,
  onManage,
  t,
}: {
  mpkId: string
  onManage: () => void
  t: ReturnType<typeof useTranslations>
}) {
  const { data, isLoading } = useMpkApprovers(mpkId)
  const approvers = data?.approvers ?? []

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">…</span>
  }

  if (approvers.length === 0) {
    return (
      <button
        onClick={onManage}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {t('noApprovers')}
      </button>
    )
  }

  const maxVisible = 3
  const visible = approvers.slice(0, maxVisible)
  const remaining = approvers.length - maxVisible

  return (
    <button onClick={onManage} className="flex items-center -space-x-2 hover:opacity-80">
      <TooltipProvider>
        {visible.map((a) => (
          <Tooltip key={a.systemUserId}>
            <TooltipTrigger asChild>
              <span>
                <UserAvatar
                  userId={a.azureObjectId || undefined}
                  name={a.fullName}
                  email={a.email}
                  size="md"
                  className="border-2 border-background"
                  showLoading={false}
                />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-medium text-sm">{a.fullName}</p>
              {a.email && <p className="text-xs text-muted-foreground">{a.email}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
        {remaining > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="size-8 border-2 border-background">
                <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                  +{remaining}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top">
              {approvers.slice(maxVisible).map((a) => (
                <p key={a.systemUserId} className="text-sm">{a.fullName}</p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Approvers Dialog
// ---------------------------------------------------------------------------

function ApproversDialog({
  open,
  onOpenChange,
  mpkId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mpkId: string | null
}) {
  const t = useTranslations('settings.mpkCenters')
  const tCommon = useTranslations('common')
  const { toast } = useToast()

  const { data: approversData, isLoading: loadingApprovers } = useMpkApprovers(mpkId ?? undefined)
  const { data: usersData, isLoading: loadingUsers } = useContextDvUsers()
  const setApproversMutation = useSetMpkApprovers()

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  // Initialize selection when data loads
  if (approversData && !initialized) {
    setSelectedUserIds(approversData.approvers.map((a) => a.systemUserId))
    setInitialized(true)
  }

  // Reset when dialog closes
  function handleOpenChange(v: boolean) {
    if (!v) {
      setInitialized(false)
      setSelectedUserIds([])
    }
    onOpenChange(v)
  }

  function toggleUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  async function handleSave() {
    if (!mpkId) return
    try {
      await setApproversMutation.mutateAsync({ mpkId, systemUserIds: selectedUserIds })
      toast({ title: t('approversSaved') })
      handleOpenChange(false)
    } catch {
      toast({ title: t('approversSaveError'), variant: 'destructive' })
    }
  }

  const users = usersData?.users ?? []
  const isLoading = loadingApprovers || loadingUsers

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('approversTitle')}</DialogTitle>
          <DialogDescription>{t('approversDesc')}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center py-4 text-muted-foreground">{tCommon('loading')}</p>
        ) : users.length === 0 ? (
          <p className="text-center py-4 text-muted-foreground">{t('noUsers')}</p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {users.map((user) => (
              <div
                key={user.systemUserId}
                className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedUserIds.includes(user.systemUserId)}
                  onCheckedChange={() => toggleUser(user.systemUserId)}
                />
                <div>
                  <p className="text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={setApproversMutation.isPending}>
            {setApproversMutation.isPending ? tCommon('saving') : tCommon('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Budget Status Dialog
// ---------------------------------------------------------------------------

function BudgetStatusDialog({
  open,
  onOpenChange,
  mpkId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mpkId: string | null
}) {
  const t = useTranslations('settings.mpkCenters')
  const tCommon = useTranslations('common')
  const { data, isLoading } = useMpkBudgetStatus(mpkId ?? undefined)

  const status = data?.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t('budgetStatusTitle')}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center py-4 text-muted-foreground">{tCommon('loading')}</p>
        ) : !status ? (
          <p className="text-center py-4 text-muted-foreground">{t('noBudgetData')}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>{t('periodRange')}</span>
              <span className="font-medium">
                {new Date(status.periodStart).toLocaleDateString()} –{' '}
                {new Date(status.periodEnd).toLocaleDateString()}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('utilized')}</span>
                <span className="font-mono">
                  {formatNumber(status.utilized, 'pl-PL', { minimumFractionDigits: 2 })} /{' '}
                  {formatNumber(status.budgetAmount, 'pl-PL', { minimumFractionDigits: 2 })} PLN
                </span>
              </div>
              <Progress
                value={Math.min(status.utilizationPercent, 100)}
                className={
                  status.isExceeded
                    ? '[&>div]:bg-destructive'
                    : status.isWarning
                      ? '[&>div]:bg-yellow-500'
                      : ''
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{status.utilizationPercent.toFixed(1)}%</span>
                <span>
                  {t('remaining')}: {formatNumber(status.remaining, 'pl-PL', { minimumFractionDigits: 2 })} PLN
                </span>
              </div>
            </div>

            {status.isExceeded && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                {t('budgetExceeded')}
              </div>
            )}
            {status.isWarning && !status.isExceeded && (
              <div className="flex items-center gap-2 text-yellow-600 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {t('budgetWarning')}
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span>{t('invoiceCountLabel')}</span>
              <span className="font-medium">{status.invoiceCount}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
