import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock MSAL before imports ────────────────────────────────────

const mockAcquireTokenSilent = vi.fn()
const mockGetAllAccounts = vi.fn()
const mockHandleRedirectPromise = vi.fn()
const mockInitialize = vi.fn()

vi.mock('@azure/msal-browser', () => {
  return {
    PublicClientApplication: vi.fn().mockImplementation(() => ({
      acquireTokenSilent: mockAcquireTokenSilent,
      getAllAccounts: mockGetAllAccounts,
      handleRedirectPromise: mockHandleRedirectPromise,
      initialize: mockInitialize,
    })),
    LogLevel: {
      Error: 0,
      Warning: 1,
      Info: 2,
      Verbose: 3,
    },
  }
})

// ── Tests ───────────────────────────────────────────────────────

describe('api client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('apiFetch', () => {
    it('should call fetch with correct URL and headers', async () => {
      // Mock env
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_AZURE_CLIENT_ID', '')

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ result: 'ok' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      // Use dynamic import to pick up env vars
      const { apiFetch } = await import('../lib/api')
      const data = await apiFetch<{ result: string }>('/api/health')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/health',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(data).toEqual({ result: 'ok' })
    })

    it('should serialize query params', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_AZURE_CLIENT_ID', '')

      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue([]),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const { apiFetch } = await import('../lib/api')
      await apiFetch('/api/invoices', {
        params: { page: 1, search: 'test', empty: undefined },
      })

      const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
      expect(calledUrl).toContain('page=1')
      expect(calledUrl).toContain('search=test')
      expect(calledUrl).not.toContain('empty')
    })

    it('should throw on non-ok response', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_AZURE_CLIENT_ID', '')

      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({ error: 'not found' }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const { apiFetch } = await import('../lib/api')
      await expect(apiFetch('/api/missing')).rejects.toThrow()
    })

    it('should return empty for 204 No Content', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_AZURE_CLIENT_ID', '')

      const mockResponse = {
        ok: true,
        status: 204,
        json: vi.fn(),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const { apiFetch } = await import('../lib/api')
      const data = await apiFetch('/api/delete-something', {
        method: 'DELETE',
      })
      expect(data).toEqual({})
      expect(mockResponse.json).not.toHaveBeenCalled()
    })
  })

  describe('api object groups', () => {
    it('should export all expected API groups', async () => {
      const { api } = await import('../lib/api')

      // Verify all top-level groups exist
      expect(api.health).toBeDefined()
      expect(api.healthDetailed).toBeDefined()
      expect(api.gus).toBeDefined()
      expect(api.dashboard).toBeDefined()
      expect(api.forecast).toBeDefined()
      expect(api.anomalies).toBeDefined()
      expect(api.ksef).toBeDefined()
      expect(api.sync).toBeDefined()
      expect(api.invoices).toBeDefined()
      expect(api.settings).toBeDefined()
      expect(api.dvSettings).toBeDefined()
      expect(api.dvSessions).toBeDefined()
      expect(api.dvSync).toBeDefined()
      expect(api.documents).toBeDefined()
      expect(api.ksefTestdata).toBeDefined()
      expect(api.exchangeRates).toBeDefined()
    })

    it('should have correct invoice methods', async () => {
      const { api } = await import('../lib/api')

      expect(typeof api.invoices.list).toBe('function')
      expect(typeof api.invoices.get).toBe('function')
      expect(typeof api.invoices.update).toBe('function')
      expect(typeof api.invoices.delete).toBe('function')
      expect(typeof api.invoices.markAsPaid).toBe('function')
      expect(typeof api.invoices.createManual).toBe('function')
      expect(typeof api.invoices.listAttachments).toBe('function')
      expect(typeof api.invoices.uploadAttachment).toBe('function')
      expect(typeof api.invoices.deleteAttachment).toBe('function')
      expect(typeof api.invoices.listNotes).toBe('function')
      expect(typeof api.invoices.createNote).toBe('function')
      expect(typeof api.invoices.updateNote).toBe('function')
      expect(typeof api.invoices.deleteNote).toBe('function')
      expect(typeof api.invoices.uploadDocument).toBe('function')
      expect(typeof api.invoices.downloadDocument).toBe('function')
      expect(typeof api.invoices.deleteDocument).toBe('function')
      expect(typeof api.invoices.getDocumentConfig).toBe('function')
      expect(typeof api.invoices.categorizeWithAI).toBe('function')
    })

    it('should have correct settings methods', async () => {
      const { api } = await import('../lib/api')

      expect(typeof api.settings.listCompanies).toBe('function')
      expect(typeof api.settings.getCompany).toBe('function')
      expect(typeof api.settings.createCompany).toBe('function')
      expect(typeof api.settings.updateCompany).toBe('function')
      expect(typeof api.settings.deleteCompany).toBe('function')
      expect(typeof api.settings.testToken).toBe('function')
      expect(typeof api.settings.listCostCenters).toBe('function')
      expect(typeof api.settings.createCostCenter).toBe('function')
      expect(typeof api.settings.updateCostCenter).toBe('function')
      expect(typeof api.settings.deleteCostCenter).toBe('function')
    })

    it('should have correct forecast methods', async () => {
      const { api } = await import('../lib/api')

      expect(typeof api.forecast.monthly).toBe('function')
      expect(typeof api.forecast.byMpk).toBe('function')
      expect(typeof api.forecast.byCategory).toBe('function')
      expect(typeof api.forecast.bySupplier).toBe('function')
    })
  })
})

describe('query-keys', () => {
  it('should generate stable keys', async () => {
    const { queryKeys } = await import('../lib/query-keys')

    expect(queryKeys.health).toEqual(['health'])
    expect(queryKeys.ksefStatus).toEqual(['ksef', 'status'])
    expect(queryKeys.invoice('abc')).toEqual(['invoices', 'abc'])
    expect(queryKeys.invoiceAttachments('abc')).toEqual([
      'invoices',
      'abc',
      'attachments',
    ])
  })

  it('should parameterize keys correctly', async () => {
    const { queryKeys } = await import('../lib/query-keys')

    const params = { top: 10, search: 'test' }
    const key = queryKeys.invoices(params)
    expect(key).toEqual(['invoices', params])

    // Same params should produce equal keys
    const key2 = queryKeys.invoices({ top: 10, search: 'test' })
    expect(key).toEqual(key2)
  })
})

describe('auth-config', () => {
  it('should export expected config values', async () => {
    vi.stubEnv('VITE_AZURE_CLIENT_ID', 'test-client-id')
    vi.stubEnv('VITE_AZURE_TENANT_ID', 'test-tenant-id')
    vi.stubEnv('VITE_API_SCOPE', 'api://test/access')

    const { loginRequest, apiScopes, isAuthConfigured } = await import(
      '../lib/auth-config'
    )

    expect(loginRequest.scopes).toContain('openid')
    expect(loginRequest.scopes).toContain('User.Read')
    expect(isAuthConfigured()).toBe(true)
  })

  it('should report not configured when client ID is empty', async () => {
    vi.stubEnv('VITE_AZURE_CLIENT_ID', '')

    const { isAuthConfigured } = await import('../lib/auth-config')
    expect(isAuthConfigured()).toBe(false)
  })
})
