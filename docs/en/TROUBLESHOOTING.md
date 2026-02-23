# Troubleshooting

> **Polish version:** [ROZWIAZYWANIE_PROBLEMOW.md](../pl/ROZWIAZYWANIE_PROBLEMOW.md) | **English version:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## Table of Contents
- [Diagnostics — Where to Start](#diagnostics--where-to-start)
- [API Issues](#api-issues)
  - [API Won't Start](#api-wont-start)
  - [Authentication Errors (401/403)](#authentication-errors-401403)
  - [Dataverse Errors](#dataverse-errors)
  - [KSeF Errors](#ksef-errors)
  - [Azure OpenAI Errors](#azure-openai-errors)
  - [Key Vault Errors](#key-vault-errors)
- [Web Frontend Issues](#web-frontend-issues)
  - [Login Issues](#login-issues)
  - [API Connection Errors](#api-connection-errors)
  - [Build Errors](#build-errors)
- [Power Platform Issues](#power-platform-issues)
  - [Custom Connector Issues](#custom-connector-issues)
  - [Model-Driven App Issues](#model-driven-app-issues)
  - [Code App Issues](#code-app-issues)
- [Deployment Issues](#deployment-issues)
  - [Azure Functions Deployment](#azure-functions-deployment)
  - [Azure App Service Deployment](#azure-app-service-deployment)
- [Performance Issues](#performance-issues)
- [Diagnostic Tools](#diagnostic-tools)

---

## Diagnostics — Where to Start

### Step 1: Check API health

```bash
curl http://localhost:7071/api/health
# Or in production:
curl https://func-ksef.azurewebsites.net/api/health
```

**Healthy response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T10:30:00Z",
  "services": {
    "dataverse": "connected",
    "keyVault": "connected",
    "ksef": "test"
  }
}
```

### Step 2: Check logs

```bash
# Local — terminal output from func start
# Azure — Application Insights or Log Stream:
az functionapp log tail --name func-ksef --resource-group rg-ksef
```

### Step 3: Verify configuration

```bash
# List all app settings (masked values):
az functionapp config appsettings list --name func-ksef --resource-group rg-ksef
```

---

## API Issues

### API Won't Start

#### Error: "Missing required environment variable: DV_URL"

**Cause:** Missing Dataverse configuration.

**Solution:**
1. Verify `local.settings.json` exists in the `api/` folder
2. Check that all required variables are set:
   - `DV_URL`, `DV_CLIENT_ID`, `DV_CLIENT_SECRET`, `DV_TENANT_ID`
3. See [Environment Variables](./ENVIRONMENT_VARIABLES.md) for the full list

#### Error: "func: command not found"

**Solution:**
```bash
npm install -g azure-functions-core-tools@4
# Verify:
func --version
```

#### Error: "Port 7071 already in use"

**Solution:**
```bash
# Windows
npx kill-port 7071

# macOS/Linux
lsof -ti:7071 | xargs kill -9
```

#### Error: "SKIP_AUTH is not allowed in production"

**Cause:** `SKIP_AUTH=true` with `NODE_ENV=production`. This is a **deliberate safety check**.

**Solution:** Set `SKIP_AUTH=false` or remove it entirely. In production, configure proper JWT authentication via Entra ID.

---

### Authentication Errors (401/403)

#### 401 Unauthorized — "No authorization header"

**Cause:** Request is missing the `Authorization: Bearer <token>` header.

**Solution:**
1. For local development — set `SKIP_AUTH=true`
2. For production — include a valid JWT token from Azure Entra ID

#### 401 Unauthorized — "Invalid token"

**Cause:** The JWT token is invalid, expired, or signed by the wrong issuer.

**Solution:**
1. Verify `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` match the token
2. Check token expiration (default 1 hour)
3. Verify the `aud` claim matches `ENTRA_AUDIENCE`
4. Use [jwt.ms](https://jwt.ms) to inspect token claims

#### 403 Forbidden — "Insufficient permissions"

**Cause:** The user doesn't have the required role.

**Solution:**
1. Check `GROUP_ROLE_MAPPING` configuration
2. Verify the user belongs to the correct Entra ID security group
3. Admin role is required for write operations (POST, PUT, DELETE)

---

### Dataverse Errors

#### "401 Unauthorized" from Dataverse

**Cause:** Invalid application credentials or missing permissions.

**Solution:**
1. Verify `DV_CLIENT_ID`, `DV_CLIENT_SECRET`, `DV_TENANT_ID`
2. Check the App Registration has `Dynamics CRM / user_impersonation` permission
3. Verify the Application User exists in Power Platform Admin Center
4. Confirm the Application User has the `KSeF Admin` security role

#### "404 Not Found" on Dataverse table

**Cause:** Table doesn't exist or the logical name is wrong.

**Solution:**
1. Verify the Power Platform solution is imported
2. Check table names in `DV_TABLE_*` environment variables
3. Run the solution checker in Power Apps

#### "412 Precondition Failed"

**Cause:** Optimistic concurrency conflict — the record was modified by another user.

**Solution:** Retry the operation. The API implements automatic retries for this scenario.

#### "429 Too Many Requests"

**Cause:** Dataverse API rate limit exceeded.

**Solution:**
1. Check Dataverse API limits (currently 6,000 requests per 5 minutes per user)
2. Implement backoff/retry logic (already built into the service layer)
3. Consider batch operations for bulk actions

---

### KSeF Errors

#### "Unable to connect to KSeF API"

**Cause:** KSeF service is down or URL is incorrect.

**Solution:**
1. Check [KSeF status page](https://www.podatki.gov.pl/ksef/)
2. Verify `KSEF_ENV` setting (test/demo/prod)
3. The test environment has frequent maintenance windows

#### "Invalid KSeF token"

**Cause:** Authorization token is missing, expired, or invalid.

**Solution:**
1. Check that the token is stored in Key Vault as `KSEF-TOKEN-{NIP}`
2. Regenerate the token through the KSeF portal
3. See [Token Setup Guide](../../deployment/azure/TOKEN_SETUP_GUIDE.md)

#### "Session expired"

**Cause:** KSeF session has timed out (usually after 30 minutes of inactivity).

**Solution:** The system automatically creates new sessions. If it persists:
1. Check the session table in Dataverse (`dvlp_ksefsession`)
2. Terminate stale sessions via the API: `POST /api/ksef/session/terminate`

---

### Azure OpenAI Errors

#### "401 Unauthorized" from OpenAI

**Cause:** Invalid API key or endpoint.

**Solution:**
1. Verify `OPENAI_API_KEY` and `OPENAI_ENDPOINT`
2. Check that the key has not expired in Azure Portal
3. Ensure the deployment name matches `OPENAI_MODEL`

#### "429 Rate limit exceeded"

**Cause:** Azure OpenAI tokens-per-minute limit hit.

**Solution:**
1. Check the TPM (tokens per minute) quota in Azure OpenAI Studio
2. Increase the quota if needed
3. The API queues requests automatically

#### "Model not found"

**Cause:** The model deployment doesn't exist.

**Solution:**
1. Verify `OPENAI_MODEL` matches the deployment name (not the model name)
2. In Azure OpenAI Studio → Deployments, check the deployment is active
3. Common mistake: setting `gpt-4o-mini` when deployment is named `gpt-4o-mini-deploy`

#### "Content filter triggered"

**Cause:** The request was flagged by Azure's content safety filter.

**Solution:** This is unusual for invoice categorization. If it occurs:
1. Check the `errormessage` field in the sync log
2. Review the prompt for unexpected content
3. Consider adjusting the content filter policy in Azure OpenAI Studio

---

### Key Vault Errors

#### "SecretNotFound"

**Cause:** Secret doesn't exist in Key Vault.

**Solution:**
1. Verify secret names: `DV-CLIENT-SECRET`, `AZURE-OPENAI-API-KEY`, `AZURE-OPENAI-ENDPOINT`
2. Check Key Vault URL: `KV_URL`
3. For local development: set `KV_ENABLED=false`

#### "Forbidden — Access denied"

**Cause:** The Azure Functions managed identity doesn't have access.

**Solution:**
1. In Azure Portal → Key Vault → Access Policies (or RBAC)
2. Add the Functions managed identity with `Get Secret` permission
3. Alternatively, use Azure RBAC: `Key Vault Secrets User` role

---

## Web Frontend Issues

### Login Issues

#### "AADSTS50011: Reply URL does not match"

**Cause:** `NEXTAUTH_URL` doesn't match the registered redirect URI.

**Solution:**
1. In Azure Entra ID → App Registration → Authentication
2. Add redirect URI: `{NEXTAUTH_URL}/api/auth/callback/azure-ad`
3. For local: `http://localhost:3000/api/auth/callback/azure-ad`

#### "Error: CLIENT_FETCH_ERROR"

**Cause:** NextAuth.js can't reach the Entra ID endpoint.

**Solution:**
1. Verify `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
2. Check that the secret hasn't expired
3. Ensure network connectivity to `login.microsoftonline.com`

### API Connection Errors

#### "Network Error" or "Failed to fetch"

**Cause:** Frontend can't reach the API.

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check that the API is running and healthy
3. For local development: API on `http://localhost:7071/api`, Web on port 3000

#### CORS Errors

**Cause:** Cross-origin request blocked.

**Solution:**
1. Azure Functions automatically allows localhost in dev mode
2. For production: add the web app URL to Function App CORS settings
3. In Azure Portal → Function App → API → CORS → Add allowed origin

### Build Errors

#### "Type error in build"

**Solution:**
```bash
cd web
pnpm typecheck  # Show all TypeScript errors
pnpm build      # Full production build
```

---

## Power Platform Issues

### Custom Connector Issues

#### "401 Unauthorized" from Custom Connector

**Cause:** OAuth configuration mismatch.

**Solution:**
1. Verify the Custom Connector OAuth settings match the API App Registration
2. Resource URL should be `api://{api-client-id}`
3. Scope should include `access_as_user`
4. See [Custom Connector](./POWER_PLATFORM_CUSTOM_CONNECTOR.md)

#### "Connection test failed"

**Solution:**
1. Create a new connection (delete the old one)
2. Verify the API is running and accessible from the internet
3. Check Custom Connector swagger definition matches the current API

### Model-Driven App Issues

#### "Field not visible in form"

**Cause:** Field was added to the table but not to the form.

**Solution:**
1. Open the form designer in Power Apps
2. Add the field to the appropriate section
3. Save and Publish

#### "View shows wrong data"

**Cause:** View filter or columns are outdated.

**Solution:**
1. Edit the view in Power Apps
2. Verify filter conditions and displayed columns
3. Publish the changes

### Code App Issues

#### "pac code push failed"

**Cause:** Build error or authorization issue.

**Solution:**
1. Ensure the Code App builds locally: `pnpm build`
2. Verify `pac auth` is connected to the correct environment
3. Check available space in the environment

---

## Deployment Issues

### Azure Functions Deployment

#### "Deployment failed — build error"

**Solution:**
1. Run `npm run build` locally to reproduce the error
2. Check that `tsconfig.json` compiles cleanly
3. Verify all dependencies are in `package.json` (not just devDependencies for runtime deps)

#### "Function not showing in Azure Portal"

**Cause:** Missing or corrupted `function.json` / entry point.

**Solution:**
1. Verify the `host.json` and `function.json` files are correct
2. Run the deployment again: `func azure functionapp publish func-ksef`
3. Check the Kudu console for file structure

### Azure App Service Deployment

#### "Application Error" after deploy

**Solution:**
1. Check Application Insights for detailed errors
2. Verify all environment variables are set
3. Run the standalone build locally: `pnpm build && node .next/standalone/server.js`
4. Check the startup command: `node standalone/server.js`

---

## Performance Issues

### Slow API responses

| Symptom | Possible cause | Solution |
|---------|---------------|----------|
| Cold start >10s | Function cold start | Use Flex Consumption warm-up; or pre-warm with scheduled ping |
| Dataverse slow | Complex query | Add indexes; use `$select` to limit columns; use server-side paging |
| AI categorization slow | OpenAI latency | Normal (~2–3s per request); consider batch processing |
| All endpoints slow | Network latency | Check if Functions and Dataverse are in the same region |

### Memory issues

```bash
# Check Azure Functions memory usage
az monitor metrics list \
  --resource /subscriptions/.../Microsoft.Web/sites/func-ksef \
  --metric MemoryWorkingSet \
  --interval PT1H
```

---

## Diagnostic Tools

| Tool | Purpose | How to use |
|------|---------|-----------|
| `/api/health` | Check service connectivity | `curl https://.../api/health` |
| Application Insights | Logs, traces, errors | Azure Portal → Application Insights |
| Log Stream | Real-time logs | `az functionapp log tail --name func-ksef` |
| Kudu Console | File system, process explorer | `https://func-ksef.scm.azurewebsites.net` |
| jwt.ms | JWT token inspection | Paste token at [jwt.ms](https://jwt.ms) |
| Power Platform Admin Center | Dataverse monitoring | [admin.powerplatform.microsoft.com](https://admin.powerplatform.microsoft.com) |
| Azure OpenAI Studio | Token usage, model metrics | Azure Portal → OpenAI resource |
| KSeF Portal (test) | Session & invoice management | [ksef-test.mf.gov.pl](https://ksef-test.mf.gov.pl) |

---

## Related Documents

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) — all configuration variables
- [Local Development](./LOCAL_DEVELOPMENT.md) — setup guide
- [Architecture](./ARCHITECTURE.md) — system design
- [API Reference](./API.md) — endpoint documentation

---

**Last updated:** 2026-02-11  
**Version:** 1.0  
**Maintainer:** dvlp-dev team
