import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, queryKeys, Invoice, InvoiceListParams, SyncResult, KsefSetting, CostCenter } from '../lib/api'

// ============================================================================
// KSeF Status & Session
// ============================================================================

export function useKsefStatus() {
  return useQuery({
    queryKey: queryKeys.ksefStatus,
    queryFn: () => api.ksef.status(),
    refetchInterval: 60000, // Refresh every minute
  })
}

export function useKsefSession() {
  return useQuery({
    queryKey: queryKeys.ksefSession,
    queryFn: () => api.ksef.getSession(),
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
  const { enabled = true, ...queryParams } = params || {}

  return useQuery({
    queryKey: queryKeys.syncPreview(queryParams),
    queryFn: () => api.sync.preview(queryParams),
    enabled,
  })
}

export function useRunSync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params?: { nip?: string; dateFrom?: string; dateTo?: string }) =>
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
    }: {
      referenceNumbers: string[]
      nip?: string
    }) => api.sync.import(referenceNumbers, nip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['sync'] })
    },
  })
}

// ============================================================================
// Invoices
// ============================================================================

export function useInvoices(params?: InvoiceListParams) {
  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: () => api.invoices.list(params),
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
      name: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
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
