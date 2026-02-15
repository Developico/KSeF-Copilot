/**
 * Shared TypeScript types for the KSeF API.
 *
 * These mirror the web project's api.ts interfaces 1:1 to ensure
 * type-level compatibility when calling the same Azure Functions backend.
 */

// ─── API Error ────────────────────────────────────────────────────

export interface ApiError {
  error: string
  details?: unknown
}

// ─── Dashboard ────────────────────────────────────────────────────

export interface MonthlyStats {
  month: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  invoiceCount: number
}

export interface MpkStats {
  mpk: string
  netAmount: number
  grossAmount: number
  invoiceCount: number
  percentage: number
}

export interface SupplierStats {
  supplierNip: string
  supplierName: string
  grossAmount: number
  invoiceCount: number
}

export interface PaymentStats {
  pending: { count: number; grossAmount: number }
  paid: { count: number; grossAmount: number }
  overdue: { count: number; grossAmount: number }
}

export interface DashboardStats {
  period: { from: string; to: string }
  totals: {
    invoiceCount: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }
  monthly: MonthlyStats[]
  byMpk: MpkStats[]
  topSuppliers: SupplierStats[]
  payments: PaymentStats
}

// ─── Forecast ─────────────────────────────────────────────────────

export interface ForecastMonthlyData {
  month: string
  grossAmount: number
  netAmount: number
  invoiceCount: number
}

export interface ForecastPoint {
  month: string
  predicted: number
  lower: number
  upper: number
}

export interface ForecastResult {
  historical: ForecastMonthlyData[]
  forecast: ForecastPoint[]
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
  confidence: number
  method: 'moving-average' | 'linear-regression' | 'seasonal'
  summary: {
    nextMonth: number
    totalForecast: number
    avgMonthly: number
  }
}

export interface GroupedForecastResult {
  group: string
  forecast: ForecastResult
}

export interface GroupedForecastResponse {
  groups: GroupedForecastResult[]
}

export type ForecastHorizon = 1 | 6 | 12

export interface ForecastParams {
  horizon?: ForecastHorizon
  historyMonths?: number
  settingId?: string
  tenantNip?: string
}

// ─── Anomalies ────────────────────────────────────────────────────

export type AnomalyType =
  | 'amount-spike'
  | 'new-supplier'
  | 'category-shift'
  | 'frequency-change'
  | 'duplicate-suspect'

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Anomaly {
  id: string
  invoiceId: string
  invoiceNumber: string
  type: AnomalyType
  severity: AnomalySeverity
  score: number
  description: string
  descriptionKey?: string
  descriptionParams?: Record<string, string | number>
  expected: number
  actual: number
  deviation: number
  supplierName: string
  supplierNip: string
  grossAmount: number
  invoiceDate: string
  mpk?: string
  category?: string
}

export interface AnomalySummary {
  total: number
  bySeverity: Record<AnomalySeverity, number>
  totalAmount: number
  topTypes: { type: AnomalyType; count: number }[]
}

export interface AnomalyResult {
  anomalies: Anomaly[]
  summary: AnomalySummary
  analyzedInvoices: number
  period: { from: string; to: string }
}

export interface AnomalyParams {
  periodDays?: number
  sensitivity?: number
  settingId?: string
  tenantNip?: string
}

// ─── Invoice ──────────────────────────────────────────────────────

export interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  netAmount: number
  vatRate: string
  vatAmount: number
  grossAmount: number
}

export interface Invoice {
  id: string
  tenantNip: string
  tenantName: string
  referenceNumber: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
  buyerNip?: string
  buyerName?: string
  buyerAddress?: string
  buyerCity?: string
  buyerPostalCode?: string
  buyerCountry?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency: 'PLN' | 'EUR' | 'USD'
  exchangeRate?: number
  exchangeDate?: string
  exchangeSource?: string
  grossAmountPln?: number
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
  mpk?: string
  category?: string
  project?: string
  tags?: string[]
  importedAt: string
  ksefAcceptedAt?: string
  xmlContent?: string
  items?: InvoiceItem[]
  source?: 'KSeF' | 'Manual'
  description?: string
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiRationale?: string
  aiConfidence?: number
  aiProcessedAt?: string
  hasDocument?: boolean
  documentFileName?: string
  hasAttachments?: boolean
  attachmentCount?: number
  hasNotes?: boolean
  noteCount?: number
}

export interface InvoiceListResponse {
  invoices: Invoice[]
  count: number
}

export interface InvoiceListParams {
  tenantNip?: string
  settingId?: string
  paymentStatus?: 'pending' | 'paid'
  mpk?: string
  mpkList?: string[]
  category?: string
  fromDate?: string
  toDate?: string
  dueDateFrom?: string
  dueDateTo?: string
  minAmount?: number
  maxAmount?: number
  supplierNip?: string
  supplierName?: string
  source?: 'KSeF' | 'Manual'
  overdue?: boolean
  search?: string
  top?: number
  skip?: number
  orderBy?: 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
  orderDirection?: 'asc' | 'desc'
}

export interface InvoiceUpdateData {
  mpk?: string
  category?: string
  description?: string
  project?: string
  tags?: string[]
  paymentStatus?: 'pending' | 'paid'
  paymentDate?: string
  supplierName?: string
  supplierNip?: string
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
  currency?: string
  exchangeRate?: number
  grossAmountPln?: number
}

export interface ManualInvoiceCreate {
  settingId?: string
  tenantNip: string
  tenantName: string
  invoiceNumber: string
  supplierNip: string
  supplierName: string
  supplierAddress?: string
  supplierCity?: string
  supplierPostalCode?: string
  supplierCountry?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  description?: string
  mpk?: string
  category?: string
  currency?: 'PLN' | 'EUR' | 'USD'
  exchangeRate?: number
  exchangeDate?: string
  grossAmountPln?: number
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
}

// ─── KSeF Status & Session ───────────────────────────────────────

export interface KsefStatus {
  isConnected: boolean
  environment: string
  nip: string
  tokenExpiry?: string
  tokenExpiringSoon: boolean
  daysUntilExpiry?: number
  hasActiveSession: boolean
  lastSync?: string
  error?: string
}

export interface KsefSession {
  sessionId: string
  referenceNumber: string
  nip: string
  createdAt: string
  expiresAt?: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  invoicesProcessed: number
}

// ─── Sync ─────────────────────────────────────────────────────────

export interface SyncPreviewInvoice {
  ksefReferenceNumber: string
  invoiceNumber: string
  invoiceDate: string
  supplierNip: string
  supplierName: string
  grossAmount: number
  alreadyImported: boolean
}

export interface SyncPreviewResponse {
  total: number
  new: number
  existing: number
  invoices: SyncPreviewInvoice[]
  dateRange: { from: string; to: string }
}

export interface SyncResult {
  success: boolean
  total: number
  imported: number
  skipped: number
  failed: number
  invoices: {
    ksefReferenceNumber: string
    invoiceNumber: string
    supplierName: string
    grossAmount: number
    status: 'imported' | 'skipped' | 'failed'
  }[]
  errors: {
    ksefReferenceNumber: string
    error: string
  }[]
}

// ─── Settings ─────────────────────────────────────────────────────

export interface KsefSetting {
  id: string
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  tokenStatus?: 'valid' | 'expiring' | 'expired' | 'missing'
  isActive: boolean
  invoicePrefix?: string
  name?: string
}

export interface CostCenter {
  id: string
  code: string
  name: string
  isActive: boolean
}

export interface TokenTestResult {
  success: boolean
  secretName: string
  tokenExists: boolean
  tokenLength?: number
  keyVaultConnected: boolean
  ksefApiConnected?: boolean
  ksefEnvironment?: string
  error?: string
  details?: string
}

// ─── Health ───────────────────────────────────────────────────────

export interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  responseTime?: number
  details?: Record<string, unknown>
}

export interface DetailedHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: ServiceStatus[]
  summary: {
    total: number
    healthy: number
    degraded: number
    unhealthy: number
  }
}

// ─── VAT White List (Biała Lista) ────────────────────────────────

export interface VatSubjectData {
  name: string
  nip: string
  regon: string
  krs: string
  statusVat: string
  residenceAddress: string
  workingAddress: string
  accountNumbers: string[]
  registrationLegalDate: string | null
  hasVirtualAccounts: boolean
}

export interface VatLookupResponse {
  success: boolean
  data?: VatSubjectData
  error?: string
}

export interface VatValidateResponse {
  valid: boolean
  nip?: string
  error?: string
}

export interface VatCheckResponse {
  accountAssigned: boolean
  nip: string
  account: string
  requestId?: string
  error?: string
}

// ─── Attachments ──────────────────────────────────────────────────

export interface Attachment {
  id: string
  invoiceId: string
  fileName: string
  mimeType: string
  fileSize: number
  createdOn: string
}

export interface AttachmentUpload {
  fileName: string
  mimeType: string
  content: string // base64
  description?: string
}

export interface AttachmentConfig {
  maxSizeBytes: number
  maxSizeMB: number
  allowedMimeTypes: string[]
}

// ─── Notes ────────────────────────────────────────────────────────

export interface Note {
  id: string
  invoiceId: string
  subject: string | null
  noteText: string
  createdOn: string
  modifiedOn: string
}

export interface NoteCreate {
  subject?: string
  noteText: string
}

export interface NoteUpdate {
  subject?: string
  noteText?: string
}

// ─── Documents ────────────────────────────────────────────────────

export interface DocumentInfo {
  fileName: string
  mimeType: string
  fileSize: number
}

export interface DocumentUpload {
  fileName: string
  mimeType: string
  content: string // base64
  thumbnail?: string // base64 PNG thumbnail
}

export interface DocumentDownload {
  fileName: string
  mimeType: string
  fileSize: number
  content: string // base64
}

export interface DocumentConfig {
  maxSizeBytes: number
  maxSizeMB: number
  allowedMimeTypes: string[]
  allowedExtensions: string[]
}

// ─── Exchange Rates ───────────────────────────────────────────────

export interface ExchangeRateResponse {
  rate: number
  currency: 'EUR' | 'USD'
  effectiveDate: string
  requestedDate: string
  source: 'NBP API'
  previousRate?: number
  changePercent?: number
  warningThreshold?: boolean
}

export interface ConversionResponse {
  originalAmount: number
  currency: 'EUR' | 'USD'
  plnAmount: number
  rate: number
  effectiveDate: string
  requestedDate: string
}

// ─── Dataverse Settings ───────────────────────────────────────────

export interface DvSetting {
  id: string
  nip: string
  companyName: string
  environment: 'test' | 'demo' | 'production'
  autoSync: boolean
  syncIntervalMinutes?: number
  lastSyncAt?: string
  lastSyncStatus?: 'success' | 'error'
  keyVaultSecretName?: string
  tokenExpiresAt?: string
  isActive: boolean
  invoicePrefix?: string
  createdAt: string
  updatedAt: string
}

export interface DvSettingCreate {
  nip: string
  companyName: string
  environment?: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  invoicePrefix?: string
}

export interface DvSettingUpdate {
  companyName?: string
  environment?: 'test' | 'demo' | 'production'
  autoSync?: boolean
  syncIntervalMinutes?: number
  keyVaultSecretName?: string
  invoicePrefix?: string
  isActive?: boolean
}

// ─── Dataverse Sessions ──────────────────────────────────────────

export interface DvSession {
  id: string
  sessionReference: string
  settingId: string
  nip: string
  sessionType: 'interactive' | 'batch'
  startedAt: string
  expiresAt?: string
  terminatedAt?: string
  status: 'active' | 'expired' | 'terminated' | 'error'
  invoicesProcessed: number
  errorMessage?: string
  createdAt: string
}

// ─── Dataverse Sync ───────────────────────────────────────────────

export interface DvSyncLog {
  id: string
  settingId: string
  sessionId?: string
  direction: 'incoming' | 'outgoing' | 'both'
  startedAt: string
  completedAt?: string
  status: 'in-progress' | 'completed' | 'failed' | 'partial'
  invoicesCreated: number
  invoicesUpdated: number
  invoicesFailed: number
  pageFrom?: number
  pageTo?: number
  errorMessage?: string
  createdAt: string
}

export interface DvSyncStart {
  settingId: string
  direction?: 'incoming' | 'outgoing' | 'both'
  dateFrom?: string
  dateTo?: string
}

export interface DvSyncResult {
  syncLogId: string
  status: 'completed' | 'failed'
  total: number
  processed: number
  created: number
  updated: number
  failed: number
  errors: Array<{ reference: string; error: string }>
}

export interface DvSyncStats {
  totalSyncs: number
  successfulSyncs: number
  failedSyncs: number
  totalInvoicesCreated: number
  totalInvoicesUpdated: number
  lastSyncAt: string | null
}

// ─── Document Extraction ─────────────────────────────────────────

export interface ExtractedAddress {
  street?: string
  buildingNumber?: string
  apartmentNumber?: string
  postalCode?: string
  city?: string
  country?: string
}

export interface ExtractedItem {
  description: string
  quantity?: number
  unit?: string
  netPrice?: number
  vatRate?: number
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
}

export interface ExtractedInvoiceData {
  invoiceNumber?: string
  issueDate?: string
  dueDate?: string
  supplierName?: string
  supplierNip?: string
  supplierAddress?: ExtractedAddress
  supplierBankAccount?: string
  buyerName?: string
  buyerNip?: string
  buyerAddress?: ExtractedAddress
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
  currency?: string
  items?: ExtractedItem[]
  paymentMethod?: string
  bankAccountNumber?: string
  suggestedMpk?: string
  suggestedCategory?: string
  suggestedDescription?: string
}

export interface ExtractionResult {
  success: boolean
  data?: ExtractedInvoiceData
  confidence: number
  extractedAt: string
  sourceType: 'pdf' | 'image'
  processingTimeMs?: number
  rawText?: string
  error?: string
}

export interface DocumentExtractRequest {
  fileName: string
  mimeType: string
  content: string // base64
}

// ─── AI Categorization ───────────────────────────────────────────

export interface AiCategorizationResult {
  invoiceId: string
  categorization: {
    mpk: string
    category: string
    description: string
    confidence: number
  }
  message: string
}

// ─── KSeF Testdata ────────────────────────────────────────────────

export interface KsefTestdataEnvironmentsResponse {
  success: boolean
  environments: {
    test: {
      name: string
      baseUrl: string
      description: string
      testdataEndpoints: { permissions: string; person: string } | null
    }
    demo: {
      name: string
      baseUrl: string
      description: string
      testdataEndpoints: { permissions: string; person: string } | null
    }
    prod: {
      name: string
      baseUrl: string
      description: string
      testdataEndpoints: null
    }
  }
  availablePermissions: Array<{ type: string; description: string }>
}

export interface KsefTestdataPermissionsResponse {
  success: boolean
  environment: string
  nip: string
  tokens?: unknown
  error?: string
  details?: string
}

export interface KsefGrantPermissionsRequest {
  nip: string
  permissions?: string[]
  authorizedNip?: string
  environment?: 'test' | 'demo'
}

export interface KsefGrantPermissionsResponse {
  success: boolean
  environment: string
  nip: string
  authorizedNip: string
  grantedPermissions: string[]
  result?: unknown
  error?: string
  details?: string
}

export interface KsefCreateTestPersonRequest {
  nip: string
  pesel?: string
  firstName?: string
  lastName?: string
  environment?: 'test' | 'demo'
}

export interface KsefCreateTestPersonResponse {
  success: boolean
  environment: string
  nip: string
  result?: unknown
  error?: string
  details?: string
}

export interface KsefGenerateTestDataRequest {
  nip: string
  companyId?: string
  count?: number
  fromDate?: string
  toDate?: string
  paidPercentage?: number
  ksefPercentage?: number
  source?: 'KSeF' | 'Manual'
}

export interface KsefGenerateTestDataResponse {
  success: boolean
  environment: string
  nip: string
  summary: {
    requested: number
    created: number
    paid: number
    failed: number
    errors?: string[]
    totalNet: number
    totalGross: number
    dateRange: { from: string; to: string }
  }
  error?: string
}

export interface KsefCleanupPreviewResponse {
  success: boolean
  environment: string
  nip: string
  total: number
  bySource: Record<string, number>
  byMonth: Record<string, number>
  filters?: {
    tenantNip: string
    fromDate?: string
    toDate?: string
    source?: string
  }
  warning?: string
}

export interface KsefCleanupRequest {
  nip: string
  companyId?: string
  dryRun?: boolean
  fromDate?: string
  toDate?: string
  source?: 'KSeF' | 'Manual'
}

export interface KsefCleanupResponse {
  success: boolean
  dryRun: boolean
  environment: string
  nip: string
  total: number
  deleted?: number
  failed?: number
  errors?: string[]
  message?: string
}
