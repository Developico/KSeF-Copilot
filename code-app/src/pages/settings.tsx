import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Building2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
  Edit2,
  Save,
  X,
  Beaker,
  Activity,
  CircleDot,
} from 'lucide-react'
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useUpdateCompany,
  useTestToken,
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useGenerateTestData,
  useKsefCleanupPreview,
  useKsefCleanup,
  useHealthDetailed,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import type { KsefSetting, CostCenter, ServiceStatus } from '@/lib/types'

// ── Token status badge ───────────────────────────────────────────

function TokenStatus({ setting }: { setting: KsefSetting }) {
  switch (setting.tokenStatus) {
    case 'valid':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Token OK</Badge>
    case 'expiring':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Expiring</Badge>
    case 'expired':
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Expired</Badge>
    default:
      return <Badge variant="secondary">—</Badge>
  }
}

// ── Service status indicator ────────────────────────────────────

function ServiceStatusDot({ status }: { status: ServiceStatus['status'] }) {
  const color =
    status === 'healthy'
      ? 'text-green-500'
      : status === 'degraded'
        ? 'text-amber-500'
        : 'text-red-500'
  return <CircleDot className={`h-4 w-4 ${color}`} />
}

// ── Main page ────────────────────────────────────────────────────

export function SettingsPage() {
  const intl = useIntl()
  const { selectedCompany } = useCompanyContext()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {intl.formatMessage({ id: 'settings.title' })}
        </h1>
        <p className="text-muted-foreground">
          {intl.formatMessage({ id: 'settings.subtitle' })}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="companies">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="companies">
            {intl.formatMessage({ id: 'settings.companies' })}
          </TabsTrigger>
          <TabsTrigger value="costCenters">
            {intl.formatMessage({ id: 'settings.costCenters' })}
          </TabsTrigger>
          <TabsTrigger value="testData">
            {intl.formatMessage({ id: 'settings.testData' })}
          </TabsTrigger>
          <TabsTrigger value="systemStatus">
            {intl.formatMessage({ id: 'settings.systemStatus' })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-4">
          <CompaniesTab />
        </TabsContent>

        <TabsContent value="costCenters" className="mt-4">
          <CostCentersTab />
        </TabsContent>

        <TabsContent value="testData" className="mt-4">
          <TestDataTab nip={selectedCompany?.nip} companyId={selectedCompany?.id} />
        </TabsContent>

        <TabsContent value="systemStatus" className="mt-4">
          <SystemStatusTab environment={selectedCompany?.environment} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 1: Companies
// ══════════════════════════════════════════════════════════════════

function CompaniesTab() {
  const intl = useIntl()
  const { data: companiesData, isLoading } = useCompanies()
  const createCompany = useCreateCompany()
  const deleteCompany = useDeleteCompany()
  const updateCompany = useUpdateCompany()
  const testToken = useTestToken()

  const companies = companiesData?.settings ?? []

  // New company form
  const [showForm, setShowForm] = useState(false)
  const [formNip, setFormNip] = useState('')
  const [formName, setFormName] = useState('')
  const [formEnv, setFormEnv] = useState<'test' | 'demo' | 'production'>('production')

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrefix, setEditPrefix] = useState('')

  function startEdit(company: KsefSetting) {
    setEditingId(company.id)
    setEditName(company.companyName)
    setEditPrefix(company.invoicePrefix ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditPrefix('')
  }

  function saveEdit(id: string) {
    updateCompany.mutate(
      { id, data: { companyName: editName, invoicePrefix: editPrefix || undefined } },
      { onSuccess: () => cancelEdit() }
    )
  }

  function handleCreate() {
    if (!formNip.trim() || !formName.trim()) return
    createCompany.mutate(
      { nip: formNip.trim(), companyName: formName.trim(), environment: formEnv },
      {
        onSuccess: () => {
          setShowForm(false)
          setFormNip('')
          setFormName('')
        },
      }
    )
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)
  function handleDelete(id: string) {
    setDeletingId(id)
    deleteCompany.mutate(id, { onSettled: () => setDeletingId(null) })
  }

  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ id: string; success: boolean } | null>(null)
  function handleTest(id: string) {
    setTestingId(id)
    setTestResult(null)
    testToken.mutate(id, {
      onSuccess: (result) => setTestResult({ id, success: result.success }),
      onSettled: () => setTestingId(null),
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {intl.formatMessage({ id: 'settings.companies' })}
            </CardTitle>
            <CardDescription>
              {intl.formatMessage({ id: 'settings.companiesDescription' })}
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'settings.addCompany' })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add company form */}
        {showForm && (
          <div className="mb-4 rounded-md border p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'settings.companyName' })}
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="ACME Sp. z o.o."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'settings.nip' })}
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  placeholder="1234567890"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'settings.environment' })}
                </label>
                <select
                  value={formEnv}
                  onChange={(e) => setFormEnv(e.target.value as typeof formEnv)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="production">{intl.formatMessage({ id: 'settings.production' })}</option>
                  <option value="test">{intl.formatMessage({ id: 'settings.test' })}</option>
                  <option value="demo">{intl.formatMessage({ id: 'settings.demo' })}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={createCompany.isPending || !formNip.trim() || !formName.trim()}
              >
                {createCompany.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {intl.formatMessage({ id: 'common.save' })}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {intl.formatMessage({ id: 'common.cancel' })}
              </Button>
            </div>
            {createCompany.isError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{createCompany.error.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Company list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {intl.formatMessage({ id: 'settings.noCompanies' })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {intl.formatMessage({ id: 'settings.noCompaniesDesc' })}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                {editingId === company.id ? (
                  /* Inline edit mode */
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        placeholder={intl.formatMessage({ id: 'settings.companyName' })}
                      />
                      <input
                        type="text"
                        value={editPrefix}
                        onChange={(e) => setEditPrefix(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                        placeholder={intl.formatMessage({ id: 'settings.invoicePrefix' })}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(company.id)}
                        disabled={updateCompany.isPending}
                      >
                        {updateCompany.isPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          : <Save className="h-3.5 w-3.5 mr-1" />}
                        {intl.formatMessage({ id: 'common.save' })}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5 mr-1" />
                        {intl.formatMessage({ id: 'common.cancel' })}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{company.companyName}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {company.environment}
                        </Badge>
                        {company.isActive && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs shrink-0">
                            Active
                          </Badge>
                        )}
                        {company.invoicePrefix && (
                          <Badge variant="secondary" className="text-xs font-mono shrink-0">
                            {company.invoicePrefix}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        NIP: {company.nip}
                        {company.lastSyncAt && (
                          <span className="ml-3">
                            {intl.formatMessage({ id: 'dashboard.lastSync' })}: {new Date(company.lastSyncAt).toLocaleDateString('pl-PL')}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <TokenStatus setting={company} />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(company)}
                        title={intl.formatMessage({ id: 'settings.editCompany' })}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(company.id)}
                        disabled={testingId === company.id}
                        title="Test token"
                      >
                        {testingId === company.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Shield className="h-3.5 w-3.5" />}
                        <span className="ml-1">Test</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(company.id)}
                        disabled={deletingId === company.id}
                        title={intl.formatMessage({ id: 'common.delete' })}
                      >
                        {deletingId === company.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                      {testResult?.id === company.id && (
                        <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.success ? <CheckCircle2 className="h-4 w-4 inline" /> : <AlertCircle className="h-4 w-4 inline" />}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 2: Cost Centers
// ══════════════════════════════════════════════════════════════════

function CostCentersTab() {
  const intl = useIntl()
  const { data: costCentersData, isLoading } = useCostCenters()
  const createCostCenter = useCreateCostCenter()
  const updateCostCenter = useUpdateCostCenter()
  const deleteCostCenter = useDeleteCostCenter()

  const costCenters = costCentersData?.costCenters ?? []

  // New cost center form
  const [showForm, setShowForm] = useState(false)
  const [formCode, setFormCode] = useState('')
  const [formCcName, setFormCcName] = useState('')

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCode, setEditCode] = useState('')
  const [editCcName, setEditCcName] = useState('')

  function handleCreate() {
    if (!formCode.trim() || !formCcName.trim()) return
    createCostCenter.mutate(
      { code: formCode.trim(), name: formCcName.trim() },
      {
        onSuccess: () => {
          setShowForm(false)
          setFormCode('')
          setFormCcName('')
        },
      }
    )
  }

  function startCcEdit(cc: CostCenter) {
    setEditingId(cc.id)
    setEditCode(cc.code)
    setEditCcName(cc.name)
  }

  function cancelCcEdit() {
    setEditingId(null)
    setEditCode('')
    setEditCcName('')
  }

  function saveCcEdit(id: string) {
    updateCostCenter.mutate(
      { id, data: { code: editCode, name: editCcName } },
      { onSuccess: () => cancelCcEdit() }
    )
  }

  const [deletingId, setDeletingId] = useState<string | null>(null)
  function handleDeleteCc(id: string) {
    setDeletingId(id)
    deleteCostCenter.mutate(id, { onSettled: () => setDeletingId(null) })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CircleDot className="h-5 w-5" />
            {intl.formatMessage({ id: 'settings.costCenters' })}
          </CardTitle>
          <Button onClick={() => setShowForm((v) => !v)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'settings.addCostCenter' })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add cost center form */}
        {showForm && (
          <div className="mb-4 rounded-md border p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'settings.costCenterCode' })}
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="CC-001"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  {intl.formatMessage({ id: 'settings.costCenterName' })}
                </label>
                <input
                  type="text"
                  value={formCcName}
                  onChange={(e) => setFormCcName(e.target.value)}
                  placeholder="Marketing"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={createCostCenter.isPending || !formCode.trim() || !formCcName.trim()}
              >
                {createCostCenter.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {intl.formatMessage({ id: 'common.save' })}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                {intl.formatMessage({ id: 'common.cancel' })}
              </Button>
            </div>
          </div>
        )}

        {/* Cost center list */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : costCenters.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {intl.formatMessage({ id: 'common.none' })}
          </p>
        ) : (
          <div className="space-y-1">
            {costCenters.map((cc) => (
              <div key={cc.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                {editingId === cc.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-24 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono"
                    />
                    <input
                      type="text"
                      value={editCcName}
                      onChange={(e) => setEditCcName(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    />
                    <Button
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => saveCcEdit(cc.id)}
                      disabled={updateCostCenter.isPending}
                    >
                      {updateCostCenter.isPending
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Save className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelCcEdit}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{cc.code}</span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm">{cc.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={cc.isActive ? 'default' : 'secondary'} className="text-xs">
                        {cc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startCcEdit(cc)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteCc(cc.id)}
                        disabled={deletingId === cc.id}
                      >
                        {deletingId === cc.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 3: Test Data Generator
// ══════════════════════════════════════════════════════════════════

function TestDataTab({ nip, companyId }: { nip?: string; companyId?: string }) {
  const intl = useIntl()
  const generateTestData = useGenerateTestData()
  const cleanupMutation = useKsefCleanup()

  const [count, setCount] = useState(10)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [paidPct, setPaidPct] = useState(50)
  const [ksefPct, setKsefPct] = useState(70)

  const { data: cleanupPreview, refetch: fetchCleanup } = useKsefCleanupPreview(
    nip ?? '',
    { fromDate: fromDate || undefined, toDate: toDate || undefined },
    { enabled: false }
  )

  function handleGenerate() {
    if (!nip) return
    generateTestData.mutate({
      nip,
      companyId,
      count,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      paidPercentage: paidPct,
      ksefPercentage: ksefPct,
    })
  }

  function handleCleanup() {
    if (!nip) return
    cleanupMutation.mutate({
      nip,
      companyId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Beaker className="h-5 w-5" />
          {intl.formatMessage({ id: 'settings.testData' })}
        </CardTitle>
        <CardDescription>
          {intl.formatMessage({ id: 'settings.testDataDescription' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!nip ? (
          <p className="text-muted-foreground text-sm">
            {intl.formatMessage({ id: 'settings.noCompanies' })}
          </p>
        ) : (
          <>
            {/* Count slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {intl.formatMessage({ id: 'settings.testDataCount' })}
                </label>
                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{count}</span>
              </div>
              <Slider
                min={1}
                max={100}
                step={1}
                value={[count]}
                onValueChange={([v]) => setCount(v)}
              />
            </div>

            {/* Date range */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {intl.formatMessage({ id: 'sync.dateFrom' })}
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  {intl.formatMessage({ id: 'sync.dateTo' })}
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Paid percentage slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {intl.formatMessage({ id: 'settings.paidPercentage' })}
                </label>
                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{paidPct}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[paidPct]}
                onValueChange={([v]) => setPaidPct(v)}
              />
            </div>

            {/* KSeF percentage slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  {intl.formatMessage({ id: 'settings.ksefPercentage' })}
                </label>
                <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">{ksefPct}%</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[ksefPct]}
                onValueChange={([v]) => setKsefPct(v)}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerate}
                disabled={generateTestData.isPending}
              >
                {generateTestData.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {intl.formatMessage({ id: 'settings.generateTestData' })}
              </Button>
              <Button
                variant="outline"
                onClick={() => void fetchCleanup()}
              >
                {intl.formatMessage({ id: 'settings.cleanupPreview' })}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCleanup}
                disabled={cleanupMutation.isPending}
              >
                {cleanupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {intl.formatMessage({ id: 'settings.cleanupData' })}
              </Button>
            </div>

            {/* Generate result */}
            {generateTestData.isSuccess && generateTestData.data && (
              <div className="rounded-md border border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    {intl.formatMessage({ id: 'settings.testDataGenerated' })}
                  </span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {intl.formatMessage(
                    { id: 'settings.testDataGeneratedDesc' },
                    {
                      created: generateTestData.data.summary.created,
                      paid: generateTestData.data.summary.paid,
                    }
                  )}
                </p>
              </div>
            )}

            {generateTestData.isError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{generateTestData.error.message}</span>
              </div>
            )}

            {/* Cleanup preview */}
            {cleanupPreview && (
              <div className="rounded-md border p-4 space-y-2">
                <p className="text-sm font-medium">
                  {intl.formatMessage({ id: 'settings.cleanupPreviewTitle' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage(
                    { id: 'settings.cleanupPreviewDesc' },
                    { total: cleanupPreview.total }
                  )}
                </p>
                {cleanupPreview.bySource && Object.entries(cleanupPreview.bySource).length > 0 && (
                  <div className="flex gap-3 text-xs">
                    {Object.entries(cleanupPreview.bySource).map(([source, count]) => (
                      <Badge key={source} variant="outline">
                        {source}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
                {cleanupPreview.warning && (
                  <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{cleanupPreview.warning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cleanup result */}
            {cleanupMutation.isSuccess && cleanupMutation.data && (
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {intl.formatMessage(
                    { id: 'settings.cleanupDone' },
                    { deleted: cleanupMutation.data.deleted ?? 0 }
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ══════════════════════════════════════════════════════════════════
// TAB 4: System Status
// ══════════════════════════════════════════════════════════════════

function SystemStatusTab({ environment }: { environment?: string }) {
  const intl = useIntl()
  const { data: health, isLoading, refetch } = useHealthDetailed(environment)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {intl.formatMessage({ id: 'settings.systemStatus' })}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {intl.formatMessage({ id: 'common.refresh' })}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !health ? (
          <p className="text-muted-foreground text-sm">
            {intl.formatMessage({ id: 'settings.noHealthData' })}
          </p>
        ) : (
          <div className="space-y-4">
            {/* Overall status */}
            <div className="flex items-center gap-3">
              <ServiceStatusDot status={health.status} />
              <span className="font-medium capitalize">{health.status}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(health.timestamp).toLocaleString('pl-PL')}
              </span>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{health.summary.healthy}</p>
                <p className="text-xs text-muted-foreground">Healthy</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{health.summary.degraded}</p>
                <p className="text-xs text-muted-foreground">Degraded</p>
              </div>
              <div className="rounded-md border p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{health.summary.unhealthy}</p>
                <p className="text-xs text-muted-foreground">Unhealthy</p>
              </div>
            </div>

            <Separator />

            {/* Service list */}
            <div className="space-y-2">
              {health.services.map((svc) => (
                <div
                  key={svc.name}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <ServiceStatusDot status={svc.status} />
                    <span className="text-sm font-medium">{svc.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {svc.responseTime !== undefined && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {svc.responseTime}ms
                      </span>
                    )}
                    <Badge
                      variant={
                        svc.status === 'healthy'
                          ? 'default'
                          : svc.status === 'degraded'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="text-xs capitalize"
                    >
                      {svc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
