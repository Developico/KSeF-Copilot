import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<ManualInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Providers>
    </BrowserRouter>
  )
}
