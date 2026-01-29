'use client'

import { useState } from 'react'
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
  Key, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Globe,
  Folder,
  RefreshCw,
  Save,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  useCompanies, 
  useCreateCompany, 
  useDeleteCompany,
  useCostCenters,
  useCreateCostCenter,
  useDeleteCostCenter,
} from '@/hooks/use-api'
import { useCompanyContext } from '@/contexts/company-context'
import { KsefSetting, CostCenter } from '@/lib/api'

type TokenStatus = 'valid' | 'expiring' | 'expired' | 'missing'
type Environment = 'production' | 'test' | 'demo'

// Mock data for fallback
const mockCompanies: KsefSetting[] = [
  {
    id: '1',
    companyName: 'Developico Sp. z o.o.',
    nip: '1234567890',
    isActive: true,
    environment: 'production',
    tokenStatus: 'valid',
    tokenExpiresAt: '2024-12-31',
    lastSyncAt: '2024-01-20T10:30:00Z',
  },
  {
    id: '2',
    companyName: 'Test Company S.A.',
    nip: '0987654321',
    isActive: true,
    environment: 'test',
    tokenStatus: 'expiring',
    tokenExpiresAt: '2024-02-15',
  },
]

const mockCostCenters: CostCenter[] = [
  { id: '1', code: 'CONS', name: 'Consultants', isActive: true },
  { id: '2', code: 'BACK', name: 'BackOffice', isActive: true },
  { id: '3', code: 'MGMT', name: 'Management', isActive: true },
  { id: '4', code: 'CARS', name: 'Cars', isActive: true },
  { id: '5', code: 'LEGAL', name: 'Legal', isActive: true },
  { id: '6', code: 'MKTG', name: 'Marketing', isActive: true },
  { id: '7', code: 'SALES', name: 'Sales', isActive: true },
  { id: '8', code: 'DELIV', name: 'Delivery', isActive: true },
  { id: '9', code: 'FIN', name: 'Finance', isActive: true },
  { id: '10', code: 'OTHER', name: 'Other', isActive: true },
]

function getTokenStatusBadge(status: TokenStatus) {
  switch (status) {
    case 'valid':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        Aktywny
      </Badge>
    case 'expiring':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
        <AlertCircle className="mr-1 h-3 w-3" />
        Wygasa wkrótce
      </Badge>
    case 'expired':
      return <Badge variant="destructive">
        Wygasł
      </Badge>
    case 'missing':
      return <Badge variant="secondary">
        Brak
      </Badge>
    default:
      return null
  }
}

function getEnvironmentBadge(env: Environment) {
  switch (env) {
    case 'production':
      return <Badge>Produkcja</Badge>
    case 'test':
      return <Badge variant="outline">Test</Badge>
    case 'demo':
      return <Badge variant="secondary">Demo</Badge>
    default:
      return null
  }
}

export default function SettingsPage() {
  const { toast } = useToast()
  
  // Company context
  const { selectedCompany, setSelectedCompany } = useCompanyContext()
  
  // API hooks
  const { data: companiesData, isLoading: companiesLoading, error: companiesError } = useCompanies()
  const { data: costCentersData, isLoading: costCentersLoading, error: costCentersError } = useCostCenters()
  const createCompanyMutation = useCreateCompany()
  const deleteCompanyMutation = useDeleteCompany()
  const createCostCenterMutation = useCreateCostCenter()
  const deleteCostCenterMutation = useDeleteCostCenter()
  
  // Use API data or fallback to mock
  const companies = companiesData ?? mockCompanies
  const costCenters = costCentersData ?? mockCostCenters
  const isLoading = companiesLoading || costCentersLoading
  
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false)
  const [isAddCostCenterOpen, setIsAddCostCenterOpen] = useState(false)
  
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

  // Handle company selection
  const handleSelectCompany = (company: KsefSetting) => {
    setSelectedCompany(company)
    toast({
      title: 'Firma wybrana',
      description: `Aktywna firma: ${company.companyName}`,
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
        title: 'Firma dodana',
        description: `${newCompanyName} została dodana do listy`,
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
        title: 'Błąd',
        description: error instanceof Error ? error.message : 'Nie udało się dodać firmy',
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
        title: 'MPK dodane',
        description: `${newCostCenterCode.toUpperCase()} - ${newCostCenterName}`,
      })
      setNewCostCenterCode('')
      setNewCostCenterName('')
      setIsAddCostCenterOpen(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Błąd',
        description: 'Nie udało się dodać centrum kosztów',
      })
    }
  }

  async function deleteCompany(id: string, name: string) {
    try {
      await deleteCompanyMutation.mutateAsync(id)
      toast({
        variant: 'success',
        title: 'Firma usunięta',
        description: `${name} została usunięta`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Błąd',
        description: 'Nie udało się usunąć firmy',
      })
    }
  }

  async function deleteCostCenter(id: string, code: string) {
    try {
      await deleteCostCenterMutation.mutateAsync(id)
      toast({
        variant: 'success',
        title: 'MPK usunięte',
        description: `${code} zostało usunięte`,
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Błąd',
        description: 'Nie udało się usunąć centrum kosztów',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ustawienia</h1>
        <p className="text-muted-foreground">
          Konfiguracja integracji z KSeF
        </p>
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">
            <Building2 className="mr-2 h-4 w-4" />
            Firmy
          </TabsTrigger>
          <TabsTrigger value="costcenters">
            <Folder className="mr-2 h-4 w-4" />
            Centra kosztów
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Bezpieczeństwo
          </TabsTrigger>
        </TabsList>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Firmy</CardTitle>
                <CardDescription>
                  Zarządzaj firmami połączonymi z KSeF
                </CardDescription>
              </div>
              <Dialog open={isAddCompanyOpen} onOpenChange={setIsAddCompanyOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj firmę
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Dodaj nową firmę</DialogTitle>
                    <DialogDescription>
                      Wprowadź dane firmy i wybierz tryb pracy
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nazwa firmy *</label>
                      <Input
                        placeholder="np. Moja Firma Sp. z o.o."
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">NIP *</label>
                      <Input
                        placeholder="1234567890"
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
                          Tylko faktury ręczne
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Bez połączenia z KSeF – faktury wprowadzane wyłącznie ręcznie
                        </p>
                      </div>
                    </div>

                    {/* KSeF options - shown only if not manual-only */}
                    {!newCompanyManualOnly && (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Środowisko KSeF</label>
                          <Select value={newCompanyEnv} onValueChange={(v) => setNewCompanyEnv(v as Environment)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="production">Produkcja</SelectItem>
                              <SelectItem value="test">Test</SelectItem>
                              <SelectItem value="demo">Demo</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Wybierz środowisko odpowiadające Twojemu tokenowi KSeF
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="autoSync" 
                            checked={newCompanyAutoSync}
                            onCheckedChange={(checked) => setNewCompanyAutoSync(checked === true)}
                          />
                          <label htmlFor="autoSync" className="text-sm font-medium cursor-pointer">
                            Automatyczna synchronizacja z KSeF
                          </label>
                        </div>
                      </>
                    )}

                    {/* Invoice prefix - always visible */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Prefiks faktur (opcjonalnie)</label>
                      <Input
                        placeholder="np. FV-"
                        value={newCompanyPrefix}
                        onChange={(e) => setNewCompanyPrefix(e.target.value.slice(0, 10))}
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        Dodawany na początku numerów faktur przy ręcznym wprowadzaniu
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCompanyOpen(false)}>
                      Anuluj
                    </Button>
                    <Button onClick={addCompany} disabled={!newCompanyName || !newCompanyNip || newCompanyNip.length !== 10}>
                      <Save className="mr-2 h-4 w-4" />
                      Zapisz
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firma</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Środowisko</TableHead>
                    <TableHead>Token KSeF</TableHead>
                    <TableHead>Ostatnia synchronizacja</TableHead>
                    <TableHead className="w-[150px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const isSelected = selectedCompany?.id === company.id
                    return (
                    <TableRow key={company.id} className={isSelected ? 'bg-accent/50' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{company.companyName}</span>
                          {isSelected && (
                            <Badge variant="secondary" className="text-xs">Aktywna</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{company.nip}</TableCell>
                      <TableCell>{getEnvironmentBadge(company.environment)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getTokenStatusBadge(company.tokenStatus ?? 'missing')}
                          {company.tokenExpiresAt && (
                            <span className="text-xs text-muted-foreground">
                              Wygasa: {new Date(company.tokenExpiresAt).toLocaleDateString('pl-PL')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.lastSyncAt ? (
                          new Date(company.lastSyncAt).toLocaleString('pl-PL')
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!isSelected && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSelectCompany(company)}
                            >
                              Wybierz
                            </Button>
                          )}
                          <Button variant="ghost" size="icon">
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteCompany(company.id, company.companyName)}
                            disabled={deleteCompanyMutation.isPending || isSelected}
                            title={isSelected ? 'Nie można usunąć aktywnej firmy' : 'Usuń firmę'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )})}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="costcenters" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Centra kosztów (MPK)</CardTitle>
                <CardDescription>
                  Lista dostępnych centrów kosztów do kategoryzacji faktur
                </CardDescription>
              </div>
              <Dialog open={isAddCostCenterOpen} onOpenChange={setIsAddCostCenterOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj MPK
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Dodaj centrum kosztów</DialogTitle>
                    <DialogDescription>
                      Wprowadź kod i nazwę nowego centrum kosztów
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Kod</label>
                      <Input
                        placeholder="np. IT"
                        value={newCostCenterCode}
                        onChange={(e) => setNewCostCenterCode(e.target.value)}
                        className="uppercase"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nazwa</label>
                      <Input
                        placeholder="np. Dział IT"
                        value={newCostCenterName}
                        onChange={(e) => setNewCostCenterName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddCostCenterOpen(false)}>
                      Anuluj
                    </Button>
                    <Button onClick={addCostCenter}>
                      <Save className="mr-2 h-4 w-4" />
                      Zapisz
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Nazwa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
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
                      <TableCell className="font-medium">{cc.name}</TableCell>
                      <TableCell>
                        {cc.isActive ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Aktywne
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nieaktywne</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteCostCenter(cc.id, cc.code)}
                            disabled={deleteCostCenterMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Azure Key Vault
              </CardTitle>
              <CardDescription>
                Tokeny KSeF są bezpiecznie przechowywane w Azure Key Vault
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Key Vault URL:</span>
                  <span className="font-mono text-sm">https://kv-ksef-*.vault.azure.net</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schemat nazewnictwa:</span>
                  <span className="font-mono text-sm">ksef-token-{'{NIP}'}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Tokeny KSeF można odnowić w portalu KSeF i zaktualizować w Azure Key Vault.
                Upewnij się, że aplikacja ma odpowiednie uprawnienia do odczytu sekretów.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Środowiska KSeF
              </CardTitle>
              <CardDescription>
                Adresy API dla różnych środowisk KSeF
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Produkcja</span>
                    <p className="text-xs text-muted-foreground">Oficjalne środowisko</p>
                  </div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    https://ksef.mf.gov.pl/api
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Test</span>
                    <p className="text-xs text-muted-foreground">Środowisko testowe</p>
                  </div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    https://ksef-test.mf.gov.pl/api
                  </code>
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">Demo</span>
                    <p className="text-xs text-muted-foreground">Środowisko demonstracyjne</p>
                  </div>
                  <code className="bg-muted px-2 py-1 rounded text-xs">
                    https://ksef-demo.mf.gov.pl/api
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Uprawnienia
              </CardTitle>
              <CardDescription>
                Role i uprawnienia w aplikacji
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 text-sm">
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">Administrator KSeF</span>
                    <p className="text-xs text-muted-foreground">
                      Pełny dostęp: sesje, wysyłanie, pobieranie, konfiguracja
                    </p>
                  </div>
                  <Badge>ksef.admin</Badge>
                </div>
                <div className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">Przeglądający</span>
                    <p className="text-xs text-muted-foreground">
                      Tylko odczyt: przeglądanie faktur i statusów
                    </p>
                  </div>
                  <Badge variant="outline">ksef.reader</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
