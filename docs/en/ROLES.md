# Roles & Permissions

This document describes the role-based access control (RBAC) model used in the KSeF application.

## Role Hierarchy

| Role | Level | Description |
|------|-------|-------------|
| **Admin** | Highest | Full access — manage companies, sync, settings, delete, send to KSeF |
| **User (Reader)** | Mid | Read-all access — view all invoices, reports, forecasts, export |
| **Approver** | Scoped | Approve/reject access scoped to assigned cost centers and suppliers |
| **Unauthorized** | None | Authenticated but not in any group — access denied |

- **Admin** inherits all capabilities of User and Approver.
- **User** inherits Approver capabilities (can approve anything a Reader can see).
- **Approver** is a parallel role — scoped access only, no read-all or admin capabilities.

## Entra ID Security Groups

Each role maps to an Azure Entra ID security group. Group membership is read from the user's ID token `groups` claim.

| Role | Environment Variable (API) | Environment Variable (Web) | Environment Variable (Code-App) |
|------|---------------------------|---------------------------|--------------------------------|
| Admin | `ADMIN_GROUP_ID` / `NEXT_PUBLIC_ADMIN_GROUP` | `NEXT_PUBLIC_ADMIN_GROUP` | `VITE_ADMIN_GROUP` |
| User | `USER_GROUP_ID` / `NEXT_PUBLIC_USER_GROUP` | `NEXT_PUBLIC_USER_GROUP` | `VITE_USER_GROUP` |
| Approver | `APPROVER_GROUP_ID` / `NEXT_PUBLIC_APPROVER_GROUP` | `NEXT_PUBLIC_APPROVER_GROUP` | `VITE_APPROVER_GROUP` |

## API Endpoint Access Matrix

### Invoice Approvals (`/api/approvals/*`)

| Endpoint | Admin | User/Reader | Approver |
|----------|-------|-------------|----------|
| POST `/approve` | ✅ | ✅ | ✅ |
| POST `/reject` | ✅ | ✅ | ✅ |
| POST `/cancel` | ✅ | ❌ | ❌ |
| POST `/refresh-approvers` | ✅ | ✅ | ✅ |
| POST `/bulk-approve` | ✅ | ✅ | ✅ |
| GET `/pending` | ✅ | ✅ | ✅ |

### Self-Billing Invoices (`/api/self-billing/*`)

| Endpoint | Admin | User/Reader | Approver |
|----------|-------|-------------|----------|
| GET `/invoices` (list) | ✅ | ✅ | ✅ |
| GET `/invoices/{id}` | ✅ | ✅ | ✅ |
| POST `/invoices/preview` | ✅ | ✅ | ❌ |
| POST `/invoices/generate` | ✅ | ❌ | ❌ |
| PUT `/invoices/{id}` | ✅ | ❌ | ❌ |
| DELETE `/invoices/{id}` | ✅ | ❌ | ❌ |
| POST `/invoices/{id}/submit` | ✅ | ❌ | ❌ |
| POST `/invoices/{id}/approve` | ✅ | ✅ | ✅ |
| POST `/invoices/{id}/reject` | ✅ | ✅ | ✅ |
| POST `/invoices/{id}/send-ksef` | ✅ | ❌ | ❌ |
| GET `/approvals/pending` | ✅ | ✅ | ✅ |

### Admin-Only Endpoints

| Endpoint | Notes |
|----------|-------|
| GET `/api/approvers/overview` | Admin only — read-only view of group members |
| POST `/api/sync/*` | All sync operations |
| All settings/company CRUD | Company management |

## Frontend Navigation

| Nav Item | Admin | User | Approver |
|----------|-------|------|----------|
| Dashboard | ✅ | ✅ | ✅ |
| Invoices | ✅ | ✅ | ❌ |
| Approvals | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ❌ |
| Forecast | ✅ | ✅ | ❌ |
| Suppliers | ✅ | ✅ | ❌ |
| Self-Billing | ✅ | ✅ | ✅ |
| Sync | ✅ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ |

## Approver Scope

Approvers have **scoped** access determined by:

1. **MPK Center assignments** — cost centers where the user is listed as an approver (configured in Settings → Cost Centers).
2. **Supplier assignments** — suppliers where the user is set as `sbContactUser` (self-billing contact).

The scope is resolved via `resolveApproverScope()` in `api/src/lib/auth/approver-scope.ts`.

## Graph API Integration

The Approver group membership is also checked server-side using the Microsoft Graph API (client credentials flow) for the Settings → Approvers tab overview. This requires:

- `GroupMember.Read.All` application permission (with admin consent)
- `AZURE_CLIENT_SECRET` configured for the API
