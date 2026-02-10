'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit, 
  AlertCircle,
  CheckCircle,
  Folder,
  RefreshCw,
  Save,
  Settings,
  TestTube2,
  Trash,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { SettingsSkeleton } from '@/components/skeletons'
import { 
  useCompanies, 
  useCreateCompany, 
  useUpdateCompany,
  useDeleteCompany,
  useCostCenters,
  useCreateCostCenter,
  useUpdateCostCenter,
  useDeleteCostCenter,
  useGenerateTestData,
  useCleanupTestData,
  useCleanupTestDataPreview,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { KsefSetting, CostCenter } from '@/lib/api'
import { HealthStatusPanel } from '@/components/health/health-status-panel'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { RequireRole } from '@/components/auth/auth-provider'

type TokenStatus = 'valid' | 'expiring' | 'expired' | 'missing'
type Environment = 'production' | 'test' | 'demo'

export default function SettingsPage() {
  const { toast } = useToast()
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  // Helper function to get token status badge with translations
  const getTokenStatusBadge = (status: TokenStatus) => {
    switch (status) {
      case 'valid':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          {t('tokenValid')}
        </Badge>
      case 'expiring':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <AlertCircle className="mr-1 h-3 w-3" />
          {t('tokenExpiring')}
        </Badge>
      case 'expired':
        return <Badge variant="destructive">
          {t('tokenExpired')}
        </Badge>
      case 'missing':
        return <Badge variant="secondary">
          {t('tokenMissing')}
        </Badge>
      default:
        return null
    }
  }

  // Helper function to get environment badge with translations
  const getEnvironmentBadge = (env: Environment) => {
    switch (env) {
      case 'production':
        return <Badge>{t('production')}</Badge>
      case 'test':
        return <Badge variant="outline">{t('test')}</Badge>
      case 'demo':
        return <Badge variant="secondary">{t('demo')}</Badge>
      default:
        return null
    }
  }
  
  // Company context
  const { selectedCompany, setSelectedCompany } = useCompanyContext()
  
  // API hooks
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } = useCompanies()
  const { data: costCentersData, isLoading: costCentersLoading, error: costCentersError } = useCostCenters()
  const createCompanyMutation = useCreateCompany()
  const updateCompanyMutation = useUpdateCompany()
  const deleteCompanyMutation = useDeleteCompany()
  const createCostCenterMutation = useCreateCostCenter()
  const updateCostCenterMutation = useUpdateCostCenter()
  const deleteCostCenterMutation = useDeleteCostCenter()
  
  // Use API data (no mock fallback)
  const companies = companiesData ?? []
  const costCenters = costCentersData ?? []
  const isLoading = companiesLoading || costCentersLoading
  
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [isAddCostCenterOpen, setIsAddCostCenterOpen] = useState(false)
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null)
  const [editCostCenterCode, setEditCostCenterCode] = useState('')
  const [editCostCenterName, setEditCostCenterName] = useState('')
  
  // Edit company state
  const [editingCompany, setEditingCompany] = useState<KsefSetting | null>(null)
  const [editCompanyName, setEditCompanyName] = useState('')
  const [editCompanyEnv, setEditCompanyEnv] = useState<Environment>('test')
  const [editCompanyPrefix, setEditCompanyPrefix] = useState('')
  const [editCompanyAutoSync, setEditCompanyAutoSync] = useState(false)
  
  // New company form
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyNip, setNewCompanyNip] = useState('')
  const [newCompanyEnv, setNewCompanyEnv] = useState<Environment>('test')
  const [newCompanyManualOnly, setNewCompanyManualOnly] = useState(false)
  const [newCompanyPrefix, setNewCompanyPrefix] = useState('')
  const [newCompanyAutoSync, setNewCompanyAutoSync] = useState(false)
  
  // New cost center form
  const [newCostCenterCode, setNewCostCenterCode] = useState('')
  const [newCostCenterName, setNewCostCenterName] = useState('')

  // Test data generator state
  const [testDataCompany, setTestDataCompany] = useState<KsefSetting | null>(null)
  const [testDataCount, setTestDataCount] = useState(10)
  const [testDataFromDate, setTestDataFromDate] = useState(() => {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    return sixMonthsAgo.toISOString().split('T')[0]
  })
  const [testDataToDate, setTestDataToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [testDataKsefPercent, setTestDataKsefPercent] = useState(30)
  const [testDataPaidPercent, setTestDataPaidPercent] = useState(30)
  const [testDataClearBefore, setTestDataClearBefore] = useState(false)

  const generateTestDataMutation = useGenerateTestData()
  const cleanupTestDataMutation = useCleanupTestData()
  const { data: cleanupPreview, isLoading: cleanupPreviewLoading } = useCleanupTestDataPreview(
    testDataCompany?.nip,
    undefined
  )

  // Filter to only test/demo companies
  const testDemoCompanies = companies.filter(c => c.environment !== 'production')

  // Handle company selection
  const handleSelectCompany = (company: KsefSetting) => {
    setSelectedCompany(company)
    toast({
      title: t('companySelected'),
      description: t('activeCompany', { name: company.companyName }),
    })
  }

  async function addCompany() {
    if (!newCompanyName || !newCompanyNip) return
    
    try {
      await createCompanyMutation.mutateAsync({
        companyName: newCompanyName,
        nip: newCompanyNip,
        environment: newCompanyManualOnly ? 'test' : newCompanyEnv, // manual-only doesn't need real env
        isActive: true,
        autoSync: newCompanyManualOnly ? false : newCompanyAutoSync,
        invoicePrefix: newCompanyPrefix || undefined,
      })
      toast({
        variant: 'success',
        title: t('companyAdded'),
        description: t('companyAddedDesc', { name: newCompanyName }),
      })
      // Reset form
      setNewCompanyName('')
      setNewCompanyNip('')
      setNewCompanyEnv('test')
      setNewCompanyManualOnly(false)
      setNewCompanyPrefix('')
      setNewCompanyAutoSync(false)
      setIsAddCompanyOpen(false)
    } catch (error) {
      console.error('Failed to add company:', error)
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error instanceof Error ? error.message : t('addCompanyError'),
      })
    }
  }

  async function addCostCenter() {
    if (!newCostCenterCode || !newCostCenterName) return
    
    try {
      await createCostCenterMutation.mutateAsync({
        code: newCostCenterCode.toUpperCase(),
        name: newCostCenterName,
        isActive: true,
      })
      toast({
        variant: 'success',
        title: t('costCenterAdded'),
        description: `${newCostCenterCode.toUpperCase()} - ${newCostCenterName}`,
      })
      setNewCostCenterCode('')
      setNewCostCenterName('')
      setIsAddCostCenterOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('addCostCenterError'),
      })
    }
  }

  async function deleteCompany(id: string, name: string) {
    try {
      await deleteCompanyMutation.mutateAsync(id)
      toast({
        variant: 'success',
        title: t('companyDeleted'),
        description: t('companyDeletedDesc', { name }),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('deleteCompanyError'),
      })
    }
  }

  function openEditCompany(company: KsefSetting) {
    setEditingCompany(company)
    setEditCompanyName(company.companyName)
    setEditCompanyEnv(company.environment as Environment)
    setEditCompanyPrefix(company.invoicePrefix || '')
    setEditCompanyAutoSync(company.autoSync || false)
  }

  async function saveCompany() {
    if (!editingCompany || !editCompanyName) return
    
    try {
      await updateCompanyMutation.mutateAsync({
        id: editingCompany.id,
        data: {
          companyName: editCompanyName,
          environment: editCompanyEnv,
          invoicePrefix: editCompanyPrefix || undefined,
          autoSync: editCompanyAutoSync,
        },
      })
      toast({
        variant: 'success',
        title: t('companyUpdated'),
        description: t('companyUpdatedDesc', { name: editCompanyName }),
      })
      setEditingCompany(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: error instanceof Error ? error.message : t('updateCompanyError'),
      })
    }
  }

  async function deleteCostCenter(id: string, code: string) {
    try {
      await deleteCostCenterMutation.mutateAsync(id)
      toast({
        variant: 'success',
        title: t('costCenterDeleted'),
        description: t('costCenterDeletedDesc', { code }),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('deleteCostCenterError'),
      })
    }
  }

  function openEditCostCenter(cc: CostCenter) {
    setEditingCostCenter(cc)
    setEditCostCenterCode(cc.code)
    setEditCostCenterName(cc.name)
  }

  async function saveCostCenter() {
    if (!editingCostCenter || !editCostCenterCode || !editCostCenterName) return
    
    try {
      await updateCostCenterMutation.mutateAsync({
        id: editingCostCenter.id,
        data: {
          code: editCostCenterCode,
          name: editCostCenterName,
        },
      })
      toast({
        variant: 'success',
        title: t('costCenterUpdated'),
        description: `${editCostCenterCode} - ${editCostCenterName}`,
      })
      setEditingCostCenter(null)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('updateCostCenterError'),
      })
    }
  }

  async function handleGenerateTestData() {
    if (!testDataCompany) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('companyRequired'),
      })
      return
    }

    try {
      // Clear existing data if requested
      if (testDataClearBefore) {
        await cleanupTestDataMutation.mutateAsync({
          nip: testDataCompany.nip,
          companyId: testDataCompany.id, // Send company ID to handle multiple companies with same NIP
          dryRun: false,
        })
      }

      // Generate new data
      const result = await generateTestDataMutation.mutateAsync({
        nip: testDataCompany.nip,
        companyId: testDataCompany.id, // Send company ID to handle multiple companies with same NIP
        count: testDataCount,
        fromDate: testDataFromDate,
        toDate: testDataToDate,
        paidPercentage: testDataPaidPercent,
        ksefPercentage: testDataKsefPercent,
      })

      toast({
        variant: 'success',
        title: t('generationCompleted'),
        description: t('generatedDesc', { 
          created: result.summary.created,
          paid: result.summary.paid,
        }),
      })
    } catch (error) {
      console.error('Test data generation error:', error)
      
      // Check if it's a production environment error
      const errorMessage = error instanceof Error ? error.message : ''
      const isProductionError = errorMessage.includes('only allowed for test and demo') || 
                                errorMessage.includes('production')
      
      // Extract environment from error if available (format: "(current: production)")
      const envMatch = errorMessage.match(/\(current: ([^)]+)\)/)
      const detectedEnv = envMatch ? envMatch[1] : null
      
      toast({
        variant: 'destructive',
        title: t('generationError'),
        description: isProductionError 
          ? `${t('productionNotAllowed')}${detectedEnv ? '\n' + t('environmentDetected', { environment: detectedEnv }) : ''}`
          : errorMessage || tCommon('error'),
      })
    }
  }

  async function handleCleanupTestData() {
    if (!testDataCompany) {
      toast({
        variant: 'destructive',
        title: tCommon('error'),
        description: t('companyRequired'),
      })
      return
    }

    try {
      const result = await cleanupTestDataMutation.mutateAsync({
        nip: testDataCompany.nip,
        companyId: testDataCompany.id, // Send company ID to handle multiple companies with same NIP
        dryRun: false,
      })

      toast({
        variant: 'success',
        title: t('cleanupCompleted'),
        description: t('cleanupCompletedDesc', { count: result.deleted || 0 }),
      })
    } catch (error) {
      console.error('Test data cleanup error:', error)
      
      // Check if it's a production environment error
      const errorMessage = error instanceof Error ? error.message : ''
      const isProductionError = errorMessage.includes('only allowed for test and demo') || 
                                errorMessage.includes('production')
      
      // Extract environment from error if available
      const envMatch = errorMessage.match(/\(current: ([^)]+)\)/)
      const detectedEnv = envMatch ? envMatch[1] : null
      
      toast({
        variant: 'destructive',
        title: t('cleanupError'),
        description: isProductionError 
          ? `${t('productionNotAllowed')}${detectedEnv ? '\n' + t('environmentDetected', { environment: detectedEnv }) : ''}`
          : errorMessage || tCommon('error'),
      })
    }
  }

  if (isLoading) {
    return <SettingsSkeleton />
  }

  return (
    <RequireRole role="Admin" fallback={
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">{tCommon('accessDenied')}</h2>
        <p className="text-muted-foreground">{tCommon('adminRequired')}</p>
      </div>
    }>
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 md:h-7 md:w-7" />
          {t('title')}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      <Tabs defaultValue="companies">
        <TabsList className="w-full md:w-auto overflow-x-auto">
          <TabsTrigger value="companies">
            <Building2 className="mr-2 h-4 w-4" />
            {t('companies')}
          </TabsTrigger>
          <TabsTrigger value="costcenters">
            <Folder className="mr-2 h-4 w-4" />
            {t('costCenters')}
          </TabsTrigger>
          <TabsTrigger value="testdata">
            <TestTube2 className="mr-2 h-4 w-4" />
            {t('testData')}
          </TabsTrigger>
          <TabsTrigger value="system">
            <AlertCircle className="mr-2 h-4 w-4" />
            System Status
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg md:text-xl">{t('companies')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('companiesDescription')}
                </CardDescription>
              </div>
              <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addCompany')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t('addNewCompany')}</DialogTitle>
                    <DialogDescription>
                      {t('addNewCompanyDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('companyName')} *</label>
                      <Input
                        placeholder={t('companyNamePlaceholder')}
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('nip')} *</label>
                      <Input
                        placeholder={t('nipPlaceholder')}
                        value={newCompanyNip}
                        onChange={(e) => setNewCompanyNip(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10}
                      />
                    </div>
                    
                    {/* Manual only checkbox */}
                    <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                      <Checkbox 
                        id="manualOnly" 
                        checked={newCompanyManualOnly}
                        onCheckedChange={(checked) => setNewCompanyManualOnly(checked === true)}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label 
                          htmlFor="manualOnly" 
                          className="text-sm font-medium cursor-pointer"
                        >
                          {t('manualOnlyLabel')}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {t('manualOnlyDesc')}
                        </p>
                      </div>
                    </div>

                    {/* KSeF options - shown only if not manual-only */}
                    {!newCompanyManualOnly && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">{t('ksefEnvironment')}</label>
                          <Select value={newCompanyEnv} onValueChange={(v) => setNewCompanyEnv(v as Environment)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">{t('production')}</SelectItem>
                              <SelectItem value="test">{t('test')}</SelectItem>
                              <SelectItem value="demo">{t('demo')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {t('ksefEnvironmentDesc')}
                          </p>
                        </div>
                        
                        {/* TODO: Uncomment when autoSync feature is implemented
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="autoSync" 
                            checked={newCompanyAutoSync}
                            onCheckedChange={(checked) => setNewCompanyAutoSync(checked === true)}
                          />
                          <label htmlFor="autoSync" className="text-sm font-medium cursor-pointer">
                            {t('autoSync')}
                          </label>
                        </div>
                        */}
                      </>
                    )}

                    {/* Invoice prefix - always visible */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">{t('invoicePrefix')}</label>
                      <Input
                        placeholder={t('invoicePrefixPlaceholder')}
                        value={newCompanyPrefix}
                        onChange={(e) => setNewCompanyPrefix(e.target.value.slice(0, 10))}
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('invoicePrefixDesc')}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                      {tCommon('cancel')}
                    </Button>
                    <Button onClick={addCompany} disabled={!newCompanyName || !newCompanyNip || newCompanyNip.length !== 10}>
                      <Save className="mr-2 h-4 w-4" />
                      {tCommon('save')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.company')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('table.nip')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('table.environment')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('table.ksefToken')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('table.lastSync')}</TableHead>
                      <TableHead className="w-[100px] md:w-[150px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => {
                      const isSelected = selectedCompany?.id === company.id
                      return (
                      <TableRow key={company.id} className={isSelected ? 'bg-accent/50' : ''}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
                              <span className="font-medium text-sm md:text-base">{company.companyName}</span>
                              {isSelected && (
                                <Badge variant="secondary" className="text-xs">{t('selected')}</Badge>
                              )}
                            </div>
                            {/* Mobile: show NIP and env below company name */}
                            <div className="flex gap-2 sm:hidden text-xs text-muted-foreground">
                              <span className="font-mono">{company.nip}</span>
                              {getEnvironmentBadge(company.environment)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono hidden sm:table-cell">{company.nip}</TableCell>
                        <TableCell className="hidden md:table-cell">{getEnvironmentBadge(company.environment)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-1">
                            {getTokenStatusBadge(company.tokenStatus ?? 'missing')}
                            {company.tokenExpiresAt && (
                              <span className="text-xs text-muted-foreground">
                                {t('tokenExpiresAt')}: {new Date(company.tokenExpiresAt).toLocaleDateString(locale)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {company.lastSyncAt ? (
                            new Date(company.lastSyncAt).toLocaleString(locale)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            {!isSelected && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="hidden sm:flex"
                                onClick={() => handleSelectCompany(company)}
                              >
                                {tCommon('select') || tCommon('actions')}
                              </Button>
                            )}
                            {!isSelected && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="sm:hidden"
                                onClick={() => handleSelectCompany(company)}
                                title={t('companySelected')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openEditCompany(company)}
                              title={t('editCompany')}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteCompany(company.id, company.companyName)}
                              disabled={deleteCompanyMutation.isPending}
                              title={tCommon('delete')}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )})}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Edit Company Dialog */}
          <Dialog open={!!editingCompany} onOpenChange={(open) => !open && setEditingCompany(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('editCompany')}</DialogTitle>
                <DialogDescription>
                  {editingCompany?.companyName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('nip')}</label>
                  <Input
                    value={editingCompany?.nip || ''}
                    disabled
                    className="font-mono bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('companyName')}</label>
                  <Input
                    placeholder={t('companyNamePlaceholder')}
                    value={editCompanyName}
                    onChange={(e) => setEditCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('ksefEnvironment')}</label>
                  <Select value={editCompanyEnv} onValueChange={(v) => setEditCompanyEnv(v as Environment)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">{t('production')}</SelectItem>
                      <SelectItem value="test">{t('test')}</SelectItem>
                      <SelectItem value="demo">{t('demo')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('invoicePrefix')}</label>
                  <Input
                    placeholder={t('invoicePrefixPlaceholder')}
                    value={editCompanyPrefix}
                    onChange={(e) => setEditCompanyPrefix(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('invoicePrefixDesc')}
                  </p>
                </div>
                {/* TODO: Uncomment when autoSync feature is implemented
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-autosync"
                    checked={editCompanyAutoSync}
                    onCheckedChange={(checked) => setEditCompanyAutoSync(checked === true)}
                  />
                  <label htmlFor="edit-autosync" className="text-sm font-medium cursor-pointer">
                    {t('autoSync')}
                  </label>
                </div>
                */}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingCompany(null)}>
                  {tCommon('cancel')}
                </Button>
                <Button 
                  onClick={saveCompany} 
                  disabled={!editCompanyName || updateCompanyMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {tCommon('save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="costcenters" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {/* Info about read-only cost centers */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 md:p-4 flex items-start gap-2 md:gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs md:text-sm text-blue-800">
              <p className="font-medium mb-1">{t('costCentersInfoTitle')}</p>
              <p className="text-blue-700">
                {t('costCentersInfoDesc')}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div>
                <CardTitle className="text-lg md:text-xl">{t('costCentersTitle')}</CardTitle>
                <CardDescription className="text-sm">
                  {t('costCentersDesc')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.value')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costCenters.map((cc) => (
                    <TableRow key={cc.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {cc.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cc.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {t('active')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{t('inactive')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Status Tab */}
        <TabsContent value="system" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <HealthStatusPanel />
        </TabsContent>

        {/* Test Data Tab */}
        <TabsContent value="testdata" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          {/* Test Data Generator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube2 className="h-5 w-5" />
                {t('testDataGenerator')}
              </CardTitle>
              <CardDescription>
                {t('testDataGeneratorDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Selection */}
              <div className="space-y-2">
                <Label>{t('company')}</Label>
                <Select 
                  value={testDataCompany?.id || ''} 
                  onValueChange={(id) => setTestDataCompany(testDemoCompanies.find(c => c.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {testDemoCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.companyName} ({company.nip}) - {getEnvironmentBadge(company.environment)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {testDemoCompanies.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('onlyTestDemo')}
                  </p>
                )}
              </div>

              {/* Number of Invoices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t('numberOfInvoices')}</Label>
                  <span className="text-sm text-muted-foreground">
                    {t('invoicesRange', { count: testDataCount })}
                  </span>
                </div>
                <Slider
                  value={[testDataCount]}
                  onValueChange={(v: number[]) => setTestDataCount(v[0])}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>{t('dateRange')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('from')}</label>
                    <Input
                      type="date"
                      value={testDataFromDate}
                      onChange={(e) => setTestDataFromDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('to')}</label>
                    <Input
                      type="date"
                      value={testDataToDate}
                      onChange={(e) => setTestDataToDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Source Mix Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t('sourceMix')}</Label>
                  <span className="text-sm font-medium">
                    {t('previewSources', {
                      ksef: Math.round(testDataCount * testDataKsefPercent / 100),
                      manual: Math.round(testDataCount * (100 - testDataKsefPercent) / 100),
                    })}
                  </span>
                </div>
                <div className="space-y-2">
                  <Slider
                    value={[testDataKsefPercent]}
                    onValueChange={(v: number[]) => setTestDataKsefPercent(v[0])}
                    min={0}
                    max={100}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{testDataKsefPercent}% {t('ksefInvoices')}</span>
                    <span>{100 - testDataKsefPercent}% {t('manualInvoices')}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t('sourceMixDesc')}</p>
              </div>

              {/* Paid Percentage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>{t('paidPercentage')}</Label>
                  <span className="text-sm text-muted-foreground">
                    {t('willBePaid', { count: Math.round(testDataCount * testDataPaidPercent / 100) })}
                  </span>
                </div>
                <Slider
                  value={[testDataPaidPercent]}
                  onValueChange={(v: number[]) => setTestDataPaidPercent(v[0])}
                  min={0}
                  max={100}
                  step={10}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">{t('paidPercentageDesc')}</p>
              </div>

              {/* Clear Before Option */}
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <Checkbox
                  id="clearBefore"
                  checked={testDataClearBefore}
                  onCheckedChange={(checked) => setTestDataClearBefore(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="clearBefore" className="text-sm font-medium cursor-pointer">
                    {t('clearExistingData')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('clearExistingDataDesc')}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateTestData}
                disabled={!testDataCompany || generateTestDataMutation.isPending}
                className="w-full"
                size="lg"
              >
                <TestTube2 className="mr-2 h-4 w-4" />
                {generateTestDataMutation.isPending ? t('generating') : t('generateTestInvoices')}
              </Button>
            </CardContent>
          </Card>

          {/* Manage Test Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash className="h-5 w-5" />
                {t('manageTestData')}
              </CardTitle>
              <CardDescription>
                {t('manageTestDataDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Selection */}
              <div className="space-y-2">
                <Label>{t('company')}</Label>
                <Select 
                  value={testDataCompany?.id || ''} 
                  onValueChange={(id) => setTestDataCompany(testDemoCompanies.find(c => c.id === id) || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {testDemoCompanies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.companyName} ({company.nip})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Test Data Info */}
              {cleanupPreviewLoading && (
                <div className="text-sm text-muted-foreground">
                  {t('loadingPreview')}
                </div>
              )}

              {cleanupPreview && testDataCompany && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">{t('currentTestData')}</div>
                  {cleanupPreview.total === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('noTestData')}</p>
                  ) : (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{t('testInvoicesFound', { count: cleanupPreview.total })}</span>
                      </div>
                      {cleanupPreview.bySource && (
                        <ul className="space-y-1 text-muted-foreground ml-4">
                          {Object.entries(cleanupPreview.bySource).map(([source, count]) => (
                            <li key={source}>
                              • {source === 'KSeF' ? t('fromKsef', { count }) : t('fromManual', { count })}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Delete Button */}
                  {cleanupPreview.total > 0 && (
                    <Button
                      variant="destructive"
                      onClick={handleCleanupTestData}
                      disabled={cleanupTestDataMutation.isPending}
                      className="w-full"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {cleanupTestDataMutation.isPending ? tCommon('loading') : t('deleteAllTestData')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </RequireRole>
  )
}
