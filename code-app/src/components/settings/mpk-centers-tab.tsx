import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Loader2,
  Users,
  DollarSign,
  Shield,
  AlertCircle,
  Play,
  Square,
} from 'lucide-react'
import {
  useMpkCenters,
  useCreateMpkCenter,
  useUpdateMpkCenter,
  useDeactivateMpkCenter,
  useApplyApproval,
  useRevokeApproval,
  useMpkApprovers,
  useSetMpkApprovers,
  useMpkBudgetStatus,
  useDvUsers,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { formatNumber } from '@/lib/format'
import type {
  MpkCenter,
  MpkCenterCreate,
  MpkCenterUpdate,
  BudgetPeriod,
  MpkApprover,
  DvSystemUser,
} from '@/lib/types'
import { toast } from 'sonner'

const BUDGET_PERIODS: BudgetPeriod[] = ['Monthly', 'Quarterly', 'HalfYearly', 'Annual']

function BudgetPeriodLabel({ period }: { period: BudgetPeriod }) {
  const intl = useIntl()
  const key = `mpkCenters.period.${period}` as const
  return <>{intl.formatMessage({ id: key })}</>
}

// ── Approvers sub-panel ──────────────────────────────────────────

function ApproversPanel({ mpkCenter }: { mpkCenter: MpkCenter }) {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const { data: approversData, isLoading } = useMpkApprovers(mpkCenter.id)
  const { data: usersData } = useDvUsers(selectedCompany?.id ?? '')
  const setApprovers = useSetMpkApprovers()
  const [editing, setEditing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const approvers = approversData?.approvers ?? []
  const users = usersData?.users ?? []

  const startEdit = () => {
    setSelectedIds(approvers.map((a) => a.systemUserId))
    setEditing(true)
  }

  const handleSave = () => {
    setApprovers.mutate(
      { id: mpkCenter.id, systemUserIds: selectedIds },
      {
        onSuccess: () => {
          toast.success(intl.formatMessage({ id: 'mpkCenters.approversSaved' }))
          setEditing(false)
        },
        onError: (err) => toast.error(err.message),
      }
    )
  }

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  if (isLoading) return <Skeleton className="h-20 w-full" />

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1">
          <Users className="h-3 w-3" />
          {intl.formatMessage({ id: 'mpkCenters.approvers' })} ({approvers.length})
        </span>
        {!editing ? (
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={startEdit}>
            <Edit2 className="h-3 w-3" />
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={handleSave}
              disabled={setApprovers.isPending}
            >
              {setApprovers.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'mpkCenters.noUsers' })}
            </p>
          ) : (
            users.map((u) => (
              <label key={u.systemUserId} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent rounded px-1 py-0.5">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(u.systemUserId)}
                  onChange={() => toggleUser(u.systemUserId)}
                  className="rounded"
                />
                <span>{u.fullName}</span>
                <span className="text-muted-foreground ml-auto">{u.email}</span>
              </label>
            ))
          )}
        </div>
      ) : approvers.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          {intl.formatMessage({ id: 'mpkCenters.noApprovers' })}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {approvers.map((a) => (
            <Badge key={a.id} variant="secondary" className="text-xs">
              {a.fullName}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Budget status sub-panel ──────────────────────────────────────

function BudgetStatusPanel({ mpkCenter }: { mpkCenter: MpkCenter }) {
  const intl = useIntl()
  const { data, isLoading } = useMpkBudgetStatus(mpkCenter.id, {
    enabled: !!mpkCenter.budgetAmount,
  })

  if (!mpkCenter.budgetAmount) return null
  if (isLoading) return <Skeleton className="h-10 w-full" />

  const budget = data?.data
  if (!budget) return null

  const pct = budget.utilizationPercent
  const barColor = budget.isExceeded
    ? 'bg-red-500'
    : budget.isWarning
      ? 'bg-amber-500'
      : 'bg-green-500'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {intl.formatMessage({ id: 'mpkCenters.budgetUtilization' })}
        </span>
        <span className="font-medium">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {intl.formatMessage({ id: 'mpkCenters.utilized' })}: {formatNumber(budget.utilized)} PLN
        </span>
        <span>
          {intl.formatMessage({ id: 'mpkCenters.remaining' })}: {formatNumber(budget.remaining)} PLN
        </span>
      </div>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────

export function MpkCentersTab() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()
  const settingId = selectedCompany?.id ?? ''

  const { data, isLoading } = useMpkCenters(settingId)
  const createMpk = useCreateMpkCenter()
  const updateMpk = useUpdateMpkCenter()
  const deactivateMpk = useDeactivateMpkCenter()
  const applyMutation = useApplyApproval()
  const revokeMutation = useRevokeApproval()

  const centers = data?.mpkCenters ?? []

  // Apply approval state
  const [applyMpkId, setApplyMpkId] = useState<string | null>(null)
  const [applyScope, setApplyScope] = useState<'unprocessed' | 'decided' | 'all'>('unprocessed')

  // Revoke approval state
  const [revokeMpkId, setRevokeMpkId] = useState<string | null>(null)
  const [revokeScope, setRevokeScope] = useState<'pending' | 'decided' | 'all'>('pending')

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MpkCenterCreate & MpkCenterUpdate>({
    name: '',
    settingId,
    description: '',
    approvalRequired: false,
    approvalSlaHours: 24,
    approvalEffectiveFrom: null,
    budgetAmount: undefined,
    budgetPeriod: 'Monthly',
    budgetStartDate: '',
  })

  const resetForm = () => {
    setForm({
      name: '',
      settingId,
      description: '',
      approvalRequired: false,
      approvalSlaHours: 24,
      approvalEffectiveFrom: null,
      budgetAmount: undefined,
      budgetPeriod: 'Monthly',
      budgetStartDate: '',
    })
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (c: MpkCenter) => {
    setForm({
      name: c.name,
      settingId: c.settingId,
      description: c.description ?? '',
      approvalRequired: c.approvalRequired,
      approvalSlaHours: c.approvalSlaHours ?? 24,
      approvalEffectiveFrom: c.approvalEffectiveFrom ?? null,
      budgetAmount: c.budgetAmount,
      budgetPeriod: c.budgetPeriod ?? 'Monthly',
      budgetStartDate: c.budgetStartDate ?? '',
    })
    setEditingId(c.id)
    setShowForm(false)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return

    if (editingId) {
      const { settingId: _s, name, ...rest } = form
      // When disabling approval, clear approval-related fields
      if (!rest.approvalRequired) {
        rest.approvalSlaHours = undefined
        rest.approvalEffectiveFrom = null
      }
      updateMpk.mutate(
        { id: editingId, data: { name, ...rest } },
        {
          onSuccess: () => {
            toast.success(intl.formatMessage({ id: 'mpkCenters.updated' }))
            resetForm()
          },
          onError: (err) => toast.error(err.message),
        }
      )
    } else {
      createMpk.mutate(
        { ...form, settingId } as MpkCenterCreate,
        {
          onSuccess: () => {
            toast.success(intl.formatMessage({ id: 'mpkCenters.created' }))
            resetForm()
          },
          onError: (err) => toast.error(err.message),
        }
      )
    }
  }

  const handleDeactivate = (id: string) => {
    deactivateMpk.mutate(id, {
      onSuccess: () => toast.success(intl.formatMessage({ id: 'mpkCenters.deactivated' })),
      onError: (err) => toast.error(err.message),
    })
  }

  if (!selectedCompany) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          {intl.formatMessage({ id: 'settings.noCompanySelected' })}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {intl.formatMessage({ id: 'mpkCenters.title' })}
          </h2>
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'mpkCenters.subtitle' })}
          </p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          {intl.formatMessage({ id: 'mpkCenters.add' })}
        </Button>
      </div>

      {/* Create / Edit form */}
      {(showForm || editingId) && (
        <Card className="border-primary/50">
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">
                  {intl.formatMessage({ id: 'mpkCenters.name' })} *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder={intl.formatMessage({ id: 'mpkCenters.namePlaceholder' })}
                />
              </div>
              <div>
                <label htmlFor="mpk-description" className="text-xs font-medium mb-1 block">
                  {intl.formatMessage({ id: 'mpkCenters.description' })}
                </label>
                <input
                  id="mpk-description"
                  type="text"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approvalRequired"
                  checked={form.approvalRequired ?? false}
                  onChange={(e) => setForm((f) => ({ ...f, approvalRequired: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="approvalRequired" className="text-sm">
                  <Shield className="h-3 w-3 inline mr-1" />
                  {intl.formatMessage({ id: 'mpkCenters.approvalRequired' })}
                </label>
              </div>
              {form.approvalRequired && (
                <div>
                  <label htmlFor="mpk-sla-hours" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'mpkCenters.slaHours' })}
                  </label>
                  <input
                    id="mpk-sla-hours"
                    type="number"
                    min={1}
                    value={form.approvalSlaHours ?? 24}
                    onChange={(e) => setForm((f) => ({ ...f, approvalSlaHours: parseInt(e.target.value) || 24 }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              )}
              {form.approvalRequired && (
                <div className="col-span-2">
                  <label htmlFor="mpk-effective-from" className="text-xs font-medium mb-1 block">
                    {intl.formatMessage({ id: 'mpkCenters.approvalEffectiveFrom' })}
                  </label>
                  <input
                    id="mpk-effective-from"
                    type="date"
                    value={form.approvalEffectiveFrom ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, approvalEffectiveFrom: e.target.value || null }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {intl.formatMessage({ id: 'mpkCenters.approvalEffectiveFromHint' })}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium mb-1 block">
                  {intl.formatMessage({ id: 'mpkCenters.budgetAmount' })}
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.budgetAmount ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      budgetAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label htmlFor="mpk-budget-period" className="text-xs font-medium mb-1 block">
                  {intl.formatMessage({ id: 'mpkCenters.budgetPeriod' })}
                </label>
                <select
                  id="mpk-budget-period"
                  value={form.budgetPeriod ?? 'Monthly'}
                  onChange={(e) => setForm((f) => ({ ...f, budgetPeriod: e.target.value as BudgetPeriod }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {BUDGET_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {intl.formatMessage({ id: `mpkCenters.period.${p}` })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mpk-budget-start-date" className="text-xs font-medium mb-1 block">
                  {intl.formatMessage({ id: 'mpkCenters.budgetStartDate' })}
                </label>
                <input
                  id="mpk-budget-start-date"
                  type="date"
                  value={form.budgetStartDate ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, budgetStartDate: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" />
                {intl.formatMessage({ id: 'common.cancel' })}
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={createMpk.isPending || updateMpk.isPending || !form.name.trim()}
              >
                {(createMpk.isPending || updateMpk.isPending) && (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-1" />
                {editingId
                  ? intl.formatMessage({ id: 'common.save' })
                  : intl.formatMessage({ id: 'mpkCenters.add' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : centers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {intl.formatMessage({ id: 'mpkCenters.empty' })}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {centers.map((c) => (
            <Card key={c.id} className={!c.isActive ? 'opacity-60' : undefined}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {c.name}
                    {!c.isActive && (
                      <Badge variant="secondary" className="text-xs">
                        {intl.formatMessage({ id: 'mpkCenters.inactive' })}
                      </Badge>
                    )}
                    {c.approvalRequired && (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                        <Shield className="h-3 w-3 mr-0.5" />
                        {intl.formatMessage({ id: 'mpkCenters.approvalRequired' })}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="flex gap-1">
                    {c.approvalRequired && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title={intl.formatMessage({ id: 'mpkCenters.applyApproval' })}
                          onClick={() => {
                            setApplyMpkId(c.id)
                            setApplyScope('unprocessed')
                            setRevokeMpkId(null)
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          title={intl.formatMessage({ id: 'mpkCenters.revokeApproval' })}
                          onClick={() => {
                            setRevokeMpkId(c.id)
                            setRevokeScope('pending')
                            setApplyMpkId(null)
                          }}
                        >
                          <Square className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEdit(c)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    {c.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => handleDeactivate(c.id)}
                        disabled={deactivateMpk.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {c.description && (
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Budget info */}
                {c.budgetAmount != null && (
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      <DollarSign className="h-3 w-3 inline mr-0.5" />
                      {intl.formatMessage({ id: 'mpkCenters.budgetAmount' })}:{' '}
                      <span className="font-medium">{formatNumber(c.budgetAmount)} PLN</span>
                    </span>
                    {c.budgetPeriod && (
                      <span className="text-muted-foreground">
                        <BudgetPeriodLabel period={c.budgetPeriod} />
                      </span>
                    )}
                  </div>
                )}

                <BudgetStatusPanel mpkCenter={c} />

                <Separator />

                <ApproversPanel mpkCenter={c} />

                {/* Apply approval inline panel */}
                {applyMpkId === c.id && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          {intl.formatMessage({ id: 'mpkCenters.applyApproval' })}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setApplyMpkId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'mpkCenters.applyApprovalDesc' })}
                      </p>
                      <select
                        value={applyScope}
                        onChange={(e) => setApplyScope(e.target.value as typeof applyScope)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        aria-label={intl.formatMessage({ id: 'mpkCenters.applyApproval' })}
                      >
                        <option value="unprocessed">{intl.formatMessage({ id: 'mpkCenters.scopeUnprocessed' })}</option>
                        <option value="decided">{intl.formatMessage({ id: 'mpkCenters.scopeDecided' })}</option>
                        <option value="all">{intl.formatMessage({ id: 'mpkCenters.scopeAll' })}</option>
                      </select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={applyMutation.isPending}
                          onClick={() => {
                            applyMutation.mutate(
                              { id: c.id, scope: applyScope, dryRun: true },
                              {
                                onSuccess: (r) =>
                                  toast.info(intl.formatMessage({ id: 'mpkCenters.applyPreviewResult' }, { updated: r.updated, skipped: r.skipped })),
                                onError: (err) => toast.error(err.message),
                              }
                            )
                          }}
                        >
                          {intl.formatMessage({ id: 'mpkCenters.applyDryRun' })}
                        </Button>
                        <Button
                          size="sm"
                          disabled={applyMutation.isPending}
                          onClick={() => {
                            applyMutation.mutate(
                              { id: c.id, scope: applyScope },
                              {
                                onSuccess: (r) => {
                                  toast.success(
                                    intl.formatMessage({ id: 'mpkCenters.applyResult' }, { updated: r.updated, skipped: r.skipped, autoApproved: r.autoApproved })
                                  )
                                  setApplyMpkId(null)
                                },
                                onError: (err) => toast.error(err.message),
                              }
                            )
                          }}
                        >
                          {applyMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {intl.formatMessage({ id: 'mpkCenters.applyExecute' })}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Revoke approval inline panel */}
                {revokeMpkId === c.id && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium flex items-center gap-1">
                          <Square className="h-3 w-3" />
                          {intl.formatMessage({ id: 'mpkCenters.revokeApproval' })}
                        </span>
                        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setRevokeMpkId(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {intl.formatMessage({ id: 'mpkCenters.revokeApprovalDesc' })}
                      </p>
                      <select
                        value={revokeScope}
                        onChange={(e) => setRevokeScope(e.target.value as typeof revokeScope)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        aria-label={intl.formatMessage({ id: 'mpkCenters.revokeApproval' })}
                      >
                        <option value="pending">{intl.formatMessage({ id: 'mpkCenters.scopePending' })}</option>
                        <option value="decided">{intl.formatMessage({ id: 'mpkCenters.scopeDecided' })}</option>
                        <option value="all">{intl.formatMessage({ id: 'mpkCenters.scopeAll' })}</option>
                      </select>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            revokeMutation.mutate(
                              { id: c.id, scope: revokeScope, dryRun: true },
                              {
                                onSuccess: (r) =>
                                  toast.info(intl.formatMessage({ id: 'mpkCenters.revokePreviewResult' }, { updated: r.updated, skipped: r.skipped })),
                                onError: (err) => toast.error(err.message),
                              }
                            )
                          }}
                        >
                          {intl.formatMessage({ id: 'mpkCenters.revokeDryRun' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={revokeMutation.isPending}
                          onClick={() => {
                            revokeMutation.mutate(
                              { id: c.id, scope: revokeScope },
                              {
                                onSuccess: (r) => {
                                  toast.success(
                                    intl.formatMessage({ id: 'mpkCenters.revokeResult' }, { updated: r.updated, skipped: r.skipped })
                                  )
                                  setRevokeMpkId(null)
                                },
                                onError: (err) => toast.error(err.message),
                              }
                            )
                          }}
                        >
                          {revokeMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {intl.formatMessage({ id: 'mpkCenters.revokeExecute' })}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
