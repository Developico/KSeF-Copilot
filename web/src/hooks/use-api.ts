import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  api,
  queryKeys,
  Invoice,
  InvoiceListParams,
  SyncResult,
  KsefSetting,
  CostCenter,
  type ForecastAlgorithmsResponse,
  type AnomalyRulesResponse,
  type ForecastResult,
  type ForecastParams,
} from '../lib/api'
import { FALLBACK_FORECAST_META, FALLBACK_ANOMALY_META } from '../lib/forecast-metadata'
import { useCompanyContext } from '@/contexts/company-context'

// ============================================================================
// KSeF Status & Session
// ============================================================================

export function useKsefStatus() {
  const { selectedCompany } = useCompanyContext()
  
  return useQuery({
    queryKey: ['ksef', 'status', selectedCompany?.id],
    queryFn: () => api.ksef.status({
      companyId: selectedCompany?.id,
      nip: selectedCompany?.nip,
      environment: selectedCompany?.environment,
    }),
    refetchInterval: 60000, // Refresh every minute
    enabled: Boolean(selectedCompany?.id),
  })
}

export function useKsefSession() {
  return useQuery({
    queryKey: queryKeys.ksefSession,
    queryFn: () => api.ksef.getSession(),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false,
  })
}

export function useStartSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (nip?: string) => api.ksef.startSession(nip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ksefSession })
      queryClient.invalidateQueries({ queryKey: queryKeys.ksefStatus })
    },
  })
}

export function useEndSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.ksef.endSession(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ksefSession })
      queryClient.invalidateQueries({ queryKey: queryKeys.ksefStatus })
    },
  })
}

// ============================================================================
// Sync Operations
// ============================================================================

export function useSyncPreview(params?: {
  nip?: string
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { enabled = true, nip, dateFrom, dateTo } = params || {}
  const queryParams = { nip, dateFrom, dateTo }

  return useQuery({
    queryKey: queryKeys.syncPreview(queryParams),
    queryFn: () => api.sync.preview(queryParams),
    enabled,
    staleTime: 60000, // Consider data fresh for 1 minute
    refetchOnWindowFocus: false,
  })
}

export function useRunSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params?: { nip?: string; settingId?: string; dateFrom?: string; dateTo?: string }) =>
      api.sync.run(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sync'] })
    },
  })
}

export function useImportInvoices() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      referenceNumbers,
      nip,
      settingId,
    }: {
      referenceNumbers: string[]
      nip?: string
      settingId?: string
    }) => api.sync.import(referenceNumbers, nip, settingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sync'] })
    },
  })
}

// ============================================================================
// AI Categorization
// ============================================================================

export function useBatchCategorize() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceIds, autoApply }: { invoiceIds: string[]; autoApply?: boolean }) =>
      api.invoices.batchCategorizeWithAI(invoiceIds, autoApply),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ============================================================================
// Invoices
// ============================================================================

export function useInvoices(params?: InvoiceListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: () => api.invoices.list(params),
    enabled: options?.enabled,
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => api.invoices.get(id),
    enabled: Boolean(id),
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: {
        mpk?: string
        category?: string
        project?: string
        tags?: string[]
        paymentStatus?: 'pending' | 'paid'
        paymentDate?: string
      }
    }) => api.invoices.update(id, data),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData(queryKeys.invoice(updatedInvoice.id), updatedInvoice)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.invoices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useMarkAsPaid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, paymentDate }: { id: string; paymentDate?: string }) =>
      api.invoices.markAsPaid(id, paymentDate),
    onSuccess: (updatedInvoice) => {
      queryClient.setQueryData(queryKeys.invoice(updatedInvoice.id), updatedInvoice)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ============================================================================
// Health
// ============================================================================

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.health(),
    retry: false,
  })
}

export function useHealthDetailed(environment?: string) {
  return useQuery({
    queryKey: ['health', 'detailed', environment],
    queryFn: () => api.healthDetailed(environment),
    retry: false,
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// ============================================================================
// Settings - Companies (KSeF Settings)
// ============================================================================

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: async () => {
      const response = await api.settings.listCompanies()
      return response.settings
    },
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: queryKeys.company(id),
    queryFn: () => api.settings.getCompany(id),
    enabled: Boolean(id),
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      nip: string
      companyName: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
      invoicePrefix?: string
    }) => api.settings.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<KsefSetting> }) =>
      api.settings.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies })
      queryClient.invalidateQueries({ queryKey: queryKeys.company(id) })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.settings.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies })
    },
  })
}

export function useTestToken() {
  return useMutation({
    mutationFn: (id: string) => api.settings.testToken(id),
  })
}

export function useGrantKsefPermissions() {
  return useMutation({
    mutationFn: (data: { nip: string; permissions?: string[]; environment?: 'test' | 'demo' }) =>
      api.ksefTestdata.grantPermissions(data),
  })
}

export function useKsefTestdataEnvironments() {
  return useQuery({
    queryKey: ['ksef', 'testdata', 'environments'],
    queryFn: () => api.ksefTestdata.getEnvironments(),
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// ============================================================================
// Settings - Cost Centers
// ============================================================================

export function useCostCenters() {
  return useQuery({
    queryKey: queryKeys.costCenters,
    queryFn: async () => {
      const response = await api.settings.listCostCenters()
      return response.costCenters
    },
  })
}

export function useCreateCostCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { code: string; name: string; isActive?: boolean }) =>
      api.settings.createCostCenter(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
  })
}

export function useUpdateCostCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CostCenter> }) =>
      api.settings.updateCostCenter(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
  })
}

export function useDeleteCostCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.settings.deleteCostCenter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
  })
}

// ============================================================================
// Dataverse Settings
// ============================================================================

export function useDvSettings(activeOnly = false) {
  return useQuery({
    queryKey: queryKeys.dvSettings(activeOnly),
    queryFn: async () => {
      const response = await api.dvSettings.list(activeOnly)
      return response.settings
    },
  })
}

export function useDvSetting(id: string) {
  return useQuery({
    queryKey: queryKeys.dvSetting(id),
    queryFn: () => api.dvSettings.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateDvSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof api.dvSettings.create>[0]) =>
      api.dvSettings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'settings'] })
    },
  })
}

export function useUpdateDvSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.dvSettings.update>[1] }) =>
      api.dvSettings.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'settings'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.dvSetting(id) })
    },
  })
}

export function useDeleteDvSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.dvSettings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'settings'] })
    },
  })
}

// ============================================================================
// Dataverse Sessions
// ============================================================================

export function useDvSessions(settingId: string, activeOnly = false) {
  return useQuery({
    queryKey: queryKeys.dvSessions(settingId, activeOnly),
    queryFn: async () => {
      const response = await api.dvSessions.list(settingId, activeOnly)
      return response.sessions
    },
    enabled: Boolean(settingId),
  })
}

export function useDvActiveSession(nip: string) {
  return useQuery({
    queryKey: queryKeys.dvSessionActive(nip),
    queryFn: () => api.dvSessions.getActive(nip),
    enabled: Boolean(nip),
  })
}

export function useDvSession(id: string) {
  return useQuery({
    queryKey: queryKeys.dvSession(id),
    queryFn: () => api.dvSessions.get(id),
    enabled: Boolean(id),
  })
}

export function useTerminateDvSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.dvSessions.terminate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'sessions'] })
    },
  })
}

export function useCleanupDvSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => api.dvSessions.cleanup(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'sessions'] })
    },
  })
}

// ============================================================================
// Dataverse Sync
// ============================================================================

export function useStartDvSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Parameters<typeof api.dvSync.start>[0]) =>
      api.dvSync.start(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'sync'] })
      queryClient.invalidateQueries({ queryKey: ['dv', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useDvSyncLogs(settingId?: string, limit = 50) {
  return useQuery({
    queryKey: queryKeys.dvSyncLogs(settingId, limit),
    queryFn: async () => {
      const response = await api.dvSync.getLogs(settingId, limit)
      return response.logs
    },
  })
}

export function useDvSyncLog(id: string) {
  return useQuery({
    queryKey: queryKeys.dvSyncLog(id),
    queryFn: () => api.dvSync.getLog(id),
    enabled: Boolean(id),
  })
}

export function useDvSyncStats(settingId: string) {
  return useQuery({
    queryKey: queryKeys.dvSyncStats(settingId),
    queryFn: () => api.dvSync.getStats(settingId),
    enabled: Boolean(settingId),
  })
}

// ============================================================================
// Context-aware hooks (use selected company automatically)
// ============================================================================

/**
 * Hook that returns invoices filtered by currently selected company.
 * Uses settingId for filtering to support multi-environment (same NIP, different environments).
 */
export function useContextInvoices(params?: Omit<InvoiceListParams, 'settingId' | 'tenantNip'>) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  
  const fullParams: InvoiceListParams = {
    ...params,
    settingId: selectedCompany?.id,
  }
  
  return useQuery({
    queryKey: ['invoices', 'context', selectedCompany?.id, params],
    queryFn: () => api.invoices.list(fullParams),
    enabled: !companyLoading && Boolean(selectedCompany),
  })
}

/**
 * Hook that returns dashboard stats for currently selected company.
 * Uses settingId for filtering to support multi-environment (same NIP, different environments).
 */
export function useContextDashboardStats(params?: { fromDate?: string; toDate?: string }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  
  return useQuery({
    queryKey: ['dashboard', 'stats', 'context', selectedCompany?.id, params],
    queryFn: () => api.dashboard.stats({ 
      ...params, 
      settingId: selectedCompany?.id 
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
  })
}

// ============================================================================
// Forecast & Anomaly Hooks
// ============================================================================

/**
 * Hook for overall monthly expense forecast.
 */
export function useContextForecastMonthly(params?: ForecastParams) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['forecast', 'monthly', 'context', selectedCompany?.id, params],
    queryFn: () => api.forecast.monthly({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000, // 5 min — forecast data doesn't change often
  })
}

/**
 * Hook for forecast grouped by cost center (MPK).
 */
export function useContextForecastByMpk(params?: { horizon?: 1 | 6 | 12; historyMonths?: number }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['forecast', 'by-mpk', 'context', selectedCompany?.id, params],
    queryFn: () => api.forecast.byMpk({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for forecast grouped by expense category.
 */
export function useContextForecastByCategory(params?: { horizon?: 1 | 6 | 12; historyMonths?: number }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['forecast', 'by-category', 'context', selectedCompany?.id, params],
    queryFn: () => api.forecast.byCategory({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for forecast grouped by top suppliers.
 */
export function useContextForecastBySupplier(params?: { horizon?: 1 | 6 | 12; historyMonths?: number; top?: number }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['forecast', 'by-supplier', 'context', selectedCompany?.id, params],
    queryFn: () => api.forecast.bySupplier({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for anomaly detection results.
 */
export function useContextAnomalies(params?: { periodDays?: number; sensitivity?: number; enabledRules?: string; ruleConfig?: string }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['anomalies', 'context', selectedCompany?.id, params],
    queryFn: () => api.anomalies.list({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook for anomaly summary (quick counts).
 */
export function useContextAnomalySummary(params?: { periodDays?: number; enabledRules?: string; ruleConfig?: string }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['anomalies', 'summary', 'context', selectedCompany?.id, params],
    queryFn: () => api.anomalies.summary({
      ...params,
      settingId: selectedCompany?.id,
    }),
    enabled: !companyLoading && Boolean(selectedCompany),
    staleTime: 5 * 60 * 1000,
  })
}

// ============================================================================
// Forecast & Anomaly Metadata Hooks
// ============================================================================

/**
 * Hook for forecast algorithm metadata (descriptors + presets).
 * Uses fallback data when the API endpoint is unavailable.
 */
export function useForecastAlgorithms() {
  return useQuery<ForecastAlgorithmsResponse>({
    queryKey: queryKeys.forecastAlgorithms,
    queryFn: async () => {
      try {
        return await api.forecast.algorithms()
      } catch {
        return FALLBACK_FORECAST_META
      }
    },
    staleTime: Infinity,
    placeholderData: FALLBACK_FORECAST_META,
  })
}

/**
 * Hook for anomaly rule metadata (descriptors + presets).
 * Uses fallback data when the API endpoint is unavailable.
 */
export function useAnomalyRules() {
  return useQuery<AnomalyRulesResponse>({
    queryKey: queryKeys.anomalyRules,
    queryFn: async () => {
      try {
        return await api.anomalies.rules()
      } catch {
        return FALLBACK_ANOMALY_META
      }
    },
    staleTime: Infinity,
    placeholderData: FALLBACK_ANOMALY_META,
  })
}

/**
 * Hook for creating invoice with currently selected company's NIP.
 */
export function useContextCreateInvoice() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useCompanyContext()

  return useMutation({
    mutationFn: (data: Parameters<typeof api.invoices.createManual>[0]) => {
      // Override tenantNip with selected company
      const invoiceData = {
        ...data,
        tenantNip: selectedCompany?.nip || data.tenantNip,
        tenantName: selectedCompany?.companyName || data.tenantName,
      }
      return api.invoices.createManual(invoiceData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

/**
 * Hook for sync operations with currently selected company.
 */
export function useContextRunSync() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useCompanyContext()

  return useMutation({
    mutationFn: (params?: { dateFrom?: string; dateTo?: string }) =>
      api.sync.run({ ...params, nip: selectedCompany?.nip }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sync'] })
    },
  })
}

/**
 * Hook for sync preview with currently selected company.
 */
export function useContextSyncPreview(params?: {
  dateFrom?: string
  dateTo?: string
  enabled?: boolean
}) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: ['sync', 'preview', 'context', selectedCompany?.nip, queryParams],
    queryFn: () => api.sync.preview({ ...queryParams, nip: selectedCompany?.nip }),
    enabled: enabled && !companyLoading && Boolean(selectedCompany),
  })
}

/**
 * Hook for Dataverse sync with currently selected company.
 */
export function useContextStartDvSync() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useCompanyContext()

  return useMutation({
    mutationFn: (params?: { dateFrom?: string; dateTo?: string; pageSize?: number }) => {
      if (!selectedCompany?.id) {
        throw new Error('Brak wybranej firmy')
      }
      return api.dvSync.start({
        settingId: selectedCompany.id,
        ...params,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dv', 'sync'] })
      queryClient.invalidateQueries({ queryKey: ['dv', 'settings'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

/**
 * Hook for getting KSeF status for currently selected company.
 */
export function useContextKsefStatus() {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['ksef', 'status', 'context', selectedCompany?.nip],
    queryFn: () => api.ksef.status(),
    enabled: !companyLoading && Boolean(selectedCompany),
    refetchInterval: 60000,
  })
}

/**
 * Hook for getting Dataverse sessions for currently selected company.
 */
export function useContextDvSessions(activeOnly = false) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['dv', 'sessions', 'context', selectedCompany?.id, { activeOnly }],
    queryFn: async () => {
      if (!selectedCompany?.id) return []
      const response = await api.dvSessions.list(selectedCompany.id, activeOnly)
      return response.sessions
    },
    enabled: !companyLoading && Boolean(selectedCompany?.id),
  })
}

/**
 * Hook for getting sync logs for currently selected company.
 */
export function useContextDvSyncLogs(limit = 50) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['dv', 'sync', 'logs', 'context', selectedCompany?.id, { limit }],
    queryFn: async () => {
      const response = await api.dvSync.getLogs(selectedCompany?.id, limit)
      return response.logs
    },
    enabled: !companyLoading && Boolean(selectedCompany),
  })
}

// ============================================================================
// Test Data Operations
// ============================================================================

export function useGenerateTestData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      nip: string
      companyId?: string
      count?: number
      fromDate?: string
      toDate?: string
      paidPercentage?: number
      ksefPercentage?: number // 0-100, how many should be KSeF vs Manual
    }) => {
      return api.ksefTestdata.generate(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useCleanupTestDataPreview(nip?: string, params?: { fromDate?: string; toDate?: string; source?: 'KSeF' | 'Manual' }) {
  return useQuery({
    queryKey: ['testdata', 'cleanup', 'preview', nip, params],
    queryFn: () => api.ksefTestdata.cleanupPreview(nip!, params),
    enabled: Boolean(nip),
  })
}

export function useCleanupTestData() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      nip: string
      companyId?: string
      dryRun?: boolean
      fromDate?: string
      toDate?: string
      source?: 'KSeF' | 'Manual'
    }) => api.ksefTestdata.cleanup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['testdata'] })
    },
  })
}
