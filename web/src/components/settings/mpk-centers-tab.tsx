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
  useMpkApprovers,
  useSetMpkApprovers,
  useMpkBudgetStatus,
  useContextDvUsers,
} from '@/hooks/use-api'
import type { MpkCenter, MpkCenterCreate, MpkCenterUpdate, BudgetPeriod } from '@/lib/api'

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
  const [editBudgetAmount, setEditBudgetAmount] = useState('')
  const [editBudgetPeriod, setEditBudgetPeriod] = useState<BudgetPeriod | ''>('')
  const [editBudgetStartDate, setEditBudgetStartDate] = useState('')

  // Approvers dialog state
  const [approversOpen, setApproversOpen] = useState(false)
  const [approversMpkId, setApproversMpkId] = useState<string | null>(null)

  // Budget dialog state
  const [budgetMpkId, setBudgetMpkId] = useState<string | null>(null)
  const [budgetOpen, setBudgetOpen] = useState(false)

  const mpkCenters = mpkData?.mpkCenters ?? []

  // --- Handlers ---

  function resetCreateForm() {
    setNewName('')
    setNewDescription('')
    setNewApprovalRequired(false)
    setNewSlaHours('')
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
      approvalSlaHours: editSlaHours ? Number(editSlaHours) : undefined,
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
  t,
}: {
  mpk: MpkCenter
  onEdit: () => void
  onDeactivate: () => void
  onApprovers: () => void
  onBudget: () => void
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
        {mpk.budgetAmount && mpk.budgetAmount > 0 ? (
          <button
            onClick={onBudget}
            className="text-left hover:underline"
          >
            <span className="font-mono text-sm">
              {mpk.budgetAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </span>
            <p className="text-xs text-muted-foreground">
              {mpk.budgetPeriod === 'Monthly' && t('monthly')}
              {mpk.budgetPeriod === 'Quarterly' && t('quarterly')}
              {mpk.budgetPeriod === 'HalfYearly' && t('halfYearly')}
              {mpk.budgetPeriod === 'Annual' && t('yearly')}
            </p>
          </button>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={mpk.isActive ? 'default' : 'secondary'}>
          {mpk.isActive ? t('active') : t('inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
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
                  {status.utilized.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} /{' '}
                  {status.budgetAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
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
                  {t('remaining')}: {status.remaining.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
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
