import { getMsalInstance, apiScopes, isAuthConfigured } from './auth-config'

// In production (Azure Static Web Apps), use empty string to use relative URLs
// The rewrites in next.config.mjs will proxy /api/* to the Azure Functions backend
// In development, use NEXT_PUBLIC_API_URL (e.g., http://localhost:7071)
const API_BASE_URL =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  !window.location.hostname.includes('127.0.0.1')
    ? '' // Production: use relative URLs
    : process.env.NEXT_PUBLIC_API_URL || ''

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  error: string
  details?: unknown
}

// Dashboard Statistics Types
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

// Activity Feed Types
export type ActivityItemType = 'invoice' | 'approval' | 'selfbilling' | 'sync'

export interface ActivityItem {
  id: string
  type: ActivityItemType
  title: string
  description: string
  amount?: number
  currency?: string
  date: string
  link?: string
}

export interface ActivityFeedResponse {
  items: ActivityItem[]
  count: number
}

// Forecast Types
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
  method: 'moving-average' | 'linear-regression' | 'seasonal' | 'exponential-smoothing'
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

// Anomaly Types
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

export type ForecastHorizon = 1 | 6 | 12

// ── Algorithm / Rule types ────────────────────────────────────

export type ForecastAlgorithm =
  | 'auto'
  | 'moving-average'
  | 'linear-regression'
  | 'seasonal'
  | 'exponential-smoothing'

export interface AlgorithmConfigMap {
  'moving-average'?: { windowSize?: number }
  'linear-regression'?: { blendRatio?: number }
  'seasonal'?: { significanceThreshold?: number }
  'exponential-smoothing'?: { alpha?: number; beta?: number }
}

export interface AlgorithmParameterDescriptor {
  key: string
  label: string
  description: string
  type: 'number'
  min: number
  max: number
  step: number
  default: number
}

export interface AlgorithmDescriptor {
  id: ForecastAlgorithm
  name: string
  description: string
  minDataPoints: number
  parameters: AlgorithmParameterDescriptor[]
}

export type ForecastPreset = 'default' | 'conservative' | 'aggressive'

export interface ForecastPresetDescriptor {
  label: string
  description: string
  algorithm: ForecastAlgorithm
  algorithmConfig: AlgorithmConfigMap
}

export interface ForecastAlgorithmsResponse {
  algorithms: AlgorithmDescriptor[]
  presets: Record<ForecastPreset, ForecastPresetDescriptor>
}

export interface AnomalyRuleConfig {
  'amount-spike'?: { zScoreThreshold?: number }
  'new-supplier'?: { amountThreshold?: number }
  'duplicate-suspect'?: { amountTolerancePct?: number; dayWindow?: number }
  'category-shift'?: { shiftThresholdPct?: number }
  'frequency-change'?: { frequencyMultiplier?: number }
}

export interface AnomalyRuleParameterDescriptor {
  key: string
  label: string
  description: string
  type: 'number'
  min: number
  max: number
  step: number
  default: number
}

export interface AnomalyRuleDescriptor {
  id: AnomalyType
  name: string
  description: string
  parameters: AnomalyRuleParameterDescriptor[]
}

export type AnomalyPreset = 'default' | 'conservative' | 'aggressive'

export interface AnomalyPresetDescriptor {
  label: string
  description: string
  enabledRules: AnomalyType[]
  ruleConfig: AnomalyRuleConfig
}

export interface AnomalyRulesResponse {
  rules: AnomalyRuleDescriptor[]
  presets: Record<AnomalyPreset, AnomalyPresetDescriptor>
}

export interface ForecastParams {
  horizon?: ForecastHorizon
  historyMonths?: number
  settingId?: string
  tenantNip?: string
  algorithm?: ForecastAlgorithm
  algorithmConfig?: string  // JSON-encoded AlgorithmConfigMap
}

export interface AnomalyParams {
  periodDays?: number
  sensitivity?: number
  settingId?: string
  tenantNip?: string
  enabledRules?: string   // comma-separated AnomalyType[]
  ruleConfig?: string     // JSON-encoded AnomalyRuleConfig
}

// Invoice Types
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
  // Currency fields
  currency: 'PLN' | 'EUR' | 'USD'
  exchangeRate?: number           // Exchange rate (4 decimal places)
  exchangeDate?: string           // Date of the exchange rate (ISO 8601)
  exchangeSource?: string         // Source: 'NBP API' | 'Manual'
  grossAmountPln?: number         // Gross amount converted to PLN
  paymentStatus: 'pending' | 'paid'
  paymentDate?: string
  mpk?: string
  mpkCenterId?: string
  mpkCenterName?: string
  category?: string
  project?: string
  tags?: string[]
  // Approval fields
  approvalStatus?: ApprovalStatus
  approvedBy?: string
  approvedByOid?: string
  approvedAt?: string
  approvalComment?: string
  importedAt: string
  ksefAcceptedAt?: string
  xmlContent?: string
  items?: InvoiceItem[]
  source?: 'KSeF' | 'Manual'
  description?: string
  // AI Suggestions
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiRationale?: string
  aiConfidence?: number
  aiProcessedAt?: string
  // Document (invoice image/scan)
  hasDocument?: boolean
  documentFileName?: string
  // Attachment summary
  hasAttachments?: boolean
  attachmentCount?: number
  // Notes summary
  hasNotes?: boolean
  noteCount?: number
  // Invoice type & correction fields
  invoiceType?: 'VAT' | 'Corrective' | 'Advance'
  parentInvoiceId?: string
  correctedInvoiceNumber?: string
  correctionReason?: string
  // Self-billing
  isSelfBilling?: boolean
}

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

export interface InvoiceListResponse {
  invoices: Invoice[]
  count: number
}

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
  newInvoiceIds?: string[]
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
  // Computed property for backward compatibility
  name?: string
}

export interface CostCenter {
  id: string
  code: string
  name: string
  isActive: boolean
}

// MPK Center Types (Phase 5)
export type BudgetPeriod = 'Monthly' | 'Quarterly' | 'HalfYearly' | 'Annual'
export type ApprovalStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export interface MpkCenter {
  id: string
  name: string
  description?: string
  settingId: string
  isActive: boolean
  approvalRequired: boolean
  approvalSlaHours?: number
  approvalEffectiveFrom?: string
  budgetAmount?: number
  budgetPeriod?: BudgetPeriod
  budgetStartDate?: string
  createdOn: string
  modifiedOn: string
}

export interface MpkCenterCreate {
  name: string
  settingId: string
  description?: string
  approvalRequired?: boolean
  approvalSlaHours?: number
  approvalEffectiveFrom?: string | null
  budgetAmount?: number
  budgetPeriod?: BudgetPeriod
  budgetStartDate?: string
}

export interface MpkCenterUpdate {
  name?: string
  description?: string
  approvalRequired?: boolean
  approvalSlaHours?: number | null
  approvalEffectiveFrom?: string | null
  budgetAmount?: number
  budgetPeriod?: BudgetPeriod
  budgetStartDate?: string
}

export interface MpkApprover {
  id: string
  systemUserId: string
  fullName: string
  email: string
  azureObjectId: string
}

export interface DvSystemUser {
  systemUserId: string
  fullName: string
  email: string
}

// Budget Types
export interface BudgetStatus {
  mpkCenterId: string
  mpkCenterName: string
  budgetAmount: number
  budgetPeriod: BudgetPeriod
  budgetStartDate: string
  periodStart: string
  periodEnd: string
  utilized: number
  remaining: number
  utilizationPercent: number
  isWarning: boolean
  isExceeded: boolean
  invoiceCount: number
}

export interface BudgetUtilizationReport {
  period: { from: string; to: string }
  mpkCenters: BudgetStatus[]
  totals: {
    totalBudget: number
    totalUtilized: number
    totalRemaining: number
    overallUtilizationPercent: number
  }
}

// Approval Types
export interface PendingApproval {
  id: string
  invoiceNumber: string
  supplierName: string
  invoiceDate: string
  grossAmount: number
  grossAmountPln?: number
  currency: string
  mpkCenterId?: string
  mpkCenterName?: string
  approvalStatus: string
  pendingSince: string
  approvalSlaHours?: number
}

export interface ApprovalHistoryEntry {
  invoiceId: string
  invoiceNumber: string
  supplierName: string
  grossAmount: number
  currency: string
  mpkCenterId?: string
  mpkCenterName?: string
  approvalStatus: string
  approvedBy?: string
  approvedAt?: string
  approvalComment?: string
}

export interface ApprovalHistoryReport {
  entries: ApprovalHistoryEntry[]
  count: number
  summary: {
    approved: number
    rejected: number
    cancelled: number
    pending: number
  }
}

// Approver Performance Types
export interface ApproverPerformanceEntry {
  approverName: string
  approverOid: string
  totalDecisions: number
  approvedCount: number
  rejectedCount: number
  approvalRate: number
  avgResponseHours: number | null
  minResponseHours: number | null
  maxResponseHours: number | null
  withinSlaCount: number
  overSlaCount: number
  slaComplianceRate: number
}

export interface ApproverPerformanceReport {
  approvers: ApproverPerformanceEntry[]
  totals: {
    totalDecisions: number
    avgResponseHours: number | null
    overallSlaComplianceRate: number
  }
}

// Invoice Processing Pipeline Types
export interface ProcessingPipelineEntry {
  month: string
  totalReceived: number
  fromKsef: number
  fromManual: number
  classified: number
  approved: number
  rejected: number
  pending: number
  avgClassifyDays: number | null
  avgApproveDays: number | null
  avgTotalDays: number | null
}

export interface ProcessingPipelineReport {
  months: ProcessingPipelineEntry[]
  totals: {
    totalReceived: number
    fromKsef: number
    fromManual: number
    avgClassifyDays: number | null
    avgApproveDays: number | null
    avgTotalDays: number | null
  }
}

// Cost Distribution Report Types
export interface CostDistributionByType {
  documentType: string
  count: number
  totalGross: number
  totalNet: number
  percent: number
}

export interface CostDistributionByCategory {
  category: string
  count: number
  totalGross: number
  percent: number
}

export interface CostDistributionByMonth {
  month: string
  byType: Record<string, number>
  total: number
}

export interface CostDistributionReport {
  byType: CostDistributionByType[]
  byCategory: CostDistributionByCategory[]
  byMonth: CostDistributionByMonth[]
  totals: {
    totalDocuments: number
    totalGross: number
    totalNet: number
    totalVat: number
  }
}

// Notification Types
export type NotificationType =
  | 'ApprovalRequested'
  | 'SlaExceeded'
  | 'BudgetWarning80'
  | 'BudgetExceeded'
  | 'ApprovalDecided'
  | 'SbApprovalRequested'

export interface AppNotification {
  id: string
  name: string
  recipientId: string
  settingId: string
  type: NotificationType
  message: string
  isRead: boolean
  isDismissed: boolean
  invoiceId?: string
  mpkCenterId?: string
  createdOn: string
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

// Invoice List Parameters (extended with advanced filters)
export interface InvoiceListParams {
  tenantNip?: string
  settingId?: string // Filter by KSeF setting ID (for multi-environment support)
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
  invoiceType?: 'VAT' | 'Corrective' | 'Advance'
  parentInvoiceId?: string // Filter to get corrective invoices linked to a parent
  overdue?: boolean
  search?: string
  top?: number
  skip?: number
  orderBy?: 'invoiceDate' | 'grossAmount' | 'supplierName' | 'dueDate'
  orderDirection?: 'asc' | 'desc'
  approvalStatus?: ApprovalStatus
  mpkCenterId?: string
  mpkCenterIds?: string[]
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
  mpkCenterId?: string
  category?: string
  // Currency fields
  currency?: 'PLN' | 'EUR' | 'USD'
  exchangeRate?: number
  exchangeDate?: string
  grossAmountPln?: number
  // AI suggestion fields (from document extraction)
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
}

// ============================================================================
// VAT White List Types
// ============================================================================

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

// Note Types (text notes for invoices)
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

// Document Types (for invoice image/scan)
export interface DocumentInfo {
  fileName: string
  mimeType: string
  fileSize: number
}

export interface DocumentUpload {
  fileName: string
  mimeType: string
  content: string // base64
  thumbnail?: string // base64 PNG thumbnail (for PDFs)
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

// ============================================================================
// Auth helpers
// ============================================================================

async function getAccessToken(): Promise<string | null> {
  if (!isAuthConfigured()) {
    return null
  }

  // Skip token acquisition if API scope is not configured
  if (apiScopes.scopes.length === 0) {
    return null
  }

  try {
    const msalInstance = getMsalInstance()
    const accounts = msalInstance.getAllAccounts()
    
    if (accounts.length === 0) {
      return null
    }

    const response = await msalInstance.acquireTokenSilent({
      ...apiScopes,
      account: accounts[0],
    })

    return response.accessToken
  } catch (error) {
    console.error('Failed to acquire token:', error)
    return null
  }
}

// ============================================================================
// API fetch wrapper
// ============================================================================

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  // Add auth token if available
  const token = await getAccessToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    const msg = error.error || `API error: ${response.status}`
    throw new Error(error.details ? `${msg}: ${error.details}` : msg)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

// ============================================================================
// Supplier Types
// ============================================================================

export type SupplierStatusType = 'Active' | 'Inactive' | 'Blocked'
export type SupplierSourceType = 'KSeF' | 'Manual' | 'VatApi'

export interface Supplier {
  id: string
  nip: string
  name: string
  shortName?: string | null
  regon?: string | null
  krs?: string | null
  street?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
  bankAccount?: string | null
  vatStatus?: string | null
  vatStatusDate?: string | null
  paymentTermsDays?: number | null
  defaultMpkId?: string | null
  defaultCategory?: string | null
  notes?: string | null
  tags?: string | null
  hasSelfBillingAgreement: boolean
  selfBillingAgreementDate?: string | null
  selfBillingAgreementExpiry?: string | null
  sbContactUserId?: string | null
  sbInvoiceNumberTemplate?: string | null
  firstInvoiceDate?: string | null
  lastInvoiceDate?: string | null
  totalInvoiceCount: number
  totalGrossAmount: number
  status: SupplierStatusType
  source: SupplierSourceType
  settingId: string
  createdOn: string
  modifiedOn: string
}

export interface SupplierCreate {
  nip: string
  name: string
  shortName?: string
  street?: string
  city?: string
  postalCode?: string
  country?: string
  email?: string
  phone?: string
  bankAccount?: string
  settingId: string
}

export interface SupplierListParams {
  settingId: string
  status?: SupplierStatusType
  search?: string
  hasSelfBillingAgreement?: boolean
  top?: number
  skip?: number
}

export interface SupplierListResponse {
  suppliers: Supplier[]
  count: number
}

export interface SupplierDetailStats {
  invoiceCount: number
  totalGross: number
  avgInvoiceAmount: number
  lastInvoiceDate: string | null
  pendingPayments: number
  overduePayments: number
  selfBillingInvoiceCount: number
  selfBillingPendingCount: number
}

// ============================================================================
// Self-Billing Agreement Types
// ============================================================================

export type SbAgreementStatusType = 'Active' | 'Expired' | 'Terminated'

export interface SbAgreement {
  id: string
  name: string
  supplierId: string
  agreementDate: string
  validFrom: string
  validTo?: string | null
  renewalDate?: string | null
  approvalProcedure?: string | null
  status: SbAgreementStatusType
  credentialReference?: string | null
  notes?: string | null
  hasDocument: boolean
  documentFilename?: string | null
  autoApprove: boolean
  settingId: string
  createdOn: string
  modifiedOn: string
}

export interface SbAgreementCreate {
  supplierId: string
  name: string
  agreementDate: string
  validFrom: string
  validTo?: string
  renewalDate?: string
  approvalProcedure?: string
  notes?: string
  autoApprove?: boolean
  settingId: string
}

export interface SbAgreementListResponse {
  agreements: SbAgreement[]
  total: number
}

// ============================================================================
// Self-Billing Template Types
// ============================================================================

export interface SbTemplate {
  id: string
  supplierId: string
  settingId: string
  name: string
  description?: string | null
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  currency: string
  isActive: boolean
  sortOrder: number
  paymentTermDays?: number | null
  createdOn: string
  modifiedOn: string
}

export interface SbTemplateCreate {
  supplierId: string
  settingId: string
  name: string
  description?: string
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  currency?: string
  paymentTermDays?: number | null
}

export interface SbTemplateListResponse {
  templates: SbTemplate[]
  total: number
}

// ============================================================================
// Self-Billing Invoice Types
// ============================================================================

export type SelfBillingInvoiceStatusType =
  | 'Draft'
  | 'PendingSeller'
  | 'SellerApproved'
  | 'SellerRejected'
  | 'SentToKsef'

export interface SelfBillingInvoiceItem {
  id?: string
  templateId?: string
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
  paymentTermDays?: number | null
  sortOrder?: number
  sbInvoiceId?: string
  createdOn?: string
  modifiedOn?: string
}

export interface SelfBillingInvoice {
  id: string
  invoiceNumber: string
  agreementId?: string
  supplierId: string
  supplierName?: string
  supplierNip?: string
  ksefInvoiceId?: string
  mpkCenterId?: string
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  currency: string
  status: SelfBillingInvoiceStatusType
  ksefReferenceNumber?: string
  sellerRejectionReason?: string
  sentDate?: string
  submittedByUserId?: string
  submittedAt?: string
  approvedByUserId?: string
  approvedAt?: string
  items: SelfBillingInvoiceItem[]
  settingId: string
  xmlContent?: string | null
  xmlHash?: string | null
  createdOn: string
  modifiedOn: string
}

export interface SelfBillingInvoiceListParams {
  settingId: string
  supplierId?: string
  status?: SelfBillingInvoiceStatusType
  dateFrom?: string
  dateTo?: string
  top?: number
  skip?: number
}

export interface SelfBillingInvoiceListResponse {
  invoices: SelfBillingInvoice[]
  total: number
}

export interface SelfBillingGenerateRequest {
  settingId: string
  period: { month: number; year: number }
  supplierIds?: string[]
  templateIds?: string[]
  previews?: SelfBillingGeneratePreview[]
}

export interface SelfBillingGeneratePreview {
  supplierId: string
  supplierName: string
  supplierNip: string
  agreementId: string
  items: Array<{
    templateId: string
    templateName: string
    itemDescription: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    netAmount: number
    vatAmount: number
    grossAmount: number
    paymentTermDays?: number | null
  }>
  totals: { netAmount: number; vatAmount: number; grossAmount: number }
}

export interface SelfBillingGenerateResponse {
  previews: SelfBillingGeneratePreview[]
  totals: {
    supplierCount: number
    invoiceCount: number
    netAmount: number
    vatAmount: number
    grossAmount: number
  }
  diagnostics?: {
    suppliersFound: number
    suppliersAfterFilter: number
    supplierDetails: Array<{
      id: string
      name: string
      hasAgreement: boolean
      agreementValid: boolean
      templateCount: number
      skipReason?: string
    }>
  }
}

export interface SelfBillingCreateResponse {
  generated: number
  failed: number
  results: Array<{ supplierId: string; invoiceId?: string; error?: string }>
}

export interface SelfBillingConfirmRequest {
  settingId: string
  previews: SelfBillingGeneratePreview[]
}

export interface SelfBillingBatchResult {
  total: number
  created: number
  failed: number
  invoices: Array<{
    id: string
    invoiceNumber: string
    supplierName: string
    grossAmount: number
    status: 'created' | 'failed'
  }>
  errors: Array<{ index: number; error: string }>
}

export interface BatchActionResult {
  total: number
  succeeded: number
  failed: number
  results: Array<{ id: string; success: boolean; error?: string }>
}

export interface SbImportEnrichedRow {
  supplierNip: string
  supplierName: string | null
  supplierId: string | null
  hasAgreement: boolean
  itemDescription: string
  quantity: number
  unit: string
  unitPrice: number
  vatRate: number
  invoiceDate: string
  dueDate?: string
  netAmount: number
  vatAmount: number
  grossAmount: number
  valid: boolean
  error?: string
}

export interface SelfBillingImportResult {
  rows: SbImportEnrichedRow[]
  parseErrors: Array<{ row: number; message: string }>
  totalRows: number
  validRows: number
  invalidRows: number
}

export interface SelfBillingImportConfirmResult {
  created: number
  failed: number
  results: Array<{ supplierNip: string; invoiceId?: string; error?: string }>
}

// ── Supplier Import Types ──

export interface SupplierImportEnrichedRow {
  nip: string
  sbAgreement: boolean
  name: string | null
  regon: string | null
  krs: string | null
  street: string | null
  city: string | null
  postalCode: string | null
  vatStatus: string | null
  bankAccount: string | null
  exists: boolean
  existingId: string | null
  valid: boolean
  error?: string
}

export interface SupplierImportResult {
  rows: SupplierImportEnrichedRow[]
  parseErrors: Array<{ row: number; message: string }>
  totalRows: number
  validRows: number
  invalidRows: number
}

export interface SupplierImportConfirmResult {
  created: number
  failed: number
  results: Array<{ nip: string; supplierId?: string; agreementId?: string; error?: string }>
}

export interface SelfBillingInvoiceCreateData {
  settingId: string
  supplierId?: string
  agreementId?: string
  mpkId?: string
  invoiceDate: string
  dueDate?: string
  items: Array<{
    templateId?: string
    itemDescription: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    paymentTermDays?: number | null
  }>
}

export interface SelfBillingBatchCreateData {
  settingId: string
  invoices: SelfBillingInvoiceCreateData[]
}

export interface SelfBillingInvoiceUpdateData {
  invoiceNumber?: string
  invoiceDate?: string
  dueDate?: string
  items?: Array<{
    templateId?: string
    itemDescription: string
    quantity: number
    unit: string
    unitPrice: number
    vatRate: number
    paymentTermDays?: number | null
  }>
}

// ============================================================================
// Cost Document Types
// ============================================================================

export type CostDocumentType =
  | 'Receipt'
  | 'Acknowledgment'
  | 'ProForma'
  | 'DebitNote'
  | 'Bill'
  | 'ContractInvoice'
  | 'Other'

export type CostDocumentStatus = 'Draft' | 'Active' | 'Cancelled'
export type CostDocumentSource = 'Manual' | 'OCR' | 'Import'

export interface CostDocument {
  id: string
  name: string
  documentType: CostDocumentType
  documentNumber: string
  documentDate: string
  dueDate?: string
  description?: string
  issuerName: string
  issuerNip?: string
  issuerAddress?: string
  issuerCity?: string
  issuerPostalCode?: string
  issuerCountry?: string
  netAmount: number
  vatAmount?: number
  grossAmount: number
  currency: string
  exchangeRate?: number
  grossAmountPln?: number
  paymentStatus: string
  paidAt?: string
  costCenter?: string
  category?: string
  project?: string
  tags?: string
  status: CostDocumentStatus
  source: CostDocumentSource
  approvalStatus?: string
  approvedBy?: string
  approvedByOid?: string
  approvedAt?: string
  approvalComment?: string
  aiMpkSuggestion?: string
  aiCategorySuggestion?: string
  aiDescription?: string
  aiConfidence?: number
  aiProcessedAt?: string
  documentFileName?: string
  notes?: string
  settingId: string
  mpkCenterId?: string
  createdOn: string
  modifiedOn?: string
}

export interface CostDocumentCreate {
  documentType: CostDocumentType
  documentNumber: string
  documentDate: string
  dueDate?: string
  description?: string
  issuerName: string
  issuerNip?: string
  issuerAddress?: string
  issuerCity?: string
  issuerPostalCode?: string
  issuerCountry?: string
  netAmount?: number
  vatAmount?: number
  grossAmount: number
  currency?: string
  exchangeRate?: number
  grossAmountPln?: number
  costCenter?: string
  category?: string
  project?: string
  tags?: string
  notes?: string
  settingId: string
  mpkCenterId?: string
}

export interface CostDocumentUpdate {
  documentType?: CostDocumentType
  documentNumber?: string
  documentDate?: string
  dueDate?: string
  description?: string
  issuerName?: string
  issuerNip?: string
  grossAmount?: number
  currency?: string
  costCenter?: string
  category?: string
  project?: string
  tags?: string
  notes?: string
  mpkCenterId?: string
  approvalStatus?: string
  paymentStatus?: string
}

export interface CostDocumentListParams {
  settingId?: string
  documentType?: CostDocumentType
  paymentStatus?: string
  mpkCenterId?: string
  approvalStatus?: string
  status?: CostDocumentStatus
  search?: string
  dateFrom?: string
  dateTo?: string
  top?: number
  skip?: number
}

export interface CostDocumentListResponse {
  items: CostDocument[]
  count?: number
}

export interface CostDocumentSummary {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  totalAmount: number
}

// ============================================================================
// API client
// ============================================================================

export const api = {
  // Health
  health: () => apiFetch<{ status: string }>('/api/health'),
  
  healthDetailed: (environment?: string) => {
    const params = environment ? `?environment=${encodeURIComponent(environment)}` : ''
    return apiFetch<DetailedHealthResponse>(`/api/health/detailed${params}`)
  },

  // VAT White List API
  vat: {
    lookup: (params: { nip?: string; regon?: string }) =>
      apiFetch<VatLookupResponse>('/api/vat/lookup', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    validate: (nip: string) =>
      apiFetch<VatValidateResponse>(`/api/vat/validate/${nip.replace(/\D/g, '')}`),

    checkAccount: (nip: string, account: string) =>
      apiFetch<VatCheckResponse>('/api/vat/check-account', {
        method: 'POST',
        body: JSON.stringify({ nip, account }),
      }),
  },

  // Dashboard
  dashboard: {
    stats: (params?: { fromDate?: string; toDate?: string; tenantNip?: string; settingId?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
      if (params?.toDate) searchParams.append('toDate', params.toDate)
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      return apiFetch<DashboardStats>(`/api/dashboard/stats?${searchParams}`)
    },
    activity: (params?: { settingId?: string; top?: number; types?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      if (params?.top) searchParams.append('top', String(params.top))
      if (params?.types) searchParams.append('types', params.types)
      return apiFetch<ActivityFeedResponse>(`/api/dashboard/activity?${searchParams}`)
    },
  },

  // Forecast
  forecast: {
    monthly: (params?: ForecastParams) => {
      const searchParams = new URLSearchParams()
      if (params?.horizon) searchParams.append('horizon', String(params.horizon))
      if (params?.historyMonths) searchParams.append('historyMonths', String(params.historyMonths))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.algorithm) searchParams.append('algorithm', params.algorithm)
      if (params?.algorithmConfig) searchParams.append('algorithmConfig', params.algorithmConfig)
      return apiFetch<ForecastResult>(`/api/forecast/monthly?${searchParams}`)
    },
    byMpk: (params?: ForecastParams) => {
      const searchParams = new URLSearchParams()
      if (params?.horizon) searchParams.append('horizon', String(params.horizon))
      if (params?.historyMonths) searchParams.append('historyMonths', String(params.historyMonths))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.algorithm) searchParams.append('algorithm', params.algorithm)
      if (params?.algorithmConfig) searchParams.append('algorithmConfig', params.algorithmConfig)
      return apiFetch<GroupedForecastResponse>(`/api/forecast/by-mpk?${searchParams}`)
    },
    byCategory: (params?: ForecastParams) => {
      const searchParams = new URLSearchParams()
      if (params?.horizon) searchParams.append('horizon', String(params.horizon))
      if (params?.historyMonths) searchParams.append('historyMonths', String(params.historyMonths))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.algorithm) searchParams.append('algorithm', params.algorithm)
      if (params?.algorithmConfig) searchParams.append('algorithmConfig', params.algorithmConfig)
      return apiFetch<GroupedForecastResponse>(`/api/forecast/by-category?${searchParams}`)
    },
    bySupplier: (params?: ForecastParams & { top?: number }) => {
      const searchParams = new URLSearchParams()
      if (params?.horizon) searchParams.append('horizon', String(params.horizon))
      if (params?.historyMonths) searchParams.append('historyMonths', String(params.historyMonths))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.algorithm) searchParams.append('algorithm', params.algorithm)
      if (params?.algorithmConfig) searchParams.append('algorithmConfig', params.algorithmConfig)
      if (params?.top) searchParams.append('top', String(params.top))
      return apiFetch<GroupedForecastResponse>(`/api/forecast/by-supplier?${searchParams}`)
    },
    algorithms: () =>
      apiFetch<ForecastAlgorithmsResponse>('/api/forecast/algorithms'),
  },

  // Anomalies
  anomalies: {
    list: (params?: AnomalyParams) => {
      const searchParams = new URLSearchParams()
      if (params?.periodDays) searchParams.append('periodDays', String(params.periodDays))
      if (params?.sensitivity) searchParams.append('sensitivity', String(params.sensitivity))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.enabledRules) searchParams.append('enabledRules', params.enabledRules)
      if (params?.ruleConfig) searchParams.append('ruleConfig', params.ruleConfig)
      return apiFetch<AnomalyResult>(`/api/anomalies?${searchParams}`)
    },
    summary: (params?: AnomalyParams) => {
      const searchParams = new URLSearchParams()
      if (params?.periodDays) searchParams.append('periodDays', String(params.periodDays))
      if (params?.sensitivity) searchParams.append('sensitivity', String(params.sensitivity))
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      else if (params?.tenantNip) searchParams.append('tenantNip', params.tenantNip)
      if (params?.enabledRules) searchParams.append('enabledRules', params.enabledRules)
      if (params?.ruleConfig) searchParams.append('ruleConfig', params.ruleConfig)
      return apiFetch<AnomalySummary>(`/api/anomalies/summary?${searchParams}`)
    },
    rules: () =>
      apiFetch<AnomalyRulesResponse>('/api/anomalies/rules'),
  },

  // KSeF Status & Session
  ksef: {
    status: (params?: { companyId?: string; nip?: string; environment?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.companyId) searchParams.append('companyId', params.companyId)
      if (params?.nip) searchParams.append('nip', params.nip)
      if (params?.environment) searchParams.append('environment', params.environment)
      return apiFetch<KsefStatus>(`/api/ksef/status?${searchParams}`)
    },
    
    startSession: (nip?: string) =>
      apiFetch<{ success: boolean; session: KsefSession }>('/api/ksef/session', {
        method: 'POST',
        body: JSON.stringify({ nip }),
      }),
    
    getSession: () =>
      apiFetch<{ session: KsefSession | null }>('/api/ksef/session'),
    
    endSession: () =>
      apiFetch<{ success: boolean }>('/api/ksef/session', {
        method: 'DELETE',
      }),
  },

  // Sync operations
  sync: {
    preview: (params?: { nip?: string; settingId?: string; dateFrom?: string; dateTo?: string }) => {
      const searchParams = new URLSearchParams()
      if (params?.nip) searchParams.append('nip', params.nip)
      if (params?.settingId) searchParams.append('settingId', params.settingId)
      if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
      if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
      
      return apiFetch<SyncPreviewResponse>(`/api/ksef/sync/preview?${searchParams}`)
    },

    run: (params?: { nip?: string; settingId?: string; dateFrom?: string; dateTo?: string }) =>
      apiFetch<SyncResult>('/api/ksef/sync', {
        method: 'POST',
        body: JSON.stringify(params),
      }),

    import: (referenceNumbers: string[], nip?: string, settingId?: string) =>
      apiFetch<SyncResult>('/api/ksef/sync/import', {
        method: 'POST',
        body: JSON.stringify({ referenceNumbers, nip, settingId }),
      }),
  },

  // Invoices CRUD
  invoices: {
    list: (params?: InvoiceListParams) => {
      const searchParams = new URLSearchParams()
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'mpkList' && Array.isArray(value)) {
              searchParams.append(key, value.join(','))
            } else {
              searchParams.append(key, String(value))
            }
          }
        })
      }
      return apiFetch<InvoiceListResponse>(`/api/invoices?${searchParams}`)
    },

    get: (id: string) => apiFetch<Invoice>(`/api/invoices/${id}`),

    update: (id: string, data: {
      mpk?: string
      category?: string
      description?: string
      project?: string
      tags?: string[]
      paymentStatus?: 'pending' | 'paid'
      paymentDate?: string
      // Parent invoice link
      parentInvoiceId?: string | null
      // MPK Center lookup
      mpkCenterId?: string
      // Invoice data fields
      supplierName?: string
      supplierNip?: string
      supplierAddress?: string
      supplierCity?: string
      supplierPostalCode?: string
      supplierCountry?: string
      invoiceNumber?: string
      invoiceDate?: string
      dueDate?: string
      netAmount?: number
      vatAmount?: number
      grossAmount?: number
      // Currency fields
      currency?: 'PLN' | 'EUR' | 'USD'
      exchangeRate?: number
      exchangeDate?: string
      exchangeSource?: string
      grossAmountPln?: number
    }) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<void>(`/api/invoices/${id}`, {
        method: 'DELETE',
      }),

    markAsPaid: (id: string, paymentDate?: string) =>
      apiFetch<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          paymentStatus: 'paid',
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
        }),
      }),

    // Manual invoice creation
    createManual: (data: ManualInvoiceCreate) =>
      apiFetch<Invoice>('/api/invoices/manual', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Attachments
    listAttachments: (invoiceId: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(`/api/invoices/${invoiceId}/attachments`),

    uploadAttachment: (invoiceId: string, data: AttachmentUpload) =>
      apiFetch<Attachment>(`/api/invoices/${invoiceId}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    downloadAttachment: (attachmentId: string) =>
      apiFetch<{ content: string }>(`/api/attachments/${attachmentId}/download`),

    deleteAttachment: (attachmentId: string) =>
      apiFetch<void>(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
      }),

    // Notes
    listNotes: (invoiceId: string) =>
      apiFetch<{ notes: Note[]; count: number }>(`/api/invoices/${invoiceId}/notes`),

    createNote: (invoiceId: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/invoices/${invoiceId}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getNote: (noteId: string) =>
      apiFetch<Note>(`/api/notes/${noteId}`),

    updateNote: (noteId: string, data: NoteUpdate) =>
      apiFetch<Note>(`/api/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deleteNote: (noteId: string) =>
      apiFetch<void>(`/api/notes/${noteId}`, {
        method: 'DELETE',
      }),

    // Document (invoice image/scan) - File column
    uploadDocument: (invoiceId: string, data: DocumentUpload) =>
      apiFetch<{ success: boolean; document: DocumentInfo }>(`/api/invoices/${invoiceId}/document`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    downloadDocument: (invoiceId: string) =>
      apiFetch<DocumentDownload>(`/api/invoices/${invoiceId}/document`),

    getDocumentStreamUrl: (invoiceId: string) =>
      `${API_BASE_URL}/api/invoices/${invoiceId}/document/stream`,

    deleteDocument: (invoiceId: string) =>
      apiFetch<{ success: boolean }>(`/api/invoices/${invoiceId}/document`, {
        method: 'DELETE',
      }),

    downloadThumbnail: (invoiceId: string) =>
      apiFetch<{ content: string; mimeType: string }>(`/api/invoices/${invoiceId}/document/thumbnail`),

    uploadThumbnail: (invoiceId: string, data: { content: string; mimeType?: string }) =>
      apiFetch<{ success: boolean }>(`/api/invoices/${invoiceId}/document/thumbnail`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    getDocumentConfig: () =>
      apiFetch<DocumentConfig>('/api/documents/config'),

    // AI Categorization
    categorizeWithAI: (invoiceId: string) =>
      apiFetch<{
        invoiceId: string
        categorization: {
          mpk: string
          category: string
          description: string
          confidence: number
        }
        message: string
      }>('/api/ai/categorize', {
        method: 'POST',
        body: JSON.stringify({ invoiceId }),
      }),

    batchCategorizeWithAI: (invoiceIds: string[], autoApply = false) =>
      apiFetch<{
        processed: number
        success: number
        failed: number
        errors?: string[]
      }>('/api/ai/batch-categorize', {
        method: 'POST',
        body: JSON.stringify({ invoiceIds, autoApply }),
      }),
    batchMarkPaid: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/mark-paid', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchMarkUnpaid: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/mark-unpaid', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchApprove: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/approve', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchReject: (invoiceIds: string[], comment: string) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/reject', { method: 'POST', body: JSON.stringify({ invoiceIds, comment }) }),
    batchDelete: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/invoice-batch/delete', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
  },

  // Settings
  settings: {
    // KSeF Settings (companies)
    listCompanies: () => apiFetch<{ settings: KsefSetting[] }>('/api/settings'),
    
    getCompany: (id: string) => apiFetch<KsefSetting>(`/api/settings/${id}`),
    
    createCompany: (data: {
      nip: string
      companyName: string
      environment: 'test' | 'demo' | 'production'
      isActive?: boolean
      autoSync?: boolean
      syncInterval?: number
    }) =>
      apiFetch<KsefSetting>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateCompany: (id: string, data: Partial<KsefSetting>) =>
      apiFetch<KsefSetting>(`/api/settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    deleteCompany: (id: string) =>
      apiFetch<void>(`/api/settings/${id}`, {
        method: 'DELETE',
      }),
    
    testToken: (id: string) =>
      apiFetch<TokenTestResult>(`/api/settings/${id}/test-token`, {
        method: 'POST',
      }),

    // Cost Centers
    listCostCenters: () => apiFetch<{ costCenters: CostCenter[] }>('/api/settings/costcenters'),
    
    createCostCenter: (data: { code: string; name: string }) =>
      apiFetch<CostCenter>('/api/settings/costcenters', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    
    updateCostCenter: (id: string, data: Partial<CostCenter>) =>
      apiFetch<CostCenter>(`/api/settings/costcenters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    
    deleteCostCenter: (id: string) =>
      apiFetch<void>(`/api/settings/costcenters/${id}`, {
        method: 'DELETE',
      }),
  },

  // ============================================================================
  // Dataverse-backed endpoints (new)
  // ============================================================================

  // Settings (Dataverse)
  dvSettings: {
    list: (activeOnly = false) => {
      const params = new URLSearchParams()
      if (activeOnly) params.append('activeOnly', 'true')
      return apiFetch<{ settings: DvSetting[]; count: number }>(`/api/settings?${params}`)
    },

    get: (id: string) => apiFetch<DvSetting>(`/api/settings/${id}`),

    create: (data: DvSettingCreate) =>
      apiFetch<DvSetting>('/api/settings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: DvSettingUpdate) =>
      apiFetch<DvSetting>(`/api/settings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      apiFetch<{ message: string; id: string }>(`/api/settings/${id}`, {
        method: 'DELETE',
      }),
  },

  // Sessions (Dataverse)
  dvSessions: {
    list: (settingId: string, activeOnly = false) => {
      const params = new URLSearchParams()
      params.append('settingId', settingId)
      if (activeOnly) params.append('activeOnly', 'true')
      return apiFetch<{ sessions: DvSession[]; count: number }>(`/api/sessions?${params}`)
    },

    getActive: (nip: string) =>
      apiFetch<{ active: boolean; session: DvSession | null }>(`/api/sessions/active/${nip}`),

    get: (id: string) => apiFetch<DvSession>(`/api/sessions/${id}`),

    terminate: (id: string) =>
      apiFetch<{ message: string; id: string }>(`/api/sessions/${id}/terminate`, {
        method: 'POST',
      }),

    cleanup: () =>
      apiFetch<{ message: string; expiredCount: number }>('/api/sessions/cleanup', {
        method: 'POST',
      }),
  },

  // Sync (Dataverse)
  dvSync: {
    start: (data: DvSyncStart) =>
      apiFetch<DvSyncResult>('/api/sync', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    getLogs: (settingId?: string, limit = 50) => {
      const params = new URLSearchParams()
      if (settingId) params.append('settingId', settingId)
      params.append('limit', String(limit))
      return apiFetch<{ logs: DvSyncLog[]; count: number }>(`/api/sync/logs?${params}`)
    },

    getLog: (id: string) => apiFetch<DvSyncLog>(`/api/sync/logs/${id}`),

    getStats: (settingId: string) =>
      apiFetch<DvSyncStats>(`/api/sync/stats/${settingId}`),
  },

  // Document Extraction
  documents: {
    extract: (data: DocumentExtractRequest) =>
      apiFetch<ExtractionResult>('/api/documents/extract', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    extractCost: (data: DocumentExtractRequest) =>
      apiFetch<CostDocumentExtractionResult>('/api/documents/extract-cost', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // KSeF Test Data (for test/demo environments)
  ksefTestdata: {
    getEnvironments: () =>
      apiFetch<KsefTestdataEnvironmentsResponse>('/api/ksef/testdata/environments'),

    checkPermissions: (nip: string) =>
      apiFetch<KsefTestdataPermissionsResponse>(`/api/ksef/testdata/permissions?nip=${nip}`),

    grantPermissions: (data: KsefGrantPermissionsRequest) =>
      apiFetch<KsefGrantPermissionsResponse>('/api/ksef/testdata/permissions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    createTestPerson: (data: KsefCreateTestPersonRequest) =>
      apiFetch<KsefCreateTestPersonResponse>('/api/ksef/testdata/person', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    generate: (data: KsefGenerateTestDataRequest) =>
      apiFetch<KsefGenerateTestDataResponse>('/api/ksef/testdata/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    cleanupPreview: (nip: string, params?: { fromDate?: string; toDate?: string; source?: 'KSeF' | 'Manual' }) => {
      const searchParams = new URLSearchParams()
      searchParams.append('nip', nip)
      if (params?.fromDate) searchParams.append('fromDate', params.fromDate)
      if (params?.toDate) searchParams.append('toDate', params.toDate)
      if (params?.source) searchParams.append('source', params.source)
      return apiFetch<KsefCleanupPreviewResponse>(`/api/ksef/testdata/cleanup/preview?${searchParams}`)
    },

    cleanup: (data: KsefCleanupRequest) => {
      const searchParams = new URLSearchParams()
      searchParams.append('nip', data.nip)
      if (data.companyId) searchParams.append('companyId', data.companyId)
      if (data.dryRun !== undefined) searchParams.append('dryRun', String(data.dryRun))
      if (data.fromDate) searchParams.append('fromDate', data.fromDate)
      if (data.toDate) searchParams.append('toDate', data.toDate)
      if (data.source) searchParams.append('source', data.source)
      return apiFetch<KsefCleanupResponse>(`/api/ksef/testdata/cleanup?${searchParams}`, {
        method: 'DELETE',
      })
    },
  },

  // Exchange Rates (NBP)
  exchangeRates: {
    get: (currency: 'EUR' | 'USD', date?: string) => {
      const params = new URLSearchParams()
      params.append('currency', currency)
      if (date) params.append('date', date)
      return apiFetch<ExchangeRateResponse>(`/api/exchange-rates?${params}`)
    },

    convert: (amount: number, currency: 'EUR' | 'USD', date?: string) =>
      apiFetch<ConversionResponse>('/api/exchange-rates/convert', {
        method: 'POST',
        body: JSON.stringify({ amount, currency, date }),
      }),
  },

  // ============================================================================
  // MPK Centers
  // ============================================================================

  mpkCenters: {
    list: (settingId: string) =>
      apiFetch<{ mpkCenters: MpkCenter[]; count: number }>(`/api/mpk-centers?settingId=${settingId}`),

    get: (id: string) =>
      apiFetch<{ mpkCenter: MpkCenter }>(`/api/mpk-centers/${id}`),

    create: (data: MpkCenterCreate) =>
      apiFetch<{ mpkCenter: MpkCenter }>('/api/mpk-centers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (id: string, data: MpkCenterUpdate) =>
      apiFetch<{ mpkCenter: MpkCenter }>(`/api/mpk-centers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    deactivate: (id: string) =>
      apiFetch<{ message: string }>(`/api/mpk-centers/${id}`, {
        method: 'DELETE',
      }),

    getApprovers: (id: string) =>
      apiFetch<{ approvers: MpkApprover[]; count: number }>(`/api/mpk-centers/${id}/approvers`),

    setApprovers: (id: string, systemUserIds: string[]) =>
      apiFetch<{ approvers: MpkApprover[]; count: number }>(`/api/mpk-centers/${id}/approvers`, {
        method: 'PUT',
        body: JSON.stringify({ systemUserIds }),
      }),

    getBudgetStatus: (id: string) =>
      apiFetch<{ data: BudgetStatus }>(`/api/mpk-centers/${id}/budget-status`),

    applyApproval: (id: string, scope: 'unprocessed' | 'decided' | 'all', dryRun?: boolean) =>
      apiFetch<{ updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean }>(
        `/api/mpk-centers/${id}/apply-approval`,
        { method: 'POST', body: JSON.stringify({ scope, dryRun }) }
      ),

    revokeApproval: (id: string, scope: 'pending' | 'decided' | 'all', dryRun?: boolean) =>
      apiFetch<{ updated: number; skipped: number; autoApproved: number; total: number; dryRun: boolean }>(
        `/api/mpk-centers/${id}/revoke-approval`,
        { method: 'POST', body: JSON.stringify({ scope, dryRun }) }
      ),
  },

  // ============================================================================
  // Users (Dataverse system users)
  // ============================================================================

  users: {
    list: (settingId: string) =>
      apiFetch<{ users: DvSystemUser[]; count: number }>(`/api/users?settingId=${settingId}`),
    listApprovers: (settingId: string) =>
      apiFetch<{ role: string; users: DvSystemUser[]; count: number }>(`/api/users?settingId=${settingId}&role=approver`),
  },

  // ============================================================================
  // Approver Overview (Admin)
  // ============================================================================

  approverOverview: {
    get: (settingId: string) =>
      apiFetch<{
        members: Array<{
          id: string
          displayName: string
          email: string
          hasDataverseAccount: boolean
          mpkCenterNames: string[]
          supplierCount: number
        }>
        configured: boolean
        count: number
      }>(`/api/approvers/overview?settingId=${settingId}`),
  },

  // ============================================================================
  // Approvals
  // ============================================================================

  approvals: {
    pending: (settingId: string) => {
      const params = new URLSearchParams({ settingId })
      return apiFetch<{ approvals: PendingApproval[]; count: number }>(`/api/approvals/pending?${params}`)
    },

    approve: (invoiceId: string, comment?: string) =>
      apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    reject: (invoiceId: string, comment?: string) =>
      apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),

    cancelApproval: (invoiceId: string) =>
      apiFetch<{ invoice: Invoice }>(`/api/invoices/${invoiceId}/cancel-approval`, {
        method: 'POST',
      }),

    bulkApprove: (invoiceIds: string[], comment?: string) =>
      apiFetch<{ results: Array<{ invoiceId: string; success: boolean; error?: string }> }>(
        '/api/invoices/bulk-approve',
        { method: 'POST', body: JSON.stringify({ invoiceIds, comment }) }
      ),

    refreshApprovers: (invoiceId: string) =>
      apiFetch<{ message: string }>(`/api/invoices/${invoiceId}/refresh-approvers`, {
        method: 'POST',
      }),
  },

  // ============================================================================
  // Budget
  // ============================================================================

  budget: {
    summary: (settingId: string) =>
      apiFetch<{ data: BudgetStatus[]; count: number }>(`/api/budget/summary?settingId=${settingId}`),
  },

  // ============================================================================
  // Notifications
  // ============================================================================

  notifications: {
    list: (settingId: string, options?: { unreadOnly?: boolean; top?: number }) => {
      const params = new URLSearchParams({ settingId })
      if (options?.unreadOnly) params.append('unreadOnly', 'true')
      if (options?.top) params.append('top', String(options.top))
      return apiFetch<{ data: AppNotification[]; count: number }>(`/api/notifications?${params}`)
    },

    markRead: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/notifications/${id}/read`, {
        method: 'PATCH',
      }),

    dismiss: (id: string) =>
      apiFetch<{ success: boolean }>(`/api/notifications/${id}/dismiss`, {
        method: 'POST',
      }),

    markAllRead: (settingId: string) =>
      apiFetch<{ success: boolean; marked: number }>(`/api/notifications/mark-all-read?settingId=${settingId}`, {
        method: 'POST',
      }),

    unreadCount: (settingId: string) =>
      apiFetch<{ count: number }>(`/api/notifications/unread-count?settingId=${settingId}`),
  },

  // ============================================================================
  // Reports
  // ============================================================================

  reports: {
    budgetUtilization: (settingId: string, mpkCenterId?: string) => {
      const params = new URLSearchParams({ settingId })
      if (mpkCenterId) params.append('mpkCenterId', mpkCenterId)
      return apiFetch<{ data: BudgetUtilizationReport }>(`/api/reports/budget-utilization?${params}`)
    },

    approvalHistory: (settingId: string, filters?: {
      dateFrom?: string; dateTo?: string; mpkCenterId?: string; status?: string
    }) => {
      const params = new URLSearchParams({ settingId })
      if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.append('dateTo', filters.dateTo)
      if (filters?.mpkCenterId) params.append('mpkCenterId', filters.mpkCenterId)
      if (filters?.status) params.append('status', filters.status)
      return apiFetch<{ data: ApprovalHistoryReport }>(`/api/reports/approval-history?${params}`)
    },

    approverPerformance: (settingId: string) =>
      apiFetch<{ data: ApproverPerformanceReport }>(`/api/reports/approver-performance?settingId=${encodeURIComponent(settingId)}`),

    invoiceProcessing: (settingId: string) =>
      apiFetch<{ data: ProcessingPipelineReport }>(`/api/reports/invoice-processing?settingId=${encodeURIComponent(settingId)}`),

    costDistribution: (settingId: string) =>
      apiFetch<{ data: CostDistributionReport }>(`/api/reports/cost-distribution?settingId=${encodeURIComponent(settingId)}`),
  },

  // ============================================================================
  // Suppliers
  // ============================================================================

  suppliers: {
    list: (params?: SupplierListParams) => {
      const sp = new URLSearchParams()
      if (params?.settingId) sp.append('settingId', params.settingId)
      if (params?.status) sp.append('status', params.status)
      if (params?.search) sp.append('search', params.search)
      if (params?.hasSelfBillingAgreement !== undefined) sp.append('hasSelfBillingAgreement', String(params.hasSelfBillingAgreement))
      if (params?.top) sp.append('top', String(params.top))
      if (params?.skip) sp.append('skip', String(params.skip))
      return apiFetch<SupplierListResponse>(`/api/suppliers?${sp}`)
    },
    get: (id: string) =>
      apiFetch<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(id)}`).then(r => r.supplier),
    create: (data: SupplierCreate) =>
      apiFetch<{ supplier: Supplier }>('/api/suppliers', { method: 'POST', body: JSON.stringify(data) }).then(r => r.supplier),
    update: (id: string, data: Partial<Supplier>) =>
      apiFetch<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }).then(r => r.supplier),
    delete: (id: string) =>
      apiFetch<void>(`/api/suppliers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    stats: (id: string) =>
      apiFetch<{ stats: SupplierDetailStats }>(`/api/suppliers/${encodeURIComponent(id)}/stats`).then(r => r.stats),
    refreshStats: (id: string) =>
      apiFetch<void>(`/api/suppliers/${encodeURIComponent(id)}/stats`, { method: 'POST' }),
    invoices: (id: string, params?: { top?: number; skip?: number }) => {
      const sp = new URLSearchParams()
      if (params?.top) sp.append('top', String(params.top))
      if (params?.skip) sp.append('skip', String(params.skip))
      return apiFetch<{ invoices: Invoice[]; count: number }>(`/api/suppliers/${encodeURIComponent(id)}/invoices?${sp}`)
    },
    refreshVat: (id: string) =>
      apiFetch<{ supplier: Supplier }>(`/api/suppliers/${encodeURIComponent(id)}/refresh-vat`, { method: 'POST' }).then(r => r.supplier),
    createFromVat: (nip: string, settingId: string) =>
      apiFetch<{ supplier: Supplier }>('/api/suppliers/from-vat', { method: 'POST', body: JSON.stringify({ nip, settingId }) }).then(r => r.supplier),

    // Supplier attachments (Dataverse annotations with isdocument=true)
    listAttachments: (id: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(`/api/suppliers/${encodeURIComponent(id)}/attachments`),
    uploadAttachment: (id: string, data: AttachmentUpload) =>
      apiFetch<Attachment>(`/api/suppliers/${encodeURIComponent(id)}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Supplier notes (Dataverse annotations with isdocument=false)
    listNotes: (id: string) =>
      apiFetch<{ notes: Note[]; count: number }>(`/api/suppliers/${encodeURIComponent(id)}/notes`),
    createNote: (id: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/suppliers/${encodeURIComponent(id)}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Supplier bulk import
    import: (file: File, settingId: string) => {
      const contentType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      return apiFetch<SupplierImportResult>(
        `/api/suppliers/import?settingId=${encodeURIComponent(settingId)}`,
        { method: 'POST', body: file, headers: { 'Content-Type': contentType } },
      )
    },
    confirmImport: (settingId: string, rows: SupplierImportEnrichedRow[]) =>
      apiFetch<SupplierImportConfirmResult>('/api/suppliers/import/confirm', {
        method: 'POST',
        body: JSON.stringify({ settingId, rows }),
      }),
    batchDeactivate: (supplierIds: string[]) =>
      apiFetch<BatchActionResult>('/api/supplier-batch/deactivate', { method: 'POST', body: JSON.stringify({ supplierIds }) }),
    batchReactivate: (supplierIds: string[]) =>
      apiFetch<BatchActionResult>('/api/supplier-batch/reactivate', { method: 'POST', body: JSON.stringify({ supplierIds }) }),
  },

  // ============================================================================
  // Self-Billing Agreements
  // ============================================================================

  sbAgreements: {
    list: (params?: { settingId?: string; supplierId?: string }) => {
      const sp = new URLSearchParams()
      if (params?.settingId) sp.append('settingId', params.settingId)
      if (params?.supplierId) sp.append('supplierId', params.supplierId)
      return apiFetch<SbAgreementListResponse>(`/api/sb-agreements?${sp}`)
    },
    get: (id: string) => apiFetch<SbAgreement>(`/api/sb-agreements/${encodeURIComponent(id)}`),
    create: (data: SbAgreementCreate) =>
      apiFetch<SbAgreement>('/api/sb-agreements', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SbAgreement>) =>
      apiFetch<SbAgreement>(`/api/sb-agreements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    terminate: (id: string) =>
      apiFetch<SbAgreement>(`/api/sb-agreements/${encodeURIComponent(id)}/terminate`, { method: 'POST' }),
    listAttachments: (id: string) =>
      apiFetch<Attachment[]>(`/api/sb-agreements/${encodeURIComponent(id)}/attachments`),
    uploadAttachment: (id: string, data: { fileName: string; content: string; contentType: string }) =>
      apiFetch<Attachment>(`/api/sb-agreements/${encodeURIComponent(id)}/attachments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ============================================================================
  // Self-Billing Templates
  // ============================================================================

  sbTemplates: {
    list: (params?: { settingId?: string; supplierId?: string }) => {
      const sp = new URLSearchParams()
      if (params?.settingId) sp.append('settingId', params.settingId)
      if (params?.supplierId) sp.append('supplierId', params.supplierId)
      return apiFetch<SbTemplateListResponse>(`/api/sb-templates?${sp}`)
    },
    get: (id: string) => apiFetch<SbTemplate>(`/api/sb-templates/${encodeURIComponent(id)}`),
    create: (data: SbTemplateCreate) =>
      apiFetch<SbTemplate>('/api/sb-templates', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<SbTemplate>) =>
      apiFetch<SbTemplate>(`/api/sb-templates/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/sb-templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    duplicate: (id: string) =>
      apiFetch<SbTemplate>(`/api/sb-templates/${encodeURIComponent(id)}/duplicate`, { method: 'POST' }),
  },

  // ============================================================================
  // Cost Documents
  // ============================================================================

  costDocuments: {
    list: (params?: CostDocumentListParams) => {
      const sp = new URLSearchParams()
      if (params?.settingId) sp.append('settingId', params.settingId)
      if (params?.documentType) sp.append('documentType', params.documentType)
      if (params?.paymentStatus) sp.append('paymentStatus', params.paymentStatus)
      if (params?.mpkCenterId) sp.append('mpkCenterId', params.mpkCenterId)
      if (params?.approvalStatus) sp.append('approvalStatus', params.approvalStatus)
      if (params?.status) sp.append('status', params.status)
      if (params?.search) sp.append('search', params.search)
      if (params?.dateFrom) sp.append('dateFrom', params.dateFrom)
      if (params?.dateTo) sp.append('dateTo', params.dateTo)
      if (params?.top) sp.append('top', String(params.top))
      if (params?.skip) sp.append('skip', String(params.skip))
      return apiFetch<CostDocumentListResponse>(`/api/cost-documents?${sp}`)
    },
    get: (id: string) => apiFetch<CostDocument>(`/api/cost-documents/${encodeURIComponent(id)}`),
    create: (data: CostDocumentCreate) =>
      apiFetch<CostDocument>('/api/cost-documents', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: CostDocumentUpdate) =>
      apiFetch<CostDocument>(`/api/cost-documents/${encodeURIComponent(id)}`, {
        method: 'PATCH', body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<void>(`/api/cost-documents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    summary: (settingId: string) =>
      apiFetch<CostDocumentSummary>(`/api/cost-documents/summary?settingId=${encodeURIComponent(settingId)}`),
    // AI Categorize
    aiCategorize: (data: { costDocumentId: string }) =>
      apiFetch<{ categorization: { mpk?: string; mpkCenterId?: string; category?: string; description?: string; confidence?: number } }>(
        '/api/cost-documents/ai-categorize', { method: 'POST', body: JSON.stringify(data) }
      ),
    // Batch operations
    batchApprove: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/approve', { method: 'POST', body: JSON.stringify({ ids }) }),
    batchReject: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/reject', { method: 'POST', body: JSON.stringify({ ids }) }),
    batchMarkPaid: (ids: string[]) =>
      apiFetch<BatchActionResult>('/api/cost-documents/batch/mark-paid', { method: 'POST', body: JSON.stringify({ ids }) }),
    // Notes
    listNotes: (id: string) =>
      apiFetch<{ notes: Note[]; count: number }>(`/api/cost-documents/${encodeURIComponent(id)}/notes`),
    createNote: (id: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/cost-documents/${encodeURIComponent(id)}/notes`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    // Attachments
    listAttachments: (id: string) =>
      apiFetch<{ attachments: Attachment[]; count: number }>(`/api/cost-documents/${encodeURIComponent(id)}/attachments`),
    // Import
    importTemplate: () =>
      apiFetch<Blob>('/api/cost-documents/import/template', { headers: { 'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }),
  },

  // ============================================================================
  // Self-Billing Invoices
  // ============================================================================

  selfBilling: {
    list: (params?: SelfBillingInvoiceListParams) => {
      const sp = new URLSearchParams()
      if (params?.settingId) sp.append('settingId', params.settingId)
      if (params?.supplierId) sp.append('supplierId', params.supplierId)
      if (params?.status) sp.append('selfBillingStatus', params.status)
      if (params?.dateFrom) sp.append('dateFrom', params.dateFrom)
      if (params?.dateTo) sp.append('dateTo', params.dateTo)
      if (params?.top) sp.append('top', String(params.top))
      if (params?.skip) sp.append('skip', String(params.skip))
      return apiFetch<SelfBillingInvoiceListResponse>(`/api/self-billing/invoices?${sp}`)
    },
    get: (id: string) => apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}`),
    create: (data: SelfBillingInvoiceCreateData) =>
      apiFetch<SelfBillingInvoice>('/api/self-billing/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: SelfBillingInvoiceUpdateData) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      apiFetch<void>(`/api/self-billing/invoices/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    batchCreate: (data: SelfBillingBatchCreateData) =>
      apiFetch<SelfBillingBatchResult>('/api/self-billing/invoices/batch', { method: 'POST', body: JSON.stringify(data) }),
    generate: (data: SelfBillingGenerateRequest) =>
      apiFetch<SelfBillingCreateResponse>('/api/self-billing/invoices/generate', { method: 'POST', body: JSON.stringify(data) }),
    preview: (data: SelfBillingGenerateRequest) =>
      apiFetch<SelfBillingGenerateResponse>('/api/self-billing/invoices/preview', { method: 'POST', body: JSON.stringify(data) }),
    confirmGenerated: (data: SelfBillingConfirmRequest) =>
      apiFetch<SelfBillingBatchResult>('/api/self-billing/invoices/generate/confirm', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    submit: (id: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    approve: (id: string, comment?: string, invoiceNumber?: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/approve`, { method: 'POST', body: JSON.stringify({ comment, invoiceNumber }) }),
    reject: (id: string, reason?: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    sendToKsef: (id: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/send-ksef`, { method: 'POST' }),
    revertToDraft: (id: string, reason: string) =>
      apiFetch<SelfBillingInvoice>(`/api/self-billing/invoices/${encodeURIComponent(id)}/revert`, { method: 'POST', body: JSON.stringify({ reason }) }),
    import: (file: File, settingId: string) => {
      const contentType = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv'
      return apiFetch<SelfBillingImportResult>(
        `/api/self-billing/invoices/import?settingId=${encodeURIComponent(settingId)}`,
        { method: 'POST', body: file, headers: { 'Content-Type': contentType } },
      )
    },
    confirmImport: (settingId: string, rows: SbImportEnrichedRow[]) =>
      apiFetch<SelfBillingImportConfirmResult>('/api/self-billing/invoices/import/confirm', { method: 'POST', body: JSON.stringify({ settingId, rows }) }),
    downloadTemplate: () =>
      apiFetch<{ content: string; fileName: string }>('/api/self-billing/invoices/import/template'),
    pendingApprovals: (settingId?: string, all?: boolean) => {
      const sp = new URLSearchParams()
      if (settingId) sp.append('settingId', settingId)
      if (all) sp.append('all', 'true')
      return apiFetch<SelfBillingInvoiceListResponse>(`/api/self-billing/approvals/pending?${sp}`)
    },
    // Batch actions
    batchSubmit: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/self-billing/batch/submit', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchApprove: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/self-billing/batch/approve', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchReject: (invoiceIds: string[], reason: string) =>
      apiFetch<BatchActionResult>('/api/self-billing/batch/reject', { method: 'POST', body: JSON.stringify({ invoiceIds, reason }) }),
    batchSendToKsef: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/self-billing/batch/send-ksef', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    batchDelete: (invoiceIds: string[]) =>
      apiFetch<BatchActionResult>('/api/self-billing/batch/delete', { method: 'POST', body: JSON.stringify({ invoiceIds }) }),
    // Notes
    listNotes: (id: string) =>
      apiFetch<{ notes: Note[]; count: number }>(`/api/self-billing/invoices/${encodeURIComponent(id)}/notes`),
    createNote: (id: string, data: NoteCreate) =>
      apiFetch<Note>(`/api/self-billing/invoices/${encodeURIComponent(id)}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
}

// ============================================================================
// Exchange Rate Types
// ============================================================================

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

// ============================================================================
// Dataverse Types
// ============================================================================

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
  newInvoiceIds?: string[]
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

// ============================================================================
// React Query hooks helpers
// ============================================================================

export const queryKeys = {
  health: ['health'] as const,
  ksefStatus: ['ksef', 'status'] as const,
  ksefSession: ['ksef', 'session'] as const,
  syncPreview: (params?: { nip?: string; dateFrom?: string; dateTo?: string }) =>
    ['sync', 'preview', params] as const,
  
  // Dashboard
  dashboardStats: (params?: { fromDate?: string; toDate?: string; settingId?: string }) =>
    ['dashboard', 'stats', params] as const,
  dashboardActivity: (params?: { settingId?: string; top?: number; types?: string }) =>
    ['dashboard', 'activity', params] as const,
  
  invoices: (params?: InvoiceListParams) => ['invoices', params] as const,
  invoice: (id: string) => ['invoices', id] as const,
  invoiceAttachments: (id: string) => ['invoices', id, 'attachments'] as const,
  companies: ['settings', 'companies'] as const,
  company: (id: string) => ['settings', 'companies', id] as const,
  costCenters: ['settings', 'costCenters'] as const,

  // Forecast & Anomalies
  forecastMonthly: (params?: ForecastParams) =>
    ['forecast', 'monthly', params] as const,
  forecastByMpk: (params?: ForecastParams) =>
    ['forecast', 'by-mpk', params] as const,
  forecastByCategory: (params?: ForecastParams) =>
    ['forecast', 'by-category', params] as const,
  forecastBySupplier: (params?: ForecastParams) =>
    ['forecast', 'by-supplier', params] as const,
  forecastAlgorithms: ['forecast', 'algorithms'] as const,
  anomalies: (params?: AnomalyParams) =>
    ['anomalies', params] as const,
  anomaliesSummary: (params?: AnomalyParams) =>
    ['anomalies', 'summary', params] as const,
  anomalyRules: ['anomalies', 'rules'] as const,

  // VAT White List query keys
  vatLookup: (identifier: string) => ['vat', 'lookup', identifier] as const,
  recentSuppliers: (tenantNip?: string) => ['suppliers', 'recent', tenantNip] as const,

  // Dataverse query keys
  dvSettings: (activeOnly?: boolean) => ['dv', 'settings', { activeOnly }] as const,
  dvSetting: (id: string) => ['dv', 'settings', id] as const,
  dvSessions: (settingId: string, activeOnly?: boolean) => 
    ['dv', 'sessions', { settingId, activeOnly }] as const,
  dvSessionActive: (nip: string) => ['dv', 'sessions', 'active', nip] as const,
  dvSession: (id: string) => ['dv', 'sessions', id] as const,
  dvSyncLogs: (settingId?: string, limit?: number) => 
    ['dv', 'sync', 'logs', { settingId, limit }] as const,
  dvSyncLog: (id: string) => ['dv', 'sync', 'logs', id] as const,
  dvSyncStats: (settingId: string) => ['dv', 'sync', 'stats', settingId] as const,

  // MPK Centers
  mpkCenters: (settingId: string) => ['mpk-centers', settingId] as const,
  mpkCenter: (id: string) => ['mpk-centers', 'detail', id] as const,
  mpkApprovers: (id: string) => ['mpk-centers', id, 'approvers'] as const,
  mpkBudgetStatus: (id: string) => ['mpk-centers', id, 'budget-status'] as const,
  dvUsers: (settingId: string) => ['users', settingId] as const,
  approverOverview: (settingId: string) => ['approvers', 'overview', settingId] as const,

  // Approvals
  pendingApprovals: (settingId: string) => ['approvals', 'pending', settingId] as const,

  // Budget
  budgetSummary: (settingId: string) => ['budget', 'summary', settingId] as const,

  // Notifications
  notifications: (settingId: string) => ['notifications', settingId] as const,
  notificationsUnreadCount: (settingId: string) => ['notifications', 'unread-count', settingId] as const,

  // Reports
  reportBudgetUtilization: (settingId: string, mpkCenterId?: string) =>
    ['reports', 'budget-utilization', settingId, mpkCenterId] as const,
  reportApprovalHistory: (settingId: string, filters?: Record<string, string | undefined>) =>
    ['reports', 'approval-history', settingId, filters] as const,
  reportApproverPerformance: (settingId: string) =>
    ['reports', 'approver-performance', settingId] as const,
  reportInvoiceProcessing: (settingId: string) =>
    ['reports', 'invoice-processing', settingId] as const,
  reportCostDistribution: (settingId: string) =>
    ['reports', 'cost-distribution', settingId] as const,

  // Suppliers
  suppliers: (params?: SupplierListParams) => ['suppliers', params] as const,
  supplier: (id: string) => ['suppliers', id] as const,
  supplierStats: (id: string) => ['suppliers', id, 'stats'] as const,
  supplierInvoices: (id: string) => ['suppliers', id, 'invoices'] as const,

  // Self-Billing Agreements
  sbAgreements: (params?: { settingId?: string; supplierId?: string }) =>
    ['sb-agreements', params] as const,
  sbAgreement: (id: string) => ['sb-agreements', id] as const,

  // Self-Billing Templates
  sbTemplates: (params?: { settingId?: string; supplierId?: string }) =>
    ['sb-templates', params] as const,
  sbTemplate: (id: string) => ['sb-templates', id] as const,

  // Self-Billing Invoices
  selfBillingInvoices: (params?: SelfBillingInvoiceListParams) =>
    ['self-billing', 'invoices', params] as const,
  selfBillingInvoice: (id: string) => ['self-billing', 'invoices', id] as const,
  selfBillingInvoiceNotes: (id: string) => ['self-billing', 'invoices', id, 'notes'] as const,
  sbPendingApprovals: (settingId?: string) =>
    ['self-billing', 'approvals', 'pending', settingId] as const,

  // Cost Documents
  costDocuments: (params?: CostDocumentListParams) => ['cost-documents', params] as const,
  costDocument: (id: string) => ['cost-documents', id] as const,
  costDocumentSummary: (settingId: string) => ['cost-documents', 'summary', settingId] as const,
  costDocumentNotes: (id: string) => ['cost-documents', id, 'notes'] as const,
  costDocumentAttachments: (id: string) => ['cost-documents', id, 'attachments'] as const,
}

// ============================================================================
// Document Extraction Types
// ============================================================================

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

// ============================================================================
// Cost Document Extraction Types
// ============================================================================

export interface ExtractedCostDocumentData {
  documentType?: CostDocumentType
  documentNumber?: string
  issueDate?: string
  dueDate?: string
  issuerName?: string
  issuerNip?: string
  issuerAddress?: ExtractedAddress
  issuerBankAccount?: string
  buyerName?: string
  buyerNip?: string
  netAmount?: number
  vatAmount?: number
  grossAmount?: number
  currency?: string
  items?: ExtractedItem[]
  paymentMethod?: string
  bankAccountNumber?: string
  contractNumber?: string
  contractDate?: string
  serviceDescription?: string
  suggestedMpk?: string
  suggestedCategory?: string
  suggestedDescription?: string
}

export interface CostDocumentExtractionResult {
  success: boolean
  data?: ExtractedCostDocumentData
  confidence: number
  extractedAt: string
  sourceType: 'pdf' | 'image'
  processingTimeMs?: number
  rawText?: string
  error?: string
}

// ============================================================================
// KSeF Testdata Types
// ============================================================================

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
  companyId?: string // ID of KsefSetting to uniquely identify company (useful when multiple companies have same NIP)
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
  companyId?: string // ID of KsefSetting to uniquely identify company (useful when multiple companies have same NIP)
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
