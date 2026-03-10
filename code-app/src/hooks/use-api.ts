/**
 * React Query hooks for all API endpoints.
 *
 * Wraps the `api` object with `useQuery` / `useMutation` for
 * declarative data fetching in components.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import { FALLBACK_FORECAST_META, FALLBACK_ANOMALY_META } from '@/lib/forecast-metadata'
import type {
  DashboardStats,
  ForecastResult,
  ForecastParams,
  ForecastAlgorithmsResponse,
  GroupedForecastResponse,
  AnomalyResult,
  AnomalySummary,
  AnomalyParams,
  AnomalyRulesResponse,
  Invoice,
  InvoiceListResponse,
  InvoiceListParams,
  InvoiceUpdateData,
  ManualInvoiceCreate,
  KsefStatus,
  KsefSession,
  SyncPreviewResponse,
  SyncResult,
  KsefSetting,
  CostCenter,
  TokenTestResult,
  DetailedHealthResponse,
  VatLookupResponse,
  VatValidateResponse,
  Attachment,
  AttachmentUpload,
  Note,
  NoteCreate,
  NoteUpdate,
  DocumentUpload,
  DocumentDownload,
  DocumentConfig,
  DocumentInfo,
  AiCategorizationResult,
  AiBatchCategorizationResult,
  ExchangeRateResponse,
  ConversionResponse,
  DvSetting,
  DvSettingCreate,
  DvSettingUpdate,
  DvSession,
  DvSyncLog,
  DvSyncStart,
  DvSyncResult,
  DvSyncStats,
  DocumentExtractRequest,
  ExtractionResult,
  KsefTestdataEnvironmentsResponse,
  KsefTestdataPermissionsResponse,
  KsefGrantPermissionsRequest,
  KsefGrantPermissionsResponse,
  KsefCreateTestPersonRequest,
  KsefCreateTestPersonResponse,
  KsefGenerateTestDataRequest,
  KsefGenerateTestDataResponse,
  KsefCleanupPreviewResponse,
  KsefCleanupRequest,
  KsefCleanupResponse,
  MpkCenter,
  MpkCenterCreate,
  MpkCenterUpdate,
  MpkApprover,
  DvSystemUser,
  BudgetStatus,
  BudgetUtilizationReport,
  PendingApproval,
  ApprovalHistoryReport,
  ApproverPerformanceReport,
  ProcessingPipelineReport,
  AppNotification,
} from '@/lib/types'

// ─── Health ──────────────────────────────────────────────────────

export function useHealth(
  options?: Partial<UseQueryOptions<{ status: string }>>
) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.health(),
    ...options,
  })
}

export function useHealthDetailed(
  environment?: string,
  options?: Partial<UseQueryOptions<DetailedHealthResponse>>
) {
  return useQuery({
    queryKey: queryKeys.healthDetailed,
    queryFn: () => api.healthDetailed(environment),
    ...options,
  })
}

// ─── Dashboard ───────────────────────────────────────────────────

export function useDashboardStats(
  params?: {
    fromDate?: string
    toDate?: string
    tenantNip?: string
    settingId?: string
  },
  options?: Partial<UseQueryOptions<DashboardStats>>
) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(params),
    queryFn: () => api.dashboard.stats(params),
    ...options,
  })
}

// ─── Forecast ────────────────────────────────────────────────────

export function useForecastMonthly(
  params?: ForecastParams,
  options?: Partial<UseQueryOptions<ForecastResult>>
) {
  return useQuery({
    queryKey: queryKeys.forecastMonthly(params),
    queryFn: () => api.forecast.monthly(params),
    ...options,
  })
}

export function useForecastByMpk(
  params?: ForecastParams,
  options?: Partial<UseQueryOptions<GroupedForecastResponse>>
) {
  return useQuery({
    queryKey: queryKeys.forecastByMpk(params),
    queryFn: () => api.forecast.byMpk(params),
    ...options,
  })
}

export function useForecastByCategory(
  params?: ForecastParams,
  options?: Partial<UseQueryOptions<GroupedForecastResponse>>
) {
  return useQuery({
    queryKey: queryKeys.forecastByCategory(params),
    queryFn: () => api.forecast.byCategory(params),
    ...options,
  })
}

export function useForecastBySupplier(
  params?: ForecastParams & { top?: number },
  options?: Partial<UseQueryOptions<GroupedForecastResponse>>
) {
  return useQuery({
    queryKey: queryKeys.forecastBySupplier(params),
    queryFn: () => api.forecast.bySupplier(params),
    ...options,
  })
}

// ─── Anomalies ───────────────────────────────────────────────────

export function useAnomalies(
  params?: AnomalyParams,
  options?: Partial<UseQueryOptions<AnomalyResult>>
) {
  return useQuery({
    queryKey: queryKeys.anomalies(params),
    queryFn: () => api.anomalies.list(params),
    ...options,
  })
}

export function useAnomaliesSummary(
  params?: AnomalyParams,
  options?: Partial<UseQueryOptions<AnomalySummary>>
) {
  return useQuery({
    queryKey: queryKeys.anomaliesSummary(params),
    queryFn: () => api.anomalies.summary(params),
    ...options,
  })
}

export function useForecastAlgorithms(
  options?: Partial<UseQueryOptions<ForecastAlgorithmsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.forecastAlgorithms,
    queryFn: async () => {
      try {
        return await api.forecast.algorithms()
      } catch {
        // Fallback when the metadata endpoint is not yet deployed
        return FALLBACK_FORECAST_META
      }
    },
    staleTime: Infinity,
    placeholderData: FALLBACK_FORECAST_META,
    ...options,
  })
}

export function useAnomalyRules(
  options?: Partial<UseQueryOptions<AnomalyRulesResponse>>
) {
  return useQuery({
    queryKey: queryKeys.anomalyRules,
    queryFn: async () => {
      try {
        return await api.anomalies.rules()
      } catch {
        // Fallback when the metadata endpoint is not yet deployed
        return FALLBACK_ANOMALY_META
      }
    },
    staleTime: Infinity,
    placeholderData: FALLBACK_ANOMALY_META,
    ...options,
  })
}

// ─── KSeF ────────────────────────────────────────────────────────

export function useKsefStatus(
  params?: { companyId?: string; nip?: string; environment?: string },
  options?: Partial<UseQueryOptions<KsefStatus>>
) {
  return useQuery({
    queryKey: queryKeys.ksefStatus,
    queryFn: () => api.ksef.status(params),
    ...options,
  })
}

export function useKsefSession(
  options?: Partial<UseQueryOptions<{ session: KsefSession | null }>>
) {
  return useQuery({
    queryKey: queryKeys.ksefSession,
    queryFn: () => api.ksef.getSession(),
    ...options,
  })
}

export function useStartKsefSession(
  options?: UseMutationOptions<
    { success: boolean; session: KsefSession },
    Error,
    string | undefined
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nip?: string) => api.ksef.startSession(nip),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ksefSession })
      void qc.invalidateQueries({ queryKey: queryKeys.ksefStatus })
    },
    ...options,
  })
}

export function useEndKsefSession(
  options?: UseMutationOptions<{ success: boolean }, Error, void>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.ksef.endSession(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.ksefSession })
      void qc.invalidateQueries({ queryKey: queryKeys.ksefStatus })
    },
    ...options,
  })
}

// ─── Sync ────────────────────────────────────────────────────────

export function useSyncPreview(
  params?: {
    nip?: string
    settingId?: string
    dateFrom?: string
    dateTo?: string
  },
  options?: Partial<UseQueryOptions<SyncPreviewResponse>>
) {
  return useQuery({
    queryKey: queryKeys.syncPreview(params),
    queryFn: () => api.sync.preview(params),
    enabled: false, // manual trigger
    ...options,
  })
}

export function useRunSync(
  options?: UseMutationOptions<
    SyncResult,
    Error,
    {
      nip?: string
      settingId?: string
      dateFrom?: string
      dateTo?: string
    }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params) => api.sync.run(params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['sync'] })
    },
    ...options,
  })
}

export function useImportInvoices(
  options?: UseMutationOptions<
    SyncResult,
    Error,
    { referenceNumbers: string[]; nip?: string; settingId?: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ referenceNumbers, nip, settingId }) =>
      api.sync.import(referenceNumbers, nip, settingId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['sync'] })
    },
    ...options,
  })
}

// ─── Invoices ────────────────────────────────────────────────────

export function useInvoices(
  params?: InvoiceListParams,
  options?: Partial<UseQueryOptions<InvoiceListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.invoices(params),
    queryFn: () => api.invoices.list(params),
    ...options,
  })
}

export function useInvoice(
  id: string,
  options?: Partial<UseQueryOptions<Invoice>>
) {
  return useQuery({
    queryKey: queryKeys.invoice(id),
    queryFn: () => api.invoices.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useUpdateInvoice(
  options?: UseMutationOptions<
    Invoice,
    Error,
    { id: string; data: InvoiceUpdateData }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.invoices.update(id, data),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoice(id) })
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

export function useDeleteInvoice(
  options?: UseMutationOptions<void, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.invoices.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

export function useMarkInvoiceAsPaid(
  options?: UseMutationOptions<
    Invoice,
    Error,
    { id: string; paymentDate?: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paymentDate }) =>
      api.invoices.markAsPaid(id, paymentDate),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoice(id) })
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    ...options,
  })
}

export function useCreateManualInvoice(
  options?: UseMutationOptions<Invoice, Error, ManualInvoiceCreate>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.invoices.createManual(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

// ─── Attachments ─────────────────────────────────────────────────

export function useInvoiceAttachments(
  invoiceId: string,
  options?: Partial<
    UseQueryOptions<{ attachments: Attachment[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.invoiceAttachments(invoiceId),
    queryFn: () => api.invoices.listAttachments(invoiceId),
    enabled: !!invoiceId,
    ...options,
  })
}

export function useUploadAttachment(
  options?: UseMutationOptions<
    Attachment,
    Error,
    { invoiceId: string; data: AttachmentUpload }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }) =>
      api.invoices.uploadAttachment(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceAttachments(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
    },
    ...options,
  })
}

export function useDeleteAttachment(
  options?: UseMutationOptions<
    void,
    Error,
    { attachmentId: string; invoiceId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId }) =>
      api.invoices.deleteAttachment(attachmentId),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceAttachments(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
    },
    ...options,
  })
}

// ─── Notes ───────────────────────────────────────────────────────

export function useInvoiceNotes(
  invoiceId: string,
  options?: Partial<UseQueryOptions<{ notes: Note[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.invoiceNotes(invoiceId),
    queryFn: () => api.invoices.listNotes(invoiceId),
    enabled: !!invoiceId,
    ...options,
  })
}

export function useCreateNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { invoiceId: string; data: NoteCreate }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }) =>
      api.invoices.createNote(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceNotes(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
    },
    ...options,
  })
}

export function useUpdateNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { noteId: string; data: NoteUpdate; invoiceId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, data }) => api.invoices.updateNote(noteId, data),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceNotes(invoiceId),
      })
    },
    ...options,
  })
}

export function useDeleteNote(
  options?: UseMutationOptions<
    void,
    Error,
    { noteId: string; invoiceId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId }) => api.invoices.deleteNote(noteId),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceNotes(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
    },
    ...options,
  })
}

// ─── Documents ───────────────────────────────────────────────────

export function useInvoiceDocument(
  invoiceId: string,
  options?: Partial<UseQueryOptions<DocumentDownload>>
) {
  return useQuery({
    queryKey: queryKeys.invoiceDocument(invoiceId),
    queryFn: () => api.invoices.downloadDocument(invoiceId),
    enabled: false, // manual — documents are large
    ...options,
  })
}

export function useDocumentConfig(
  options?: Partial<UseQueryOptions<DocumentConfig>>
) {
  return useQuery({
    queryKey: queryKeys.documentConfig,
    queryFn: () => api.invoices.getDocumentConfig(),
    staleTime: 30 * 60 * 1000, // 30 min
    ...options,
  })
}

export function useUploadDocument(
  options?: UseMutationOptions<
    { success: boolean; document: DocumentInfo },
    Error,
    { invoiceId: string; data: DocumentUpload }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, data }) =>
      api.invoices.uploadDocument(invoiceId, data),
    onSuccess: (_, { invoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceDocument(invoiceId),
      })
    },
    ...options,
  })
}

export function useDeleteDocument(
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    string // invoiceId
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId) => api.invoices.deleteDocument(invoiceId),
    onSuccess: (_, invoiceId) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
      void qc.invalidateQueries({
        queryKey: queryKeys.invoiceDocument(invoiceId),
      })
    },
    ...options,
  })
}

// ─── AI ──────────────────────────────────────────────────────────

export function useCategorizeWithAI(
  options?: UseMutationOptions<AiCategorizationResult, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId) => api.invoices.categorizeWithAI(invoiceId),
    onSuccess: (_, invoiceId) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      })
    },
    ...options,
  })
}

export function useBatchCategorize(
  options?: UseMutationOptions<AiBatchCategorizationResult, Error, { invoiceIds: string[]; autoApply?: boolean }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, autoApply }: { invoiceIds: string[]; autoApply?: boolean }) =>
      api.invoices.batchCategorizeWithAI(invoiceIds, autoApply),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

// ─── Settings ────────────────────────────────────────────────────

export function useCompanies(
  options?: Partial<UseQueryOptions<{ settings: KsefSetting[] }>>
) {
  return useQuery({
    queryKey: queryKeys.companies,
    queryFn: () => api.settings.listCompanies(),
    ...options,
  })
}

export function useCompany(
  id: string,
  options?: Partial<UseQueryOptions<KsefSetting>>
) {
  return useQuery({
    queryKey: queryKeys.company(id),
    queryFn: () => api.settings.getCompany(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateCompany(
  options?: UseMutationOptions<
    KsefSetting,
    Error,
    {
      nip: string
      companyName: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
    }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.settings.createCompany(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.companies })
    },
    ...options,
  })
}

export function useUpdateCompany(
  options?: UseMutationOptions<
    KsefSetting,
    Error,
    { id: string; data: Partial<KsefSetting> }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.settings.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.company(id) })
      void qc.invalidateQueries({ queryKey: queryKeys.companies })
    },
    ...options,
  })
}

export function useDeleteCompany(
  options?: UseMutationOptions<void, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.settings.deleteCompany(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.companies })
    },
    ...options,
  })
}

export function useTestToken(
  options?: UseMutationOptions<TokenTestResult, Error, string>
) {
  return useMutation({
    mutationFn: (id) => api.settings.testToken(id),
    ...options,
  })
}

export function useCostCenters(
  options?: Partial<UseQueryOptions<{ costCenters: CostCenter[] }>>
) {
  return useQuery({
    queryKey: queryKeys.costCenters,
    queryFn: () => api.settings.listCostCenters(),
    ...options,
  })
}

export function useCreateCostCenter(
  options?: UseMutationOptions<
    CostCenter,
    Error,
    { code: string; name: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.settings.createCostCenter(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
    ...options,
  })
}

export function useUpdateCostCenter(
  options?: UseMutationOptions<
    CostCenter,
    Error,
    { id: string; data: Partial<CostCenter> }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.settings.updateCostCenter(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
    ...options,
  })
}

export function useDeleteCostCenter(
  options?: UseMutationOptions<void, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.settings.deleteCostCenter(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.costCenters })
    },
    ...options,
  })
}

// ─── VAT White List ──────────────────────────────────────────────

export function useVatLookup(
  options?: UseMutationOptions<VatLookupResponse, Error, { nip?: string; regon?: string }>
) {
  return useMutation({
    mutationFn: (params) => api.vat.lookup(params),
    ...options,
  })
}

export function useVatValidate(
  nip: string,
  options?: Partial<UseQueryOptions<VatValidateResponse>>
) {
  return useQuery({
    queryKey: queryKeys.vatLookup(nip),
    queryFn: () => api.vat.validate(nip),
    enabled: !!nip && nip.length === 10,
    ...options,
  })
}

// ─── Recent Suppliers ────────────────────────────────────────────

export interface RecentSupplier {
  nip: string
  name: string
  address?: string
  lastInvoiceDate?: string
  invoiceCount: number
}

export function useRecentSuppliers(options?: {
  tenantNip?: string
  limit?: number
  enabled?: boolean
}) {
  const { tenantNip, limit = 10, enabled = true } = options ?? {}

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.recentSuppliers(tenantNip),
    queryFn: async () => {
      const response = await api.invoices.list({
        tenantNip,
        orderBy: 'invoiceDate',
        orderDirection: 'desc',
      })

      const supplierMap = new Map<string, RecentSupplier>()

      for (const invoice of response.invoices) {
        if (!invoice.supplierNip) continue
        const existing = supplierMap.get(invoice.supplierNip)
        if (existing) {
          existing.invoiceCount++
          if (
            !existing.lastInvoiceDate ||
            invoice.invoiceDate > existing.lastInvoiceDate
          ) {
            existing.lastInvoiceDate = invoice.invoiceDate
          }
        } else {
          supplierMap.set(invoice.supplierNip, {
            nip: invoice.supplierNip,
            name: invoice.supplierName,
            address: invoice.supplierAddress,
            lastInvoiceDate: invoice.invoiceDate,
            invoiceCount: 1,
          })
        }
      }

      return Array.from(supplierMap.values())
        .sort((a, b) => b.invoiceCount - a.invoiceCount)
        .slice(0, limit)
    },
    enabled: enabled && !!tenantNip,
    staleTime: 5 * 60 * 1000,
  })

  const filter = (query: string): RecentSupplier[] => {
    if (!data || !query) return data || []
    const q = query.toLowerCase()
    return data.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.nip.includes(query.replace(/\D/g, ''))
    )
  }

  return {
    suppliers: data || [],
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    filter,
  }
}

// ─── Exchange Rates ──────────────────────────────────────────────

export function useExchangeRate(
  currency: 'EUR' | 'USD',
  date?: string,
  options?: Partial<UseQueryOptions<ExchangeRateResponse>>
) {
  return useQuery({
    queryKey: queryKeys.exchangeRate(currency, date),
    queryFn: () => api.exchangeRates.get(currency, date),
    ...options,
  })
}

export function useConvertCurrency(
  options?: UseMutationOptions<
    ConversionResponse,
    Error,
    { amount: number; currency: 'EUR' | 'USD'; date?: string }
  >
) {
  return useMutation({
    mutationFn: ({ amount, currency, date }) =>
      api.exchangeRates.convert(amount, currency, date),
    ...options,
  })
}

// ─── Dataverse Settings ─────────────────────────────────────────

export function useDvSettings(
  activeOnly?: boolean,
  options?: Partial<
    UseQueryOptions<{ settings: DvSetting[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.dvSettings(activeOnly),
    queryFn: () => api.dvSettings.list(activeOnly),
    ...options,
  })
}

export function useDvSetting(
  id: string,
  options?: Partial<UseQueryOptions<DvSetting>>
) {
  return useQuery({
    queryKey: queryKeys.dvSetting(id),
    queryFn: () => api.dvSettings.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateDvSetting(
  options?: UseMutationOptions<DvSetting, Error, DvSettingCreate>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.dvSettings.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dv', 'settings'] })
    },
    ...options,
  })
}

export function useUpdateDvSetting(
  options?: UseMutationOptions<
    DvSetting,
    Error,
    { id: string; data: DvSettingUpdate }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.dvSettings.update(id, data),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.dvSetting(id) })
      void qc.invalidateQueries({ queryKey: ['dv', 'settings'] })
    },
    ...options,
  })
}

export function useDeleteDvSetting(
  options?: UseMutationOptions<
    { message: string; id: string },
    Error,
    string
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.dvSettings.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dv', 'settings'] })
    },
    ...options,
  })
}

// ─── Dataverse Sessions ─────────────────────────────────────────

export function useDvSessions(
  settingId: string,
  activeOnly?: boolean,
  options?: Partial<
    UseQueryOptions<{ sessions: DvSession[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.dvSessions(settingId, activeOnly),
    queryFn: () => api.dvSessions.list(settingId, activeOnly),
    enabled: !!settingId,
    ...options,
  })
}

export function useDvSessionActive(
  nip: string,
  options?: Partial<
    UseQueryOptions<{ active: boolean; session: DvSession | null }>
  >
) {
  return useQuery({
    queryKey: queryKeys.dvSessionActive(nip),
    queryFn: () => api.dvSessions.getActive(nip),
    enabled: !!nip,
    ...options,
  })
}

export function useTerminateDvSession(
  options?: UseMutationOptions<
    { message: string; id: string },
    Error,
    string
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.dvSessions.terminate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dv', 'sessions'] })
    },
    ...options,
  })
}

export function useCleanupDvSessions(
  options?: UseMutationOptions<
    { message: string; expiredCount: number },
    Error,
    void
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.dvSessions.cleanup(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['dv', 'sessions'] })
    },
    ...options,
  })
}

// ─── Dataverse Sync ──────────────────────────────────────────────

export function useDvSyncStart(
  options?: UseMutationOptions<DvSyncResult, Error, DvSyncStart>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.dvSync.start(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['dv', 'sync'] })
    },
    ...options,
  })
}

export function useDvSyncLogs(
  settingId?: string,
  limit?: number,
  options?: Partial<
    UseQueryOptions<{ logs: DvSyncLog[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.dvSyncLogs(settingId, limit),
    queryFn: () => api.dvSync.getLogs(settingId, limit),
    ...options,
  })
}

export function useDvSyncLog(
  id: string,
  options?: Partial<UseQueryOptions<DvSyncLog>>
) {
  return useQuery({
    queryKey: queryKeys.dvSyncLog(id),
    queryFn: () => api.dvSync.getLog(id),
    enabled: !!id,
    ...options,
  })
}

export function useDvSyncStats(
  settingId: string,
  options?: Partial<UseQueryOptions<DvSyncStats>>
) {
  return useQuery({
    queryKey: queryKeys.dvSyncStats(settingId),
    queryFn: () => api.dvSync.getStats(settingId),
    enabled: !!settingId,
    ...options,
  })
}

// ─── Document Extraction ────────────────────────────────────────

export function useExtractDocument(
  options?: UseMutationOptions<
    ExtractionResult,
    Error,
    DocumentExtractRequest
  >
) {
  return useMutation({
    mutationFn: (data) => api.documents.extract(data),
    ...options,
  })
}

// ─── KSeF Testdata ───────────────────────────────────────────────

export function useKsefTestdataEnvironments(
  options?: Partial<UseQueryOptions<KsefTestdataEnvironmentsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.ksefTestdataEnvironments,
    queryFn: () => api.ksefTestdata.getEnvironments(),
    staleTime: 60 * 60 * 1000, // 1 hour
    ...options,
  })
}

export function useKsefTestdataPermissions(
  nip: string,
  options?: Partial<UseQueryOptions<KsefTestdataPermissionsResponse>>
) {
  return useQuery({
    queryKey: queryKeys.ksefTestdataPermissions(nip),
    queryFn: () => api.ksefTestdata.checkPermissions(nip),
    enabled: !!nip,
    ...options,
  })
}

export function useGrantKsefPermissions(
  options?: UseMutationOptions<
    KsefGrantPermissionsResponse,
    Error,
    KsefGrantPermissionsRequest
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.ksefTestdata.grantPermissions(data),
    onSuccess: (_, { nip }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.ksefTestdataPermissions(nip),
      })
    },
    ...options,
  })
}

export function useCreateTestPerson(
  options?: UseMutationOptions<
    KsefCreateTestPersonResponse,
    Error,
    KsefCreateTestPersonRequest
  >
) {
  return useMutation({
    mutationFn: (data) => api.ksefTestdata.createTestPerson(data),
    ...options,
  })
}

export function useGenerateTestData(
  options?: UseMutationOptions<
    KsefGenerateTestDataResponse,
    Error,
    KsefGenerateTestDataRequest
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.ksefTestdata.generate(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

export function useKsefCleanupPreview(
  nip: string,
  params?: { fromDate?: string; toDate?: string; source?: 'KSeF' | 'Manual' },
  options?: Partial<UseQueryOptions<KsefCleanupPreviewResponse>>
) {
  return useQuery({
    queryKey: queryKeys.ksefTestdataCleanupPreview(nip),
    queryFn: () => api.ksefTestdata.cleanupPreview(nip, params),
    enabled: false, // manual trigger
    ...options,
  })
}

export function useKsefCleanup(
  options?: UseMutationOptions<KsefCleanupResponse, Error, KsefCleanupRequest>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.ksefTestdata.cleanup(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

// ─── MPK Centers ─────────────────────────────────────────────────

export function useMpkCenters(
  settingId: string,
  options?: Partial<UseQueryOptions<{ mpkCenters: MpkCenter[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.mpkCenters(settingId),
    queryFn: () => api.mpkCenters.list(settingId),
    enabled: !!settingId,
    ...options,
  })
}

export function useMpkCenter(
  id: string,
  options?: Partial<UseQueryOptions<{ mpkCenter: MpkCenter }>>
) {
  return useQuery({
    queryKey: queryKeys.mpkCenter(id),
    queryFn: () => api.mpkCenters.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateMpkCenter(
  options?: UseMutationOptions<{ mpkCenter: MpkCenter }, Error, MpkCenterCreate>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.mpkCenters.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
    },
    ...options,
  })
}

export function useUpdateMpkCenter(
  options?: UseMutationOptions<
    { mpkCenter: MpkCenter },
    Error,
    { id: string; data: MpkCenterUpdate }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.mpkCenters.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
    },
    ...options,
  })
}

export function useDeactivateMpkCenter(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.mpkCenters.deactivate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
    },
    ...options,
  })
}

export function useMpkApprovers(
  mpkCenterId: string,
  options?: Partial<
    UseQueryOptions<{ approvers: MpkApprover[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.mpkApprovers(mpkCenterId),
    queryFn: () => api.mpkCenters.getApprovers(mpkCenterId),
    enabled: !!mpkCenterId,
    ...options,
  })
}

export function useSetMpkApprovers(
  options?: UseMutationOptions<
    { approvers: MpkApprover[]; count: number },
    Error,
    { id: string; systemUserIds: string[] }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, systemUserIds }) =>
      api.mpkCenters.setApprovers(id, systemUserIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
    },
    ...options,
  })
}

export function useMpkBudgetStatus(
  mpkCenterId: string,
  options?: Partial<UseQueryOptions<{ data: BudgetStatus }>>
) {
  return useQuery({
    queryKey: queryKeys.mpkBudgetStatus(mpkCenterId),
    queryFn: () => api.mpkCenters.getBudgetStatus(mpkCenterId),
    enabled: !!mpkCenterId,
    ...options,
  })
}

// ─── Users ───────────────────────────────────────────────────────

export function useDvUsers(
  settingId: string,
  options?: Partial<UseQueryOptions<{ users: DvSystemUser[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.dvUsers(settingId),
    queryFn: () => api.users.list(settingId),
    enabled: !!settingId,
    ...options,
  })
}

// ─── Approvals ───────────────────────────────────────────────────

export function usePendingApprovals(
  settingId: string,
  options?: Partial<
    UseQueryOptions<{ approvals: PendingApproval[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.pendingApprovals(settingId),
    queryFn: () => api.approvals.pending(settingId),
    enabled: !!settingId,
    ...options,
  })
}

export function useApproveInvoice(
  options?: UseMutationOptions<
    { invoice: Invoice },
    Error,
    { invoiceId: string; comment?: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, comment }) =>
      api.approvals.approve(invoiceId, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useRejectInvoice(
  options?: UseMutationOptions<
    { invoice: Invoice },
    Error,
    { invoiceId: string; comment?: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, comment }) =>
      api.approvals.reject(invoiceId, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useCancelApproval(
  options?: UseMutationOptions<{ invoice: Invoice }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId) => api.approvals.cancelApproval(invoiceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
    },
    ...options,
  })
}

export function useBulkApprove(
  options?: UseMutationOptions<
    { results: Array<{ invoiceId: string; success: boolean; error?: string }> },
    Error,
    { invoiceIds: string[]; comment?: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, comment }) =>
      api.approvals.bulkApprove(invoiceIds, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useRefreshApprovers(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceId) => api.approvals.refreshApprovers(invoiceId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
    },
    ...options,
  })
}

// ─── Budget ──────────────────────────────────────────────────────

export function useBudgetSummary(
  settingId: string,
  options?: Partial<
    UseQueryOptions<{ data: BudgetStatus[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.budgetSummary(settingId),
    queryFn: () => api.budget.summary(settingId),
    enabled: !!settingId,
    ...options,
  })
}

// ─── Notifications ───────────────────────────────────────────────

export function useNotifications(
  settingId: string,
  options_?: { unreadOnly?: boolean; top?: number },
  queryOptions?: Partial<
    UseQueryOptions<{ data: AppNotification[]; count: number }>
  >
) {
  return useQuery({
    queryKey: queryKeys.notifications(settingId),
    queryFn: () => api.notifications.list(settingId, options_),
    enabled: !!settingId,
    ...queryOptions,
  })
}

export function useNotificationsUnreadCount(
  settingId: string,
  options?: Partial<UseQueryOptions<{ count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.notificationsUnreadCount(settingId),
    queryFn: () => api.notifications.unreadCount(settingId),
    enabled: !!settingId,
    refetchInterval: 60_000,
    ...options,
  })
}

export function useMarkNotificationRead(
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.notifications.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useDismissNotification(
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.notifications.dismiss(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

// ─── Reports ─────────────────────────────────────────────────────

export function useReportBudgetUtilization(
  settingId: string,
  mpkCenterId?: string,
  options?: Partial<UseQueryOptions<{ data: BudgetUtilizationReport }>>
) {
  return useQuery({
    queryKey: queryKeys.reportBudgetUtilization(settingId, mpkCenterId),
    queryFn: () => api.reports.budgetUtilization(settingId, mpkCenterId),
    enabled: !!settingId,
    ...options,
  })
}

export function useReportApprovalHistory(
  settingId: string,
  filters?: {
    dateFrom?: string
    dateTo?: string
    mpkCenterId?: string
    status?: string
  },
  options?: Partial<UseQueryOptions<{ data: ApprovalHistoryReport }>>
) {
  return useQuery({
    queryKey: queryKeys.reportApprovalHistory(settingId, filters),
    queryFn: () => api.reports.approvalHistory(settingId, filters),
    enabled: !!settingId,
    ...options,
  })
}

export function useReportApproverPerformance(
  settingId: string,
  options?: Partial<UseQueryOptions<{ data: ApproverPerformanceReport }>>
) {
  return useQuery({
    queryKey: queryKeys.reportApproverPerformance(settingId),
    queryFn: () => api.reports.approverPerformance(settingId),
    enabled: !!settingId,
    ...options,
  })
}

export function useReportInvoiceProcessing(
  settingId: string,
  options?: Partial<UseQueryOptions<{ data: ProcessingPipelineReport }>>
) {
  return useQuery({
    queryKey: queryKeys.reportInvoiceProcessing(settingId),
    queryFn: () => api.reports.invoiceProcessing(settingId),
    enabled: !!settingId,
    ...options,
  })
}
