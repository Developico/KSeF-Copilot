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
import { useCompanyContext } from '@/contexts/company-context'
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
  CostDocumentExtractionResult,
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
  CostDistributionReport,
  AppNotification,
  // Self-Billing
  Supplier,
  SupplierListParams,
  SupplierListResponse,
  SupplierDetailStats,
  SbAgreement,
  SbAgreementListResponse,
  SbTemplate,
  SbTemplateListResponse,
  SelfBillingInvoice,
  SelfBillingInvoiceListParams,
  SelfBillingInvoiceListResponse,
  SelfBillingGenerateRequest,
  SelfBillingGenerateResponse,
  SelfBillingConfirmRequest,
  SelfBillingBatchResult,
  BatchActionResult,
  SelfBillingImportResult,
  SelfBillingImportConfirmResult,
  SbImportEnrichedRow,
  SupplierImportResult,
  SupplierImportConfirmResult,
  SupplierImportEnrichedRow,
  // Cost Documents
  CostDocument,
  CostDocumentCreate,
  CostDocumentUpdate,
  CostDocumentListParams,
  CostDocumentListResponse,
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

// ─── Invoice Batch Hooks ─────────────────────────────────────────

export function useBatchMarkPaidInvoices(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds) => api.invoices.batchMarkPaid(invoiceIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    ...options,
  })
}

export function useBatchMarkUnpaidInvoices(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds) => api.invoices.batchMarkUnpaid(invoiceIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    ...options,
  })
}

export function useBatchApproveInvoices(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds) => api.invoices.batchApprove(invoiceIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useBatchRejectInvoices(
  options?: UseMutationOptions<
    BatchActionResult,
    Error,
    { invoiceIds: string[]; comment: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, comment }) =>
      api.invoices.batchReject(invoiceIds, comment),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
    },
    ...options,
  })
}

export function useBatchDeleteInvoices(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoiceIds) => api.invoices.batchDelete(invoiceIds),
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

export function useExtractCostDocument(
  options?: UseMutationOptions<
    CostDocumentExtractionResult,
    Error,
    DocumentExtractRequest
  >
) {
  return useMutation({
    mutationFn: (data) => api.documents.extractCost(data),
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

export function useApplyApproval(
  options?: UseMutationOptions<
    { updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean },
    Error,
    { id: string; scope: 'unprocessed' | 'decided' | 'all'; dryRun?: boolean }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scope, dryRun }) => api.mpkCenters.applyApproval(id, scope, dryRun),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
    },
    ...options,
  })
}

export function useRevokeApproval(
  options?: UseMutationOptions<
    { updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean },
    Error,
    { id: string; scope: 'pending' | 'decided' | 'all'; dryRun?: boolean }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, scope, dryRun }) => api.mpkCenters.revokeApproval(id, scope, dryRun),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['mpk-centers'] })
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['approvals'] })
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

// ─── Approver Overview ───────────────────────────────────────────

export function useApproverOverview(settingId?: string) {
  return useQuery({
    queryKey: queryKeys.approverOverview(settingId!),
    queryFn: () => api.approverOverview.get(settingId!),
    enabled: !!settingId,
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

export function useMarkAllNotificationsRead(
  settingId: string,
  options?: UseMutationOptions<{ success: boolean; marked: number }, Error, void>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(settingId),
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

export function useReportCostDistribution(
  settingId: string,
  options?: Partial<UseQueryOptions<{ data: CostDistributionReport }>>
) {
  return useQuery({
    queryKey: queryKeys.reportCostDistribution(settingId),
    queryFn: () => api.reports.costDistribution(settingId),
    enabled: !!settingId,
    ...options,
  })
}

// ─── Suppliers ───────────────────────────────────────────────────

export function useSuppliers(
  params?: SupplierListParams,
  options?: Partial<UseQueryOptions<SupplierListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.suppliers(params),
    queryFn: () => api.suppliers.list(params),
    ...options,
  })
}

export function useSupplier(
  id: string,
  options?: Partial<UseQueryOptions<{ supplier: Supplier }>>
) {
  return useQuery({
    queryKey: queryKeys.supplier(id),
    queryFn: () => api.suppliers.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useSupplierStats(
  id: string,
  options?: Partial<UseQueryOptions<{ stats: SupplierDetailStats }>>
) {
  return useQuery({
    queryKey: queryKeys.supplierStats(id),
    queryFn: () => api.suppliers.stats(id),
    enabled: !!id,
    ...options,
  })
}

export function useSupplierInvoices(
  id: string,
  options?: Partial<UseQueryOptions<{ invoices: SelfBillingInvoice[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.supplierInvoices(id),
    queryFn: () => api.suppliers.invoices(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateSupplier(
  options?: UseMutationOptions<{ supplier: Supplier }, Error, Partial<Supplier>>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Supplier>) => api.suppliers.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useUpdateSupplier(
  options?: UseMutationOptions<
    { supplier: Supplier },
    Error,
    { id: string; data: Partial<Supplier> }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.suppliers.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useDeleteSupplier(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.suppliers.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

// ─── Supplier Batch Hooks ────────────────────────────────────────

export function useBatchDeactivateSuppliers(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (supplierIds) => api.suppliers.batchDeactivate(supplierIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useBatchReactivateSuppliers(
  options?: UseMutationOptions<BatchActionResult, Error, string[]>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (supplierIds) => api.suppliers.batchReactivate(supplierIds),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useRefreshSupplierVat(
  options?: UseMutationOptions<{ supplier: Supplier; vatStatus?: string }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.suppliers.refreshVat(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useCreateSupplierFromVat(
  options?: UseMutationOptions<{ supplier: Supplier }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nip: string) => api.suppliers.createFromVat(nip),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

export function useImportSuppliers(
  options?: UseMutationOptions<SupplierImportResult, Error, { file: File; settingId: string }>
) {
  return useMutation({
    mutationFn: (data) => api.suppliers.import(data.file, data.settingId),
    ...options,
  })
}

export function useConfirmSupplierImport(
  options?: UseMutationOptions<SupplierImportConfirmResult, Error, { settingId: string; rows: SupplierImportEnrichedRow[] }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.suppliers.confirmImport(data.settingId, data.rows),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['suppliers'] })
    },
    ...options,
  })
}

// ─── Self-Billing Agreements ─────────────────────────────────────

export function useSbAgreements(
  params?: { settingId?: string; supplierId?: string; status?: string },
  options?: Partial<UseQueryOptions<SbAgreementListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.sbAgreements(params),
    queryFn: () => api.sbAgreements.list(params),
    ...options,
  })
}

export function useSbAgreement(
  id: string,
  options?: Partial<UseQueryOptions<{ data: SbAgreement }>>
) {
  return useQuery({
    queryKey: queryKeys.sbAgreement(id),
    queryFn: () => api.sbAgreements.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateSbAgreement(
  options?: UseMutationOptions<{ data: SbAgreement }, Error, Partial<SbAgreement>>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SbAgreement>) => api.sbAgreements.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbAgreements'] })
    },
    ...options,
  })
}

export function useUpdateSbAgreement(
  options?: UseMutationOptions<
    { data: SbAgreement },
    Error,
    { id: string; data: Partial<SbAgreement> }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.sbAgreements.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbAgreements'] })
    },
    ...options,
  })
}

export function useTerminateSbAgreement(
  options?: UseMutationOptions<{ data: SbAgreement }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbAgreements.terminate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbAgreements'] })
    },
    ...options,
  })
}

// ─── Self-Billing Templates ─────────────────────────────────────

export function useSbTemplates(
  params?: { settingId?: string; agreementId?: string },
  options?: Partial<UseQueryOptions<SbTemplateListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.sbTemplates(params),
    queryFn: () => api.sbTemplates.list(params),
    ...options,
  })
}

export function useSbTemplate(
  id: string,
  options?: Partial<UseQueryOptions<{ data: SbTemplate }>>
) {
  return useQuery({
    queryKey: queryKeys.sbTemplate(id),
    queryFn: () => api.sbTemplates.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateSbTemplate(
  options?: UseMutationOptions<{ data: SbTemplate }, Error, Partial<SbTemplate>>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SbTemplate>) => api.sbTemplates.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbTemplates'] })
    },
    ...options,
  })
}

export function useUpdateSbTemplate(
  options?: UseMutationOptions<
    { data: SbTemplate },
    Error,
    { id: string; data: Partial<SbTemplate> }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => api.sbTemplates.update(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbTemplates'] })
    },
    ...options,
  })
}

export function useDeleteSbTemplate(
  options?: UseMutationOptions<{ success: boolean }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbTemplates.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbTemplates'] })
    },
    ...options,
  })
}

export function useDuplicateSbTemplate(
  options?: UseMutationOptions<{ data: SbTemplate }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.sbTemplates.duplicate(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sbTemplates'] })
    },
    ...options,
  })
}

// ─── Self-Billing Invoices ──────────────────────────────────────

export function useSelfBillingInvoices(
  params?: SelfBillingInvoiceListParams,
  options?: Partial<UseQueryOptions<SelfBillingInvoiceListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoices(params),
    queryFn: () => api.selfBillingInvoices.list(params),
    ...options,
  })
}

export function useSelfBillingInvoice(
  id: string,
  options?: Partial<UseQueryOptions<{ data: SelfBillingInvoice }>>
) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoice(id),
    queryFn: () => api.selfBillingInvoices.get(id),
    enabled: !!id,
    ...options,
  })
}

export function useCreateSelfBillingInvoice(
  options?: UseMutationOptions<
    { data: SelfBillingInvoice },
    Error,
    Partial<SelfBillingInvoice>
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SelfBillingInvoice>) =>
      api.selfBillingInvoices.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useGenerateSelfBilling(
  options?: UseMutationOptions<
    { data: SelfBillingGenerateResponse },
    Error,
    SelfBillingGenerateRequest
  >
) {
  return useMutation({
    mutationFn: (request: SelfBillingGenerateRequest) =>
      api.selfBillingInvoices.generate(request),
    ...options,
  })
}

export function useConfirmGeneratedSelfBilling(
  options?: UseMutationOptions<{ data: SelfBillingBatchResult }, Error, SelfBillingConfirmRequest>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (request: SelfBillingConfirmRequest) =>
      api.selfBillingInvoices.confirmGenerated(request),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useSubmitSelfBillingForReview(
  options?: UseMutationOptions<{ data: SelfBillingInvoice }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.selfBillingInvoices.submit(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useApproveSelfBillingInvoice(
  options?: UseMutationOptions<{ data: SelfBillingInvoice }, Error, { id: string; comment?: string; invoiceNumber?: string }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, comment, invoiceNumber }: { id: string; comment?: string; invoiceNumber?: string }) =>
      api.selfBillingInvoices.approve(id, comment, invoiceNumber),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useRejectSelfBillingInvoice(
  options?: UseMutationOptions<
    { data: SelfBillingInvoice },
    Error,
    { id: string; reason: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) =>
      api.selfBillingInvoices.reject(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useSendSelfBillingToKsef(
  options?: UseMutationOptions<{ data: SelfBillingInvoice }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.selfBillingInvoices.sendToKsef(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

export function useRevertSelfBillingToDraft(
  options?: UseMutationOptions<
    { data: SelfBillingInvoice },
    Error,
    { id: string; reason: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }) =>
      api.selfBillingInvoices.revertToDraft(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
      void qc.invalidateQueries({ queryKey: ['self-billing'] })
    },
    ...options,
  })
}

// ─── Self-Billing Batch Actions ─────────────────────────────────

export function useBatchSubmitSelfBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.selfBillingInvoices.batchSubmit(ids),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] }) },
  })
}

export function useBatchApproveSelfBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.selfBillingInvoices.batchApprove(ids),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] }) },
  })
}

export function useBatchRejectSelfBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceIds, reason }: { invoiceIds: string[]; reason: string }) =>
      api.selfBillingInvoices.batchReject(invoiceIds, reason),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] }) },
  })
}

export function useBatchSendToKsef() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.selfBillingInvoices.batchSendToKsef(ids),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] }) },
  })
}

export function useBatchDeleteSelfBilling() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.selfBillingInvoices.batchDelete(ids),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] }) },
  })
}

// ─── Self-Billing Invoice Notes ─────────────────────────────────

export function useSbInvoiceNotes(
  sbInvoiceId: string,
  options?: Partial<UseQueryOptions<{ notes: Note[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId),
    queryFn: () => api.selfBillingInvoices.listNotes(sbInvoiceId),
    enabled: !!sbInvoiceId,
    ...options,
  })
}

export function useCreateSbInvoiceNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { sbInvoiceId: string; data: NoteCreate }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sbInvoiceId, data }) =>
      api.selfBillingInvoices.createNote(sbInvoiceId, data),
    onSuccess: (_, { sbInvoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId),
      })
    },
    ...options,
  })
}

// ─── Supplier Notes ─────────────────────────────────────────────

export function useSupplierNotes(
  supplierId: string,
  options?: Partial<UseQueryOptions<{ notes: Note[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.supplierNotes(supplierId),
    queryFn: () => api.suppliers.listNotes(supplierId),
    enabled: !!supplierId,
    ...options,
  })
}

export function useCreateSupplierNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { supplierId: string; data: NoteCreate }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, data }) =>
      api.suppliers.createNote(supplierId, data),
    onSuccess: (_, { supplierId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.supplierNotes(supplierId),
      })
    },
    ...options,
  })
}

// ─── Supplier Attachments ───────────────────────────────────────

export function useSupplierAttachments(
  supplierId: string,
  options?: Partial<UseQueryOptions<{ attachments: Attachment[]; count: number }>>
) {
  return useQuery({
    queryKey: queryKeys.supplierAttachments(supplierId),
    queryFn: () => api.suppliers.listAttachments(supplierId),
    enabled: !!supplierId,
    ...options,
  })
}

export function useUploadSupplierAttachment(
  options?: UseMutationOptions<
    Attachment,
    Error,
    { supplierId: string; data: AttachmentUpload }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ supplierId, data }) =>
      api.suppliers.uploadAttachment(supplierId, data),
    onSuccess: (_, { supplierId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.supplierAttachments(supplierId),
      })
    },
    ...options,
  })
}

export function useDeleteSupplierAttachment(
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { attachmentId: string; supplierId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId }) =>
      api.suppliers.deleteAttachment(attachmentId),
    onSuccess: (_, { supplierId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.supplierAttachments(supplierId),
      })
    },
    ...options,
  })
}

export function useUpdateSupplierNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { noteId: string; data: NoteUpdate; supplierId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, data }) =>
      api.suppliers.updateNote(noteId, data),
    onSuccess: (_, { supplierId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.supplierNotes(supplierId),
      })
    },
    ...options,
  })
}

export function useDeleteSupplierNote(
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { noteId: string; supplierId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId }) =>
      api.suppliers.deleteNote(noteId),
    onSuccess: (_, { supplierId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.supplierNotes(supplierId),
      })
    },
    ...options,
  })
}

export function useUpdateSbInvoiceNote(
  options?: UseMutationOptions<
    Note,
    Error,
    { noteId: string; data: NoteUpdate; sbInvoiceId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, data }) =>
      api.selfBillingInvoices.updateNote(noteId, data),
    onSuccess: (_, { sbInvoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId),
      })
    },
    ...options,
  })
}

export function useDeleteSbInvoiceNote(
  options?: UseMutationOptions<
    { success: boolean },
    Error,
    { noteId: string; sbInvoiceId: string }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId }) =>
      api.selfBillingInvoices.deleteNote(noteId),
    onSuccess: (_, { sbInvoiceId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.selfBillingInvoiceNotes(sbInvoiceId),
      })
    },
    ...options,
  })
}

// ─── Self-Billing Import ────────────────────────────────────────

export function useImportSelfBilling(
  options?: UseMutationOptions<
    SelfBillingImportResult,
    Error,
    { file: File; settingId: string }
  >
) {
  return useMutation({
    mutationFn: (data) => api.sbImport.import(data.file, data.settingId),
    ...options,
  })
}

export function useConfirmSelfBillingImport(
  options?: UseMutationOptions<SelfBillingImportConfirmResult, Error, { settingId: string; rows: SbImportEnrichedRow[] }>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.sbImport.confirm(data.settingId, data.rows),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['selfBillingInvoices'] })
    },
    ...options,
  })
}

// ─── Supplier Stats Refresh ─────────────────────────────────────

export function useRefreshSupplierStats(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.suppliers.refreshStats(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.supplier(id) })
      void qc.invalidateQueries({ queryKey: queryKeys.supplierStats(id) })
    },
    ...options,
  })
}

// ─── SB Agreement Attachments ───────────────────────────────────

export function useListSbAgreementAttachments(
  agreementId: string,
  options?: Omit<UseQueryOptions<{ data: Attachment[] }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['sbAgreements', agreementId, 'attachments'],
    queryFn: () => api.sbAgreements.listAttachments(agreementId),
    enabled: !!agreementId,
    ...options,
  })
}

export function useUploadSbAgreementAttachment(
  options?: UseMutationOptions<
    { data: Attachment },
    Error,
    { agreementId: string; data: { fileName: string; content: string; contentType: string } }
  >
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ agreementId, data }) =>
      api.sbAgreements.uploadAttachment(agreementId, data),
    onSuccess: (_data, { agreementId }) => {
      void qc.invalidateQueries({
        queryKey: ['sbAgreements', agreementId, 'attachments'],
      })
    },
    ...options,
  })
}

// ─── SB Import Template Download (removed — templates are now generated client-side) ───

// ─── Cost Documents ──────────────────────────────────────────────

export function useCostDocuments(
  params?: CostDocumentListParams,
  options?: Partial<UseQueryOptions<CostDocumentListResponse>>
) {
  return useQuery({
    queryKey: queryKeys.costDocuments(params),
    queryFn: () => api.costDocuments.list(params),
    enabled: Boolean(params?.settingId),
    ...options,
  })
}

export function useContextCostDocuments(
  overrides?: Partial<CostDocumentListParams>
) {
  const { selectedCompany } = useCompanyContext()
  const params: CostDocumentListParams | undefined = selectedCompany?.id
    ? { settingId: selectedCompany.id, ...overrides }
    : undefined
  return useCostDocuments(params, { enabled: Boolean(selectedCompany?.id) })
}

export function useCostDocument(id: string) {
  return useQuery({
    queryKey: queryKeys.costDocument(id),
    queryFn: () => api.costDocuments.get(id),
    enabled: Boolean(id),
  })
}

export function useCreateCostDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CostDocumentCreate) => api.costDocuments.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}

export function useUpdateCostDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CostDocumentUpdate }) =>
      api.costDocuments.update(id, data),
    onSuccess: (_d, { id }) => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
      void qc.invalidateQueries({ queryKey: queryKeys.costDocument(id) })
    },
  })
}

export function useDeleteCostDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.costDocuments.delete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}

export function useBatchApproveCostDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.costDocuments.batchApprove(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}

export function useBatchRejectCostDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.costDocuments.batchReject(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}

export function useBatchMarkPaidCostDocuments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.costDocuments.batchMarkPaid(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}

export function useAICostDocCategorize() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { costDocumentId: string }) =>
      api.costDocuments.aiCategorize(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['cost-documents'] })
    },
  })
}
