/**
 * Notification API Endpoints
 *
 * Endpoints:
 * - GET    /api/notifications            — List notifications for current user
 * - PATCH  /api/notifications/:id/read   — Mark notification as read
 * - POST   /api/notifications/:id/dismiss — Dismiss notification
 * - GET    /api/notifications/unread-count — Get unread count
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { verifyAuth, requireRole } from '../lib/auth/middleware'
import { notificationService } from '../lib/dataverse/services'
import { mpkCenterService } from '../lib/dataverse/services'

/**
 * GET /api/notifications
 */
async function listNotificationsHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const settingId = request.query.get('settingId')
    if (!settingId) {
      return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
    }

    const unreadOnly = request.query.get('unreadOnly') === 'true'
    const top = request.query.get('top') ? parseInt(request.query.get('top')!, 10) : undefined

    // Resolve user OID to Dataverse system user ID
    const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
    if (!dvUser) {
      return { status: 200, jsonBody: { data: [], count: 0 } }
    }

    const result = await notificationService.list(dvUser.systemUserId, settingId, { unreadOnly, top })

    return { status: 200, jsonBody: { data: result.items, count: result.count } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to list notifications:', msg)
    return { status: 500, jsonBody: { error: `Failed to list notifications: ${msg}` } }
  }
}

/**
 * PATCH /api/notifications/:id/read
 */
async function markReadHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Notification ID required' } }
    }

    await notificationService.markRead(id)

    return { status: 200, jsonBody: { success: true } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to mark notification as read:', msg)
    return { status: 500, jsonBody: { error: `Failed to mark notification as read: ${msg}` } }
  }
}

/**
 * POST /api/notifications/:id/dismiss
 */
async function dismissHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const id = request.params.id
    if (!id) {
      return { status: 400, jsonBody: { error: 'Notification ID required' } }
    }

    await notificationService.dismiss(id)

    return { status: 200, jsonBody: { success: true } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to dismiss notification:', msg)
    return { status: 500, jsonBody: { error: `Failed to dismiss notification: ${msg}` } }
  }
}

/**
 * GET /api/notifications/unread-count
 */
async function unreadCountHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const auth = await verifyAuth(request)
    if (!auth.success || !auth.user) {
      return { status: 401, jsonBody: { error: auth.error || 'Unauthorized' } }
    }

    const roleCheck = requireRole(auth.user, 'Reader')
    if (!roleCheck.success) {
      return { status: 403, jsonBody: { error: 'Forbidden — requires Reader role' } }
    }

    const settingId = request.query.get('settingId')
    if (!settingId) {
      return { status: 400, jsonBody: { error: 'settingId query parameter is required' } }
    }

    const dvUser = await mpkCenterService.resolveSystemUserByOid(auth.user.id)
    if (!dvUser) {
      return { status: 200, jsonBody: { count: 0 } }
    }

    const count = await notificationService.getUnreadCount(dvUser.systemUserId, settingId)

    return { status: 200, jsonBody: { count } }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    context.error('Failed to get unread count:', msg)
    return { status: 500, jsonBody: { error: `Failed to get unread count: ${msg}` } }
  }
}

// ── Route registrations ──────────────────────────────────────

app.http('notifications-list', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications',
  handler: listNotificationsHandler,
})

app.http('notifications-read', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'notifications/{id}/read',
  handler: markReadHandler,
})

app.http('notifications-dismiss', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'notifications/{id}/dismiss',
  handler: dismissHandler,
})

app.http('notifications-unread-count', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'notifications/unread-count',
  handler: unreadCountHandler,
})
