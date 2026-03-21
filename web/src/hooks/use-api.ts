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
  type MpkCenter,
  type MpkCenterCreate,
  type MpkCenterUpdate,
  type MpkApprover,
  type DvSystemUser,
  type BudgetStatus,
  type AppNotification,
  type PendingApproval,
  type BudgetUtilizationReport,
  type ApprovalHistoryReport,
  type Supplier,
  type SupplierCreate,
  type SupplierListParams,
  type SupplierDetailStats,
  type SbAgreement,
  type SbAgreementCreate,
  type SbTemplate,
  type SbTemplateCreate,
  type SelfBillingInvoice,
  type SelfBillingInvoiceListParams,
  type SelfBillingGenerateRequest,
  type SelfBillingGenerateResponse,
  type SelfBillingConfirmRequest,
  type SelfBillingBatchResult,
  type SelfBillingImportResult,
  type SbImportEnrichedRow,
  type SelfBillingInvoiceCreateData,
  type SelfBillingInvoiceUpdateData,
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
        mpkCenterId?: string
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

// ── Invoice Batch Hooks ──

export function useBatchMarkPaidInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.invoices.batchMarkPaid(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useBatchMarkUnpaidInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.invoices.batchMarkUnpaid(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useBatchApproveInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.invoices.batchApprove(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useBatchRejectInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, comment }: { invoiceIds: string[]; comment: string }) =>
      api.invoices.batchReject(invoiceIds, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useBatchDeleteInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.invoices.batchDelete(invoiceIds),
    onSuccess: () => {
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

/**
 * Hook for unified activity feed for currently selected company.
 */
export function useContextDashboardActivity(params?: { top?: number; types?: string }) {
  const { selectedCompany, isLoading: companyLoading } = useCompanyContext()

  return useQuery({
    queryKey: ['dashboard', 'activity', 'context', selectedCompany?.id, params],
    queryFn: () => api.dashboard.activity({
      ...params,
      settingId: selectedCompany?.id,
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

// ============================================================================
// MPK Centers
// ============================================================================

export function useMpkCenters(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.mpkCenters(settingId!),
    queryFn: () => api.mpkCenters.list(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextMpkCenters() {
  const { selectedCompany } = useCompanyContext()
  return useMpkCenters(selectedCompany?.id)
}

export function useMpkCenter(id?: string) {
  return useQuery({
    queryKey: queryKeys.mpkCenter(id!),
    queryFn: () => api.mpkCenters.get(id!),
    enabled: Boolean(id),
  })
}

export function useCreateMpkCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MpkCenterCreate) => api.mpkCenters.create(data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mpkCenters(variables.settingId) })
    },
  })
}

export function useUpdateMpkCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MpkCenterUpdate }) =>
      api.mpkCenters.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mpk-centers'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.mpkCenter(variables.id) })
    },
  })
}

export function useDeactivateMpkCenter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.mpkCenters.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpk-centers'] })
    },
  })
}

export function useApplyApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, scope, dryRun }: { id: string; scope: 'unprocessed' | 'decided' | 'all'; dryRun?: boolean }) =>
      api.mpkCenters.applyApproval(id, scope, dryRun),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpk-centers'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useRevokeApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, scope, dryRun }: { id: string; scope: 'pending' | 'decided' | 'all'; dryRun?: boolean }) =>
      api.mpkCenters.revokeApproval(id, scope, dryRun),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mpk-centers'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

// ============================================================================
// MPK Approvers
// ============================================================================

export function useMpkApprovers(mpkId?: string) {
  return useQuery({
    queryKey: queryKeys.mpkApprovers(mpkId!),
    queryFn: () => api.mpkCenters.getApprovers(mpkId!),
    enabled: Boolean(mpkId),
  })
}

export function useSetMpkApprovers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mpkId, systemUserIds }: { mpkId: string; systemUserIds: string[] }) =>
      api.mpkCenters.setApprovers(mpkId, systemUserIds),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mpkApprovers(variables.mpkId) })
    },
  })
}

// ============================================================================
// MPK Budget Status
// ============================================================================

export function useMpkBudgetStatus(mpkId?: string) {
  return useQuery({
    queryKey: queryKeys.mpkBudgetStatus(mpkId!),
    queryFn: () => api.mpkCenters.getBudgetStatus(mpkId!),
    enabled: Boolean(mpkId),
  })
}

// ============================================================================
// Dataverse System Users
// ============================================================================

export function useDvUsers(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.dvUsers(settingId!),
    queryFn: () => api.users.list(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextDvUsers() {
  const { selectedCompany } = useCompanyContext()
  return useDvUsers(selectedCompany?.id)
}

// ============================================================================
// Approver Overview
// ============================================================================

export function useApproverOverview(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.approverOverview(settingId!),
    queryFn: () => api.approverOverview.get(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextApproverOverview() {
  const { selectedCompany } = useCompanyContext()
  return useApproverOverview(selectedCompany?.id)
}

// ============================================================================
// Approvals
// ============================================================================

export function usePendingApprovals(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.pendingApprovals(settingId!),
    queryFn: () => api.approvals.pending(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextPendingApprovals() {
  const { selectedCompany } = useCompanyContext()
  return usePendingApprovals(selectedCompany?.id)
}

export function useApproveInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, comment }: { invoiceId: string; comment?: string }) =>
      api.approvals.approve(invoiceId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useRejectInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceId, comment }: { invoiceId: string; comment?: string }) =>
      api.approvals.reject(invoiceId, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useCancelApproval() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => api.approvals.cancelApproval(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
    },
  })
}

export function useBulkApprove() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ invoiceIds, comment }: { invoiceIds: string[]; comment?: string }) =>
      api.approvals.bulkApprove(invoiceIds, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['approvals'] })
      queryClient.invalidateQueries({ queryKey: ['budget'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })
}

export function useRefreshApprovers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invoiceId: string) => api.approvals.refreshApprovers(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

// ============================================================================
// Budget
// ============================================================================

export function useBudgetSummary(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.budgetSummary(settingId!),
    queryFn: () => api.budget.summary(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextBudgetSummary() {
  const { selectedCompany } = useCompanyContext()
  return useBudgetSummary(selectedCompany?.id)
}

// ============================================================================
// Notifications
// ============================================================================

export function useNotifications(settingId?: string, options?: { unreadOnly?: boolean; top?: number }) {
  return useQuery({
    queryKey: queryKeys.notifications(settingId!),
    queryFn: () => api.notifications.list(settingId!, options),
    enabled: Boolean(settingId),
    refetchInterval: 60_000,
  })
}

export function useContextNotifications(options?: { unreadOnly?: boolean; top?: number }) {
  const { selectedCompany } = useCompanyContext()
  return useNotifications(selectedCompany?.id, options)
}

export function useNotificationUnreadCount(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.notificationsUnreadCount(settingId!),
    queryFn: () => api.notifications.unreadCount(settingId!),
    enabled: Boolean(settingId),
    refetchInterval: 30_000,
  })
}

export function useContextNotificationUnreadCount() {
  const { selectedCompany } = useCompanyContext()
  return useNotificationUnreadCount(selectedCompany?.id)
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.notifications.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useCompanyContext()

  return useMutation({
    mutationFn: () => {
      const settingId = selectedCompany?.id
      if (!settingId) throw new Error('No company selected')
      return api.notifications.markAllRead(settingId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// ============================================================================
// Reports
// ============================================================================

export function useBudgetUtilizationReport(settingId?: string, mpkCenterId?: string) {
  return useQuery({
    queryKey: queryKeys.reportBudgetUtilization(settingId!, mpkCenterId),
    queryFn: () => api.reports.budgetUtilization(settingId!, mpkCenterId),
    enabled: Boolean(settingId),
  })
}

export function useContextBudgetUtilizationReport(mpkCenterId?: string) {
  const { selectedCompany } = useCompanyContext()
  return useBudgetUtilizationReport(selectedCompany?.id, mpkCenterId)
}

export function useApprovalHistoryReport(
  settingId?: string,
  filters?: { dateFrom?: string; dateTo?: string; mpkCenterId?: string; status?: string }
) {
  return useQuery({
    queryKey: queryKeys.reportApprovalHistory(settingId!, filters),
    queryFn: () => api.reports.approvalHistory(settingId!, filters),
    enabled: Boolean(settingId),
  })
}

export function useContextApprovalHistoryReport(
  filters?: { dateFrom?: string; dateTo?: string; mpkCenterId?: string; status?: string }
) {
  const { selectedCompany } = useCompanyContext()
  return useApprovalHistoryReport(selectedCompany?.id, filters)
}

// ── Approver Performance ──

export function useApproverPerformanceReport(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.reportApproverPerformance(settingId!),
    queryFn: () => api.reports.approverPerformance(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextApproverPerformanceReport() {
  const { selectedCompany } = useCompanyContext()
  return useApproverPerformanceReport(selectedCompany?.id)
}

// ── Invoice Processing Pipeline ──

export function useInvoiceProcessingReport(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.reportInvoiceProcessing(settingId!),
    queryFn: () => api.reports.invoiceProcessing(settingId!),
    enabled: Boolean(settingId),
  })
}

export function useContextInvoiceProcessingReport() {
  const { selectedCompany } = useCompanyContext()
  return useInvoiceProcessingReport(selectedCompany?.id)
}

// ============================================================================
// Suppliers
// ============================================================================

export function useSuppliers(params?: SupplierListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.suppliers(params),
    queryFn: () => api.suppliers.list(params),
    enabled: options?.enabled,
  })
}

export function useContextSuppliers(
  overrides?: Partial<SupplierListParams>,
  options?: { enabled?: boolean }
) {
  const { selectedCompany } = useCompanyContext()
  const params: SupplierListParams | undefined = selectedCompany?.id
    ? { settingId: selectedCompany.id, ...overrides }
    : undefined
  return useSuppliers(params, { enabled: Boolean(selectedCompany?.id) && (options?.enabled ?? true) })
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.supplier(id),
    queryFn: () => api.suppliers.get(id),
    enabled: Boolean(id),
  })
}

export function useSupplierStats(id: string) {
  return useQuery({
    queryKey: queryKeys.supplierStats(id),
    queryFn: () => api.suppliers.stats(id),
    enabled: Boolean(id),
  })
}

export function useSupplierInvoices(id: string) {
  return useQuery({
    queryKey: queryKeys.supplierInvoices(id),
    queryFn: () => api.suppliers.invoices(id),
    enabled: Boolean(id),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SupplierCreate) => api.suppliers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Supplier> }) =>
      api.suppliers.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.suppliers.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

// ── Supplier Batch Hooks ──

export function useBatchDeactivateSuppliers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (supplierIds: string[]) => api.suppliers.batchDeactivate(supplierIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useBatchReactivateSuppliers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (supplierIds: string[]) => api.suppliers.batchReactivate(supplierIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useRefreshSupplierVat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.suppliers.refreshVat(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier(id) })
    },
  })
}

export function useCreateSupplierFromVat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ nip, settingId }: { nip: string; settingId: string }) =>
      api.suppliers.createFromVat(nip, settingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useImportSuppliers() {
  return useMutation({
    mutationFn: (data: { file: File; settingId: string }) =>
      api.suppliers.import(data.file, data.settingId),
  })
}

export function useConfirmSupplierImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { settingId: string; rows: import('@/lib/api').SupplierImportEnrichedRow[] }) =>
      api.suppliers.confirmImport(data.settingId, data.rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

// ============================================================================
// Self-Billing Agreements
// ============================================================================

export function useSbAgreements(params?: { settingId?: string; supplierId?: string }) {
  return useQuery({
    queryKey: queryKeys.sbAgreements(params),
    queryFn: () => api.sbAgreements.list(params),
    enabled: Boolean(params?.settingId),
  })
}

export function useContextSbAgreements(supplierId?: string) {
  const { selectedCompany } = useCompanyContext()
  return useSbAgreements(
    selectedCompany?.id ? { settingId: selectedCompany.id, supplierId } : undefined
  )
}

export function useSbAgreement(id: string) {
  return useQuery({
    queryKey: queryKeys.sbAgreement(id),
    queryFn: () => api.sbAgreements.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateSbAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SbAgreementCreate) => api.sbAgreements.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-agreements'] })
    },
  })
}

export function useUpdateSbAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SbAgreement> }) =>
      api.sbAgreements.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-agreements'] })
    },
  })
}

export function useTerminateSbAgreement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbAgreements.terminate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-agreements'] })
    },
  })
}

// ============================================================================
// Self-Billing Templates
// ============================================================================

export function useSbTemplates(params?: { settingId?: string; supplierId?: string }) {
  return useQuery({
    queryKey: queryKeys.sbTemplates(params),
    queryFn: () => api.sbTemplates.list(params),
    enabled: Boolean(params?.settingId),
  })
}

export function useContextSbTemplates(supplierId?: string) {
  const { selectedCompany } = useCompanyContext()
  return useSbTemplates(
    selectedCompany?.id ? { settingId: selectedCompany.id, supplierId } : undefined
  )
}

export function useSbTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.sbTemplate(id),
    queryFn: () => api.sbTemplates.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateSbTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SbTemplateCreate) => api.sbTemplates.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-templates'] })
    },
  })
}

export function useUpdateSbTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SbTemplate> }) =>
      api.sbTemplates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-templates'] })
    },
  })
}

export function useDeleteSbTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbTemplates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-templates'] })
    },
  })
}

export function useDuplicateSbTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbTemplates.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sb-templates'] })
    },
  })
}

// ============================================================================
// Self-Billing Invoices
// ============================================================================

export function useSelfBillingInvoices(
  params?: SelfBillingInvoiceListParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoices(params),
    queryFn: () => api.selfBilling.list(params),
    enabled: options?.enabled ?? Boolean(params?.settingId),
  })
}

export function useContextSelfBillingInvoices(
  overrides?: Partial<SelfBillingInvoiceListParams>,
  options?: { enabled?: boolean }
) {
  const { selectedCompany } = useCompanyContext()
  const params: SelfBillingInvoiceListParams | undefined = selectedCompany?.id
    ? { settingId: selectedCompany.id, ...overrides }
    : undefined
  return useSelfBillingInvoices(params, { enabled: Boolean(selectedCompany?.id) && (options?.enabled ?? true) })
}

export function useSelfBillingInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoice(id),
    queryFn: () => api.selfBilling.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateSelfBillingInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SelfBillingInvoiceCreateData) => api.selfBilling.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useUpdateSelfBillingInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SelfBillingInvoiceUpdateData }) =>
      api.selfBilling.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useDeleteSelfBillingInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.selfBilling.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function usePreviewSelfBilling() {
  return useMutation({
    mutationFn: (data: SelfBillingGenerateRequest) => api.selfBilling.preview(data),
  })
}

export function useGenerateSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SelfBillingGenerateRequest) => api.selfBilling.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useConfirmGeneratedSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SelfBillingConfirmRequest) => api.selfBilling.confirmGenerated(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useSubmitSelfBillingForReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.selfBilling.submit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useApproveSelfBillingInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment, invoiceNumber }: { id: string; comment?: string; invoiceNumber?: string }) =>
      api.selfBilling.approve(id, comment, invoiceNumber),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useRejectSelfBillingInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.selfBilling.reject(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useSendSelfBillingToKsef() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.selfBilling.sendToKsef(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useRevertSelfBillingToDraft() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.selfBilling.revertToDraft(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useImportSelfBilling() {
  return useMutation({
    mutationFn: (data: { file: File; settingId: string }) =>
      api.selfBilling.import(data.file, data.settingId),
  })
}

export function useConfirmSelfBillingImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { settingId: string; rows: SbImportEnrichedRow[] }) =>
      api.selfBilling.confirmImport(data.settingId, data.rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

// ── SB Batch Action Hooks ──────────────────────────────────────────

export function useBatchSubmitSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.selfBilling.batchSubmit(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useBatchApproveSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.selfBilling.batchApprove(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useBatchRejectSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, reason }: { invoiceIds: string[]; reason: string }) =>
      api.selfBilling.batchReject(invoiceIds, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useBatchSendToKsef() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.selfBilling.batchSendToKsef(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function useBatchDeleteSelfBilling() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds: string[]) => api.selfBilling.batchDelete(invoiceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['self-billing'] })
    },
  })
}

export function usePendingSbApprovals(settingId?: string, all?: boolean) {
  return useQuery({
    queryKey: queryKeys.sbPendingApprovals(settingId),
    queryFn: () => api.selfBilling.pendingApprovals(settingId, all),
    enabled: Boolean(settingId),
  })
}

export function useContextPendingSbApprovals(all?: boolean) {
  const { selectedCompany } = useCompanyContext()
  return usePendingSbApprovals(selectedCompany?.id, all)
}

// ── SB Invoice Notes ─────────────────────────────────────────────

export function useSbInvoiceNotes(sbInvoiceId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId),
    queryFn: () => api.selfBilling.listNotes(sbInvoiceId),
    enabled: Boolean(sbInvoiceId) && enabled,
  })
}

export function useCreateSbInvoiceNote(sbInvoiceId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { subject?: string; noteText: string }) =>
      api.selfBilling.createNote(sbInvoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId) })
    },
  })
}

// ── SB Agreement Attachments ─────────────────────────────────────

export function useSbAgreementAttachments(agreementId: string) {
  return useQuery({
    queryKey: ['sb-agreements', agreementId, 'attachments'] as const,
    queryFn: () => api.sbAgreements.listAttachments(agreementId),
    enabled: !!agreementId,
  })
}

export function useUploadSbAgreementAttachment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ agreementId, data }: {
      agreementId: string
      data: { fileName: string; content: string; contentType: string }
    }) => api.sbAgreements.uploadAttachment(agreementId, data),
    onSuccess: (_data, { agreementId }) => {
      queryClient.invalidateQueries({
        queryKey: ['sb-agreements', agreementId, 'attachments'],
      })
    },
  })
}

// ── SB Import Template Download ──────────────────────────────────

export function useDownloadSbImportTemplate() {
  return useQuery({
    queryKey: ['self-billing', 'import-template'] as const,
    queryFn: () => api.selfBilling.downloadTemplate(),
    enabled: false,
  })
}
