/**
 * Dataverse API Logger
 * 
 * Dedicated logger for Dataverse API traffic with:
 * - Log level gating (error → trace)
 * - File-based logging with rotation
 * - Sensitive data redaction
 * - Traffic logging behind explicit switch
 * 
 * ENV Configuration:
 * - DV_LOG_LEVEL: error|warn|info|debug|trace (default: error)
 * - DV_LOG_TRAFFIC: true|false (default: false) - enable request/response logs
 * - DV_LOG_CONSOLE: true|false (default: false) - echo to console
 * - DV_LOG_FILE_MAX_MB: number (default: 5) - max log file size before rotation
 * - DV_LOG_ALLOW_VERBOSE: true|false (default: false) - allow levels above error
 * 
 * Usage:
 *   logDataverseRequest('getInvoice', 'dvlp_ksefinvoices(id)', { method: 'GET' })
 *   logDataverseResponse('getInvoice', response, 123)
 *   logDataverseError('getInvoice', error)
 *   logDataverseMapping('mapInvoice', rawData, mappedData)
 */

import { writeFileSync, appendFileSync, existsSync, statSync, renameSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

// Log file in the api root
const LOG_FILE_PATH = join(process.cwd(), 'dataverse-debug.log')

type LogType = 'REQUEST' | 'RESPONSE' | 'MAPPING' | 'ERROR' | 'INFO' | 'WARN' | 'DEBUG'

// Numeric levels for quick comparisons
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 } as const
type LevelName = keyof typeof LEVELS

/**
 * Read level from env, but default to 'error' and require DV_LOG_ALLOW_VERBOSE=true to honor a higher level
 */
function getLevel(): LevelName {
  const allowVerbose = (process.env.DV_LOG_ALLOW_VERBOSE || 'false').toLowerCase() === 'true'
  if (!allowVerbose) return 'error'
  const raw = (process.env.DV_LOG_LEVEL || 'error').toLowerCase()
  if (raw in LEVELS) return raw as LevelName
  return 'error'
}

/**
 * Additional hard switch for traffic logs (REQUEST/RESPONSE/MAPPING)
 */
function isTrafficEnabled(): boolean {
  return (process.env.DV_LOG_TRAFFIC || 'false').toLowerCase() === 'true'
}

function getMaxBytes(): number {
  const mb = parseInt(process.env.DV_LOG_FILE_MAX_MB || '5', 10)
  return Number.isFinite(mb) && mb > 0 ? mb * 1024 * 1024 : 5 * 1024 * 1024
}

interface LogEntry {
  timestamp: string
  type: LogType
  operation: string
  data: unknown
  duration?: number
}

export class DataverseLogger {
  private static instance: DataverseLogger
  private level: LevelName = getLevel()
  // Default console logging OFF to avoid noise; enable with DV_LOG_CONSOLE=true if needed
  private consoleEnabled: boolean = (process.env.DV_LOG_CONSOLE ?? 'false').toLowerCase() === 'true'
  // Gate high-volume traffic logs behind a dedicated switch (off by default)
  private trafficEnabled: boolean = isTrafficEnabled()

  static getInstance(): DataverseLogger {
    if (!DataverseLogger.instance) {
      DataverseLogger.instance = new DataverseLogger()
    }
    return DataverseLogger.instance
  }

  private constructor() {
    try {
      // Ensure directory exists
      const dir = dirname(LOG_FILE_PATH)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      // Rotate if file too large
      if (existsSync(LOG_FILE_PATH)) {
        const stats = statSync(LOG_FILE_PATH)
        if (stats.size > getMaxBytes()) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-')
          const rotated = LOG_FILE_PATH.replace(/\.log$/, `.${ts}.log`)
          renameSync(LOG_FILE_PATH, rotated)
          this.writeHeader('Rotated')
        }
      } else {
        this.writeHeader('Started')
      }
    } catch (e) {
      // Failing to rotate should not crash the app
      console.warn('[DATAVERSE] Logger init issue:', e instanceof Error ? e.message : e)
    }
  }

  private writeHeader(reason: 'Started' | 'Cleared' | 'Rotated'): void {
    try {
      this.writeToFile('='.repeat(80) + '\n')
      this.writeToFile(`DATAVERSE DEBUG LOG - ${reason}: ${new Date().toISOString()}\n`)
      this.writeToFile(`LEVEL: ${this.level.toUpperCase()}  MAX: ${Math.round(getMaxBytes() / (1024 * 1024))}MB\n`)
      this.writeToFile('='.repeat(80) + '\n\n')
    } catch (error) {
      console.error('Failed to write header to log file:', error)
    }
  }

  private shouldLog(desired: LevelName): boolean {
    return LEVELS[desired] <= LEVELS[this.level]
  }

  // Traffic (REQUEST/RESPONSE/MAPPING) requires both TRACE level and DV_LOG_TRAFFIC=true
  private shouldLogTraffic(): boolean {
    return this.trafficEnabled && this.shouldLog('trace')
  }

  private redactKey(key: string): boolean {
    return /authorization|cookie|set-cookie|token|secret|password|assertion|clientsecret|api-key|apikey/i.test(key)
  }

  private sanitize(obj: unknown): unknown {
    // Shallow clone and redact common sensitive areas
    if (!obj || typeof obj !== 'object') return obj
    const clone = Array.isArray(obj) ? [...obj] : { ...obj } as Record<string, unknown>

    // Redact headers
    if ('headers' in clone && clone.headers && typeof clone.headers === 'object') {
      const headers = clone.headers as Record<string, unknown>
      const sanitized: Record<string, unknown> = {}
      for (const k of Object.keys(headers)) {
        sanitized[k] = this.redactKey(k) ? '[REDACTED]' : headers[k]
      }
      clone.headers = sanitized
    }

    // Redact body keys
    if ('body' in clone && clone.body && typeof clone.body === 'object') {
      const body = clone.body as Record<string, unknown>
      const sanitizedBody: Record<string, unknown> = {}
      for (const k of Object.keys(body)) {
        sanitizedBody[k] = this.redactKey(k) ? '[REDACTED]' : body[k]
      }
      clone.body = sanitizedBody
    }

    return clone
  }

  private safeStringify(data: unknown, maxChars = 2000): string {
    const seen = new WeakSet()
    const replacer = (_key: string, value: unknown): unknown => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]'
        seen.add(value)
      }
      return value
    }
    try {
      let str = JSON.stringify(data, replacer, 2)
      if (str && str.length > maxChars) {
        str = str.slice(0, maxChars) + '... [truncated]'
      }
      return str || 'null'
    } catch {
      return '[Stringify Error]'
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const lines = [
      `[${entry.timestamp}] [${entry.type}] ${entry.operation}`,
    ]
    if (entry.duration !== undefined) {
      lines[0] += ` (${entry.duration}ms)`
    }
    if (entry.data !== undefined) {
      lines.push(this.safeStringify(entry.data))
    }
    return lines.join('\n') + '\n\n'
  }

  private writeToFile(content: string): void {
    try {
      appendFileSync(LOG_FILE_PATH, content)
    } catch (error) {
      // Silently fail file writes - don't break the application
      if (this.consoleEnabled) {
        console.error('[DATAVERSE] Failed to write to log file:', error)
      }
    }
  }

  // =====================
  // Public logging methods
  // =====================

  logRequest(operation: string, url: string, options?: unknown): void {
    if (!this.shouldLogTraffic()) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'REQUEST',
      operation,
      data: this.sanitize({ url, ...((options as object) || {}) }),
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled) console.info(`[DATAVERSE] ${operation} - ${url}`)
  }

  logResponse(operation: string, response: unknown, duration?: number): void {
    if (!this.shouldLogTraffic()) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'RESPONSE',
      operation,
      data: this.sanitize(response),
      duration,
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled && this.shouldLog('info')) {
      console.info(`[DATAVERSE] ${operation} - Response logged${duration ? ` (${duration}ms)` : ''}`)
    }
  }

  logMapping(operation: string, rawData: unknown, mappedData: unknown): void {
    if (!this.shouldLogTraffic()) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'MAPPING',
      operation,
      data: {
        raw: '[see full log]',
        mapped: '[see full log]',
        comparison: this.compareObjects(rawData, mappedData),
      },
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled && this.shouldLog('info')) {
      console.info(`[DATAVERSE] ${operation} - Mapping logged`)
    }
  }

  logError(operation: string, error: unknown): void {
    if (!this.shouldLog('error')) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'ERROR',
      operation,
      data: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        raw: this.sanitize(error),
      },
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled) {
      console.error(`[DATAVERSE] ${operation} - Error:`, error instanceof Error ? error.message : error)
    }
  }

  logInfo(operation: string, message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'INFO',
      operation,
      data: { message, ...(data ? { details: this.sanitize(data) } : {}) },
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled) console.info(`[DATAVERSE] ${operation} - ${message}`)
  }

  logWarn(operation: string, message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'WARN',
      operation,
      data: { message, ...(data ? { details: this.sanitize(data) } : {}) },
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled) console.warn(`[DATAVERSE] ${operation} - ${message}`)
  }

  logDebug(operation: string, message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'DEBUG',
      operation,
      data: { message, ...(data ? { details: this.sanitize(data) } : {}) },
    }
    this.writeToFile(this.formatLogEntry(entry))
    if (this.consoleEnabled) console.debug(`[DATAVERSE] ${operation} - ${message}`)
  }

  // Helper: compare raw vs mapped objects for debugging
  private compareObjects(raw: unknown, mapped: unknown): Record<string, unknown> {
    if (!raw || !mapped || typeof raw !== 'object' || typeof mapped !== 'object') {
      return { different: raw !== mapped }
    }
    const comparison: Record<string, unknown> = {}
    const rawObj = raw as Record<string, unknown>
    const mappedObj = mapped as Record<string, unknown>
    const allKeys = new Set([...Object.keys(rawObj), ...Object.keys(mappedObj)])

    for (const key of allKeys) {
      if (!(key in rawObj)) {
        comparison[key] = { status: 'ADDED_IN_MAPPING' }
      } else if (!(key in mappedObj)) {
        comparison[key] = { status: 'MISSING_IN_MAPPING' }
      } else if (this.safeStringify(rawObj[key]) !== this.safeStringify(mappedObj[key])) {
        comparison[key] = { status: 'DIFFERENT' }
      }
      // Skip SAME status to reduce noise
    }
    return comparison
  }

  // Clear the log file
  clear(): void {
    try {
      writeFileSync(LOG_FILE_PATH, '')
      this.writeHeader('Cleared')
    } catch (error) {
      console.error('Failed to clear log file:', error)
    }
  }
}

// Export singleton instance
export const dataverseLogger = DataverseLogger.getInstance()

// Export convenience functions (preserve API compatibility with planner)
export const logDataverseRequest = (operation: string, url: string, options?: unknown) =>
  dataverseLogger.logRequest(operation, url, options)

export const logDataverseResponse = (operation: string, response: unknown, duration?: number) =>
  dataverseLogger.logResponse(operation, response, duration)

export const logDataverseMapping = (operation: string, rawData: unknown, mappedData: unknown) =>
  dataverseLogger.logMapping(operation, rawData, mappedData)

export const logDataverseError = (operation: string, error: unknown) =>
  dataverseLogger.logError(operation, error)

export const logDataverseInfo = (operation: string, message: string, data?: unknown) =>
  dataverseLogger.logInfo(operation, message, data)

export const logDataverseWarn = (operation: string, message: string, data?: unknown) =>
  dataverseLogger.logWarn(operation, message, data)

export const logDataverseDebug = (operation: string, message: string, data?: unknown) =>
  dataverseLogger.logDebug(operation, message, data)
