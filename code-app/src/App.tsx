import { Component, type ReactNode, type ErrorInfo } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Providers } from './components/providers'
import { AppLayout } from './components/layout/app-layout'

// Pages
import { DashboardPage } from './pages/dashboard'
import { InvoicesPage } from './pages/invoices'
import { InvoiceDetailPage } from './pages/invoice-detail'
import { ReportsPage } from './pages/reports'
import { ForecastPage } from './pages/forecast'
import { SyncPage } from './pages/sync'
import { SettingsPage } from './pages/settings'
import { ManualInvoicePage } from './pages/manual-invoice'
import { ApprovalsPage } from './pages/approvals'
import { SuppliersPage } from './pages/suppliers'
import { SupplierDetailPage } from './pages/supplier-detail'
import { SelfBillingPage } from './pages/self-billing'
import { SelfBillingDetailPage } from './pages/self-billing-detail'
import { CostsPage } from './pages/costs'
import { CostDetailPage } from './pages/cost-detail'

// ── Error Boundary ───────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          fontFamily: 'system-ui, sans-serif',
          color: '#333',
        }}>
          <h1 style={{ color: '#dc2626' }}>Application Error</h1>
          <p>{this.state.error?.message}</p>
          <pre style={{
            background: '#f3f4f6',
            padding: '1rem',
            borderRadius: '0.5rem',
            overflow: 'auto',
            fontSize: '0.85rem',
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// ── App ──────────────────────────────────────────────────────────

export function App() {
  return (
    <AppErrorBoundary>
      <HashRouter>
        <Providers>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/invoices/new" element={<ManualInvoicePage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/costs" element={<CostsPage />} />
              <Route path="/costs/:id" element={<CostDetailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/forecast" element={<ForecastPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="/suppliers/:id" element={<SupplierDetailPage />} />
              <Route path="/self-billing" element={<SelfBillingPage />} />
              <Route path="/self-billing/:id" element={<SelfBillingDetailPage />} />
              <Route path="/sync" element={<SyncPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Providers>
      </HashRouter>
    </AppErrorBoundary>
  )
}
