import { useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Settings,
  Building2,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Shield,
} from 'lucide-react'
import {
  useCompanies,
  useCreateCompany,
  useDeleteCompany,
  useTestToken,
  useCostCenters,
} from '@/hooks/use-api'
import type { KsefSetting } from '@/lib/types'

function TokenStatus({ setting }: { setting: KsefSetting }) {
  const intl = useIntl()
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

export function SettingsPage() {
  const intl = useIntl()

  const { data: companiesData, isLoading } = useCompanies()
  const { data: costCentersData } = useCostCenters()
  const createCompany = useCreateCompany()
  const deleteCompany = useDeleteCompany()
  const testToken = useTestToken()

  const companies = companiesData?.settings ?? []
  const costCenters = costCentersData?.costCenters ?? []

  // New company form
  const [showForm, setShowForm] = useState(false)
  const [formNip, setFormNip] = useState('')
  const [formName, setFormName] = useState('')
  const [formEnv, setFormEnv] = useState<'test' | 'demo' | 'production'>('production')

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

      {/* Companies */}
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
            <button
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {intl.formatMessage({ id: 'settings.addCompany' })}
            </button>
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
                <button
                  onClick={handleCreate}
                  disabled={createCompany.isPending || !formNip.trim() || !formName.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createCompany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {intl.formatMessage({ id: 'common.save' })}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  {intl.formatMessage({ id: 'common.cancel' })}
                </button>
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
                    <button
                      onClick={() => handleTest(company.id)}
                      disabled={testingId === company.id}
                      className="inline-flex items-center gap-1 rounded-md border border-input px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                      title="Test token"
                    >
                      {testingId === company.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Shield className="h-3.5 w-3.5" />}
                      Test
                    </button>
                    <button
                      onClick={() => handleDelete(company.id)}
                      disabled={deletingId === company.id}
                      className="inline-flex items-center rounded-md border border-input p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      title={intl.formatMessage({ id: 'common.delete' })}
                    >
                      {deletingId === company.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                    {testResult?.id === company.id && (
                      <span className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.success ? <CheckCircle2 className="h-4 w-4 inline" /> : <AlertCircle className="h-4 w-4 inline" />}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost centers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {intl.formatMessage({ id: 'settings.costCenters' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {costCenters.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {intl.formatMessage({ id: 'common.none' })}
            </p>
          ) : (
            <div className="space-y-1">
              {costCenters.map((cc) => (
                <div key={cc.id} className="flex items-center justify-between py-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{cc.code}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>{cc.name}</span>
                  </div>
                  <Badge variant={cc.isActive ? 'default' : 'secondary'} className="text-xs">
                    {cc.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
