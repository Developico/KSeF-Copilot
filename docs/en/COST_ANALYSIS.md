# Cost Analysis

> **Polish version:** [ANALIZA_KOSZTOW.md](../pl/ANALIZA_KOSZTOW.md) | **English version:** [COST_ANALYSIS.md](./COST_ANALYSIS.md)

## Table of Contents
- [Objective](#objective)
- [Architecture (Cost-Relevant)](#architecture-cost-relevant)
- [Cost Components](#cost-components)
  - [Azure Functions (Flex Consumption)](#azure-functions-flex-consumption)
  - [Azure Key Vault](#azure-key-vault)
  - [Azure OpenAI](#azure-openai)
  - [Azure App Service (Web Frontend)](#azure-app-service-web-frontend)
  - [Microsoft Dataverse](#microsoft-dataverse)
  - [Power Platform (Custom Connector)](#power-platform-custom-connector)
- [Total Cost Summary](#total-cost-summary)
- [Cost Optimization Strategies](#cost-optimization-strategies)
- [Comparison with Alternatives](#comparison-with-alternatives)
- [Conclusions](#conclusions)

---

## Objective

This document presents a **detailed cost analysis** for running the dvlp-ksef solution on Azure + Power Platform. All prices are based on public Azure pricing as of January 2026 and the **West Europe** region.

### Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| Number of companies (NIPs) | 1–3 | SMB segment |
| Invoices per month | ~200–500 | Incoming cost invoices |
| API calls per month | ~2,000–5,000 | Including sync, CRUD, AI |
| Users | 3–10 | Finance team |
| Environment | Production | Single environment |
| Region | West Europe | Azure & Dataverse |

---

## Architecture (Cost-Relevant)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Power Apps     │────▶│  Azure Functions  │────▶│    Dataverse     │
│   (frontend)     │     │  (Flex Consumpt.) │     │  (data store)    │
└─────────────────┘     └───────┬───────────┘     └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌──────────┐ ┌────────┐ ┌──────────┐
              │ Key Vault│ │OpenAI  │ │ KSeF API │
              │ (secrets)│ │(GPT-4o)│ │(external)│
              └──────────┘ └────────┘ └──────────┘
```

---

## Cost Components

### Azure Functions (Flex Consumption)

**Plan:** Flex Consumption (serverless)

#### Pricing Model

| Component | Price | Notes |
|-----------|-------|-------|
| Execution time | $0.000016 / GB-s | Per GB of memory per second |
| Executions | $0.20 / million | Per invocation |
| Free monthly grant | 250,000 exec + 400,000 GB-s | Included every month |

#### Estimated Consumption

| Operation | Monthly calls | Avg duration | Memory |
|-----------|---------------|-------------|--------|
| Invoice CRUD | ~1,000 | 200 ms | 256 MB |
| KSeF sync | ~100 | 2,000 ms | 256 MB |
| AI categorization | ~300 | 3,000 ms | 256 MB |
| Health/status | ~500 | 50 ms | 128 MB |
| Other | ~100 | 500 ms | 256 MB |
| **Total** | **~2,000** | | |

#### Monthly Cost Calculation

```
Executions: 2,000 (within 250,000 free grant) = $0.00
Memory-time: ~500 GB-s (within 400,000 free grant) = $0.00

Estimated monthly cost: $0.00 (within free tier)
```

> **Conclusion:** For an SMB scenario (~2,000 calls/month), Azure Functions in Flex Consumption plan are practically **free**.

---

### Azure Key Vault

**Tier:** Standard

| Operation | Price | Monthly quantity | Cost |
|-----------|-------|------------------|------|
| Secret operations | $0.03 / 10,000 | ~5,000 | $0.015 |
| Certificate operations | $3.00 / renewal | 0 | $0.00 |

```
Estimated monthly cost: ~$0.02
```

---

### Azure OpenAI

**Model:** GPT-4o-mini  
**Deployment:** Pay-as-you-go

| Component | Price | Notes |
|-----------|-------|-------|
| Input tokens | $0.150 / 1M tokens | Prompt + context |
| Output tokens | $0.600 / 1M tokens | Model response |

#### Estimated Consumption (per invoice categorization)

| Element | Tokens | Notes |
|---------|--------|-------|
| System prompt | ~500 | Categorization rules |
| Invoice data | ~200 | Seller, amounts, items |
| Learning context | ~300 | History of similar invoices |
| **Total input** | **~1,000** | Per request |
| Output (JSON) | ~100 | MPK, category, confidence |

#### Monthly Cost

```
Invoices to categorize: ~300/month
Input tokens: 300 × 1,000 = 300,000 tokens
Output tokens: 300 × 100 = 30,000 tokens

Input cost: 0.3M × $0.150 = $0.045
Output cost: 0.03M × $0.600 = $0.018

Estimated monthly cost: ~$0.07
```

> **Conclusion:** AI categorization of 300 invoices costs approximately **$0.07/month**. Even with 10x volume it would be under $1.

---

### Azure App Service (Web Frontend)

**Plan:** B1 (Basic)

| Component | Price | Notes |
|-----------|-------|-------|
| App Service Plan B1 | $13.14/month | 1 core, 1.75 GB RAM |
| Custom domain | $0.00 | Included |
| SSL certificate | $0.00 | Managed (free) |

```
Estimated monthly cost: ~$13.14
```

> **Note:** The web frontend can be replaced by Power Apps (Canvas / Model-Driven), which eliminates App Service costs entirely. The web interface is an optional reference implementation.

**Alternative — Free Tier (F1):**
- $0.00/month, 60 min CPU/day
- Sufficient for development/demo but not for production

---

### Microsoft Dataverse

**Cost depends on licensing approach:**

#### Option A: Included in existing Power Platform license

If the organization already has Microsoft 365 E3/E5 or Power Apps licenses:

| Component | Additional cost | Notes |
|-----------|----------------|-------|
| Dataverse storage (base) | $0.00 | 1 GB DB included per environment |
| Additional storage | $40/GB/month | If base storage exceeded |
| API calls | $0.00 | Within license limits |

For ~500 invoices/month with full schema, estimated storage usage is ~50 MB/year → **within base limit**.

#### Option B: Power Apps Per App license

| Component | Price | Notes |
|-----------|-------|-------|
| Per App license | $5/user/month | Access to 1 custom app + Dataverse |
| 5 users × $5 | $25/month | |

#### Option C: Power Apps Premium license

| Component | Price | Notes |
|-----------|-------|-------|
| Premium license | $20/user/month | Unlimited apps + Dataverse + premium connectors |
| 5 users × $20 | $100/month | |

> **Note:** Most organizations using Microsoft 365 already have base Power Apps capabilities. Actual additional cost depends on existing licensing.

---

### Power Platform (Custom Connector)

| Component | Price | Notes |
|-----------|-------|-------|
| Custom Connector | $0.00 | Included with Power Apps license |
| Premium connector usage | $0.00 | Custom Connectors are premium but included in Per App/Premium |

---

## Total Cost Summary

### Scenario: Minimal (existing M365 licenses)

| Component | Monthly cost | Annual cost |
|-----------|-------------|-------------|
| Azure Functions | $0.00 | $0.00 |
| Key Vault | $0.02 | $0.24 |
| Azure OpenAI | $0.07 | $0.84 |
| App Service (B1) | $13.14 | $157.68 |
| Dataverse | $0.00 | $0.00 |
| **Total** | **~$13.23** | **~$158.76** |

### Scenario: With Power Apps Per App (5 users)

| Component | Monthly cost | Annual cost |
|-----------|-------------|-------------|
| Azure Functions | $0.00 | $0.00 |
| Key Vault | $0.02 | $0.24 |
| Azure OpenAI | $0.07 | $0.84 |
| App Service (B1) | $13.14 | $157.68 |
| Power Apps | $25.00 | $300.00 |
| **Total** | **~$38.23** | **~$458.76** |

### Scenario: Without web frontend (Power Apps only)

| Component | Monthly cost | Annual cost |
|-----------|-------------|-------------|
| Azure Functions | $0.00 | $0.00 |
| Key Vault | $0.02 | $0.24 |
| Azure OpenAI | $0.07 | $0.84 |
| Power Apps | $25.00 | $300.00 |
| **Total** | **~$25.09** | **~$301.08** |

---

## Cost Optimization Strategies

### 1. Minimize App Service cost
- Use **F1 (Free)** tier for development
- Consider replacing the web UI with **Power Apps** entirely
- Use **Azure Static Web Apps** (free tier) if only a SPA is needed

### 2. Optimize Azure OpenAI
- **Cache** categorization results for recurring suppliers
- Use **learning context** (feedback) to reduce re-categorization needs
- Consider batch processing during off-peak hours

### 3. Optimize Dataverse
- Monitor **storage usage** quarterly
- Archive invoices older than 2 years to **Azure Blob Storage**
- Use **views** instead of full table fetches

### 4. Monitor and alert
- Set up **Azure Cost Management** alerts
- Review Azure Advisor recommendations monthly
- Track token usage in **Azure OpenAI Studio**

---

## Comparison with Alternatives

### vs. Dedicated server (VM)

| Aspect | dvlp-ksef (serverless) | Traditional (VM) |
|--------|----------------------|------------------|
| Monthly cost | ~$13–38 | ~$50–150 |
| Scaling | Automatic | Manual |
| Maintenance | Zero (PaaS) | OS updates, patching |
| High availability | Built-in | Manual configuration |
| Initial setup | ~2 hours | ~1–2 days |

### vs. Commercial e-invoice solutions

| Aspect | dvlp-ksef | Commercial SaaS |
|--------|-----------|-----------------|
| Monthly cost | ~$13–38 | ~$50–200 /user |
| AI categorization | Included | Usually extra |
| Power Platform integration | Native | Limited / None |
| Customization | Full source code | Limited |
| Data control | Full (Dataverse) | Vendor-dependent |

---

## Conclusions

1. **Very low operational cost** — the serverless architecture means you pay only for actual usage
2. **AI categorization is practically free** — GPT-4o-mini at low volumes costs pennies
3. **Main cost is App Service** — can be eliminated by using Power Apps as the sole UI
4. **Power Platform licensing** is the main variable — depends on existing organizational licenses
5. **Total cost for SMB: $13–$38/month** — significantly cheaper than commercial alternatives

---

**Last updated:** 2026-02-11  
**Version:** 1.0  
**Maintainer:** dvlp-dev team
