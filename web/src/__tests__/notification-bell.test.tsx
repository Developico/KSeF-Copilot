import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

const mockMarkRead = vi.fn()
const mockDismiss = vi.fn()

vi.mock('@/hooks/use-api', () => ({
  useContextNotifications: vi.fn(() => ({
    data: {
      data: [
        {
          id: 'n1',
          name: 'notification-1',
          recipientId: 'user-1',
          settingId: 's1',
          type: 'ApprovalRequested',
          message: 'Invoice FV/2024/001 needs approval',
          isRead: false,
          isDismissed: false,
          createdOn: new Date(Date.now() - 300000).toISOString(), // 5 min ago
        },
        {
          id: 'n2',
          name: 'notification-2',
          recipientId: 'user-1',
          settingId: 's1',
          type: 'BudgetExceeded',
          message: 'Budget exceeded for IT Department',
          isRead: true,
          isDismissed: false,
          createdOn: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        },
      ],
      count: 2,
    },
    isLoading: false,
  })),
  useContextNotificationUnreadCount: vi.fn(() => ({
    data: { count: 1 },
    isLoading: false,
  })),
  useMarkNotificationRead: () => ({
    mutate: mockMarkRead,
    isPending: false,
  }),
  useDismissNotification: () => ({
    mutate: mockDismiss,
    isPending: false,
  }),
}))

import { NotificationBell } from '@/components/layout/notification-bell'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders bell button with unread badge', () => {
    renderWithProviders(<NotificationBell />)

    const badge = screen.getByText('1')
    expect(badge).toBeInTheDocument()
  })

  it('shows notification list on click', async () => {
    renderWithProviders(<NotificationBell />)

    const button = screen.getByRole('button')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Invoice FV/2024/001 needs approval')).toBeInTheDocument()
      expect(screen.getByText('Budget exceeded for IT Department')).toBeInTheDocument()
    })
  })

  it('shows unread count in header', async () => {
    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      // Translation key for unread count
      expect(screen.getByText('unread')).toBeInTheDocument()
    })
  })

  it('calls markRead when clicking check button on unread notification', async () => {
    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Invoice FV/2024/001 needs approval')).toBeInTheDocument()
    })

    // Find mark-read button (the Check icon button for the unread notification)
    const markReadButtons = screen.getAllByTitle('markRead')
    fireEvent.click(markReadButtons[0])

    expect(mockMarkRead).toHaveBeenCalledWith('n1')
  })

  it('calls dismiss when clicking X button', async () => {
    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Invoice FV/2024/001 needs approval')).toBeInTheDocument()
    })

    const dismissButtons = screen.getAllByTitle('dismiss')
    fireEvent.click(dismissButtons[0])

    expect(mockDismiss).toHaveBeenCalledWith('n1')
  })

  it('shows empty state when no notifications', async () => {
    const { useContextNotifications, useContextNotificationUnreadCount } = await import('@/hooks/use-api')
    vi.mocked(useContextNotifications).mockReturnValue({
      data: { data: [], count: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useContextNotifications>)
    vi.mocked(useContextNotificationUnreadCount).mockReturnValue({
      data: { count: 0 },
      isLoading: false,
    } as unknown as ReturnType<typeof useContextNotificationUnreadCount>)

    renderWithProviders(<NotificationBell />)

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('empty')).toBeInTheDocument()
    })
  })
})
