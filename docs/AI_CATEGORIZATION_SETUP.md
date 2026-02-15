# AI Categorization - Setup Guide

> Funkcja kategoryzacji faktur z użyciem Azure OpenAI

## Spis treści

1. [Przegląd](#przegląd)
2. [Wymagania](#wymagania)
3. [Krok 1: Utworzenie zasobu Azure OpenAI](#krok-1-utworzenie-zasobu-azure-openai)
4. [Krok 2: Wdrożenie modelu](#krok-2-wdrożenie-modelu)
5. [Krok 3: Konfiguracja Key Vault](#krok-3-konfiguracja-key-vault)
6. [Krok 4: Konfiguracja zmiennych środowiskowych](#krok-4-konfiguracja-zmiennych-środowiskowych)
7. [Krok 5: Włączenie feature flag](#krok-5-włączenie-feature-flag)
8. [Krok 6: Testowanie](#krok-6-testowanie)
9. [Schemat danych](#schemat-danych)
10. [Prompty AI](#prompty-ai)

---

## Przegląd

Funkcja AI Categorization wykorzystuje Azure OpenAI do:
- **Automatycznej kategoryzacji** faktur na podstawie dostawcy i pozycji
- **Sugestii MPK** (centrum kosztów) na podstawie historii i kontekstu
- **Opisywania faktur** - generowanie krótkich opisów dla łatwiejszej identyfikacji
- **Uczenia się** z poprawek użytkownika (cache dostawca → kategoria)

### Architektura

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Web App   │────▶│ Azure Func.  │────▶│  Azure OpenAI   │
│  (Next.js)  │     │  (Node.js)   │     │   (gpt-4o-mini) │
└─────────────┘     └──────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Key Vault  │
                    │  (secrets)  │
                    └─────────────┘
```

---

## Wymagania

- ✅ Subskrypcja Azure z dostępem do Azure OpenAI
- ✅ Azure Key Vault (już skonfigurowany: `your-keyvault-name`)
- ✅ Azure Functions (do wdrożenia)
- ✅ Uprawnienia: Contributor na Resource Group

---

## Krok 1: Utworzenie zasobu Azure OpenAI

### Azure Portal

1. Przejdź do **Azure Portal** → **Create a resource**
2. Wyszukaj **Azure OpenAI** i kliknij **Create**
3. Wypełnij formularz:

| Pole | Wartość |
|------|---------|
| Subscription | (Twoja subskrypcja) |
| Resource group | `dvlp-ksef-rg` |
| Region | `Sweden Central` lub `East US` (dostępność modeli) |
| Name | `your-openai-resource` |
| Pricing tier | `Standard S0` |

4. Kliknij **Review + create** → **Create**

### Azure CLI

```bash
# Utwórz zasób Azure OpenAI
az cognitiveservices account create \
  --name your-openai-resource \
  --resource-group dvlp-ksef-rg \
  --location swedencentral \
  --kind OpenAI \
  --sku S0 \
  --yes

# Pobierz endpoint
az cognitiveservices account show \
  --name your-openai-resource \
  --resource-group dvlp-ksef-rg \
  --query "properties.endpoint" -o tsv

# Pobierz klucz
az cognitiveservices account keys list \
  --name your-openai-resource \
  --resource-group dvlp-ksef-rg \
  --query "key1" -o tsv
```

---

## Krok 2: Wdrożenie modelu

### Azure Portal (AI Foundry)

1. Przejdź do **Azure AI Foundry** (https://ai.azure.com)
2. Wybierz swój zasób OpenAI
3. Kliknij **Deployments** → **Create deployment**
4. Wybierz model:

| Pole | Wartość |
|------|---------|
| Model | `gpt-4o-mini` |
| Deployment name | `gpt-4o-mini` |
| Deployment type | `Standard` |
| Tokens per Minute Rate Limit | `30K` (możesz zwiększyć później) |

5. Kliknij **Create**

### Azure CLI

```bash
# Wdróż model gpt-4o-mini
az cognitiveservices account deployment create \
  --name your-openai-resource \
  --resource-group dvlp-ksef-rg \
  --deployment-name gpt-4o-mini \
  --model-name gpt-4o-mini \
  --model-version "2024-07-18" \
  --model-format OpenAI \
  --sku-capacity 30 \
  --sku-name Standard
```

---

## Krok 3: Konfiguracja Key Vault

Przechowuj klucz API w Azure Key Vault (nie w zmiennych środowiskowych!):

```bash
# Zapisz klucz API do Key Vault
az keyvault secret set \
  --vault-name your-keyvault-name \
  --name AZURE-OPENAI-API-KEY \
  --value "<twój-klucz-api>"

# Zapisz endpoint do Key Vault
az keyvault secret set \
  --vault-name your-keyvault-name \
  --name AZURE-OPENAI-ENDPOINT \
  --value "https://your-openai-resource.openai.azure.com/"
```

### Weryfikacja

```bash
# Sprawdź czy sekrety są zapisane
az keyvault secret show \
  --vault-name your-keyvault-name \
  --name AZURE-OPENAI-API-KEY \
  --query "name" -o tsv

az keyvault secret show \
  --vault-name your-keyvault-name \
  --name AZURE-OPENAI-ENDPOINT \
  --query "value" -o tsv
```

---

## Krok 4: Konfiguracja zmiennych środowiskowych

### Lokalne środowisko deweloperskie

Edytuj plik `.env.local` (root projektu):

```bash
# =============================================================================
# Azure OpenAI (AI Categorization)
# =============================================================================
# Wersja API i nazwa deployment - NIE są sekretami
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini

# Dla lokalnego dev możesz opcjonalnie ustawić endpoint i klucz bezpośrednio
# (w produkcji ZAWSZE pobierane z Key Vault)
# AZURE_OPENAI_ENDPOINT=https://your-openai-resource.openai.azure.com/
# AZURE_OPENAI_API_KEY=your-api-key
```

### Azure Functions (local.settings.json)

Edytuj `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "KEY_VAULT_URL": "https://your-keyvault-name.vault.azure.net/",
    "AZURE_OPENAI_DEPLOYMENT": "gpt-4o-mini",
    "AZURE_OPENAI_API_VERSION": "2024-10-21"
  }
}
```

> **Ważne:** Endpoint i API Key są pobierane z Key Vault w runtime - NIE dodawaj ich do App Settings!

### Produkcja (Azure Functions App Settings)

W produkcji potrzebujesz tylko:

```bash
# Tylko te ustawienia - sekrety pobierane z Key Vault
az functionapp config appsettings set \
  --name dvlp-ksef-api \
  --resource-group dvlp-ksef-rg \
  --settings \
    "KEY_VAULT_URL=https://your-keyvault-name.vault.azure.net/" \
    "AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini" \
    "AZURE_OPENAI_API_VERSION=2024-10-21"
```

### Podsumowanie: Co gdzie przechowywać

| Dane | Gdzie | Dlaczego |
|------|-------|----------|
| `API Key` | **Key Vault** | Sekret - nigdy w kodzie/env |
| `Endpoint` | **Key Vault** | Może zawierać identyfikatory |
| `Deployment name` | App Settings | Nie jest sekretem |
| `API Version` | App Settings | Nie jest sekretem |
| `Key Vault URL` | App Settings | Potrzebny do połączenia |

---

## Krok 5: Włączenie feature flag

### Web App (.env.local)

```bash
# Włącz AI categorization
FEATURE_AI_CATEGORIZATION=true
```

### Produkcja

Dodaj zmienną w Azure Static Web App:

```bash
az staticwebapp appsettings set \
  --name dvlp-ksef-web \
  --resource-group dvlp-ksef-rg \
  --setting-names \
    "FEATURE_AI_CATEGORIZATION=true"
```

---

## Krok 6: Testowanie

### Test połączenia z Azure OpenAI

```bash
# Sprawdź czy model odpowiada
curl -X POST "https://your-openai-resource.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-10-21" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Powiedz: test działa"}],
    "max_tokens": 50
  }'
```

### Test przez API (po implementacji)

```bash
# Kategoryzuj fakturę
curl -X POST "http://localhost:7071/api/invoices/categorize" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "xxx-yyy-zzz",
    "supplierName": "Microsoft Sp. z o.o.",
    "supplierNip": "5272559482",
    "items": ["Licencje Microsoft 365", "Azure Credits"]
  }'
```

---

## Schemat danych

### Pola AI w tabeli Invoice (Dataverse)

| Pole | Typ | Opis |
|------|-----|------|
| `dvlp_aimmpksuggestion` | Choice | Sugestia MPK od AI |
| `dvlp_aicategorysuggestion` | Text (100) | Sugestia kategorii od AI |
| `dvlp_aiconfidence` | Decimal | Pewność AI (0.0-1.0) |
| `dvlp_aidescription` | Text (500) | Opis wygenerowany przez AI |
| `dvlp_aiprocessedat` | DateTime | Kiedy AI przetworzyło fakturę |

### Cache dostawca → kategoria

| Pole | Typ | Opis |
|------|-----|------|
| `dvlp_suppliernip` | Text (10) | NIP dostawcy (klucz) |
| `dvlp_suppliername` | Text (200) | Nazwa dostawcy |
| `dvlp_defaultmpk` | Choice | Domyślne MPK |
| `dvlp_defaultcategory` | Text (100) | Domyślna kategoria |
| `dvlp_usagecount` | Integer | Liczba użyć |
| `dvlp_lastused` | DateTime | Ostatnie użycie |

---

## Prompty AI

### Kategoryzacja faktury

```
Jesteś asystentem księgowym. Na podstawie danych faktury zasugeruj:
1. MPK (centrum kosztów) - wybierz z: Consultants, BackOffice, Management, Cars, Legal, Marketing, Sales, Delivery, Finance, Other
2. Kategorię - krótka nazwa kategorii wydatków (np. "Licencje IT", "Usługi doradcze", "Paliwo")
3. Krótki opis faktury (max 100 znaków)

Dane faktury:
- Dostawca: {supplierName} (NIP: {supplierNip})
- Pozycje: {items}
- Kwota brutto: {grossAmount} PLN

Odpowiedz w formacie JSON:
{
  "mpk": "wybrane MPK",
  "category": "kategoria",
  "description": "krótki opis",
  "confidence": 0.0-1.0
}
```

### Uczenie się z poprawek

Gdy użytkownik poprawi kategorię:
1. Zapisz mapowanie dostawca NIP → (MPK, kategoria) do cache
2. Przy następnej fakturze od tego dostawcy użyj cache zamiast AI
3. Jeśli użytkownik znów poprawi, zaktualizuj cache

---

## Szacowane koszty

### Azure OpenAI (gpt-4o-mini)

| Operacja | Cena (USD) |
|----------|------------|
| Input tokens | $0.00015 / 1K tokens |
| Output tokens | $0.0006 / 1K tokens |

### Przykład

- Średnia faktura: ~500 input tokens, ~100 output tokens
- 1000 faktur/miesiąc: ~$0.14/miesiąc

---

## Następne kroki

Po konfiguracji Azure OpenAI, implementacja obejmuje:

1. [ ] **API Endpoint** - `POST /api/invoices/categorize`
2. [ ] **Serwis OpenAI** - `api/src/lib/openai-service.ts`
3. [ ] **Cache dostawców** - `api/src/lib/supplier-cache.ts`
4. [ ] **UI kategoryzacji** - przycisk "Kategoryzuj AI" na liście faktur
5. [ ] **Batch processing** - kategoryzacja wielu faktur na raz
6. [ ] **Testy** - unit testy dla parsowania odpowiedzi AI

---

## Troubleshooting

### Błąd: "Resource not found"

```
Sprawdź czy:
1. Zasób Azure OpenAI został utworzony
2. Model został wdrożony
3. Nazwa deployment zgadza się z AZURE_OPENAI_DEPLOYMENT
```

### Błąd: "Access denied"

```
Sprawdź czy:
1. Function App ma dostęp do Key Vault (Managed Identity)
2. Klucz API jest poprawny
3. API version jest obsługiwana
```

### Błąd: "Rate limit exceeded"

```
Rozwiązania:
1. Zwiększ Tokens per Minute w ustawieniach deployment
2. Zaimplementuj retry z exponential backoff
3. Użyj batch processing zamiast pojedynczych requestów
```

---

## Powiązane dokumenty

- [Zmienne środowiskowe](./ZMIENNE_SRODOWISKOWE.md) — pełna referencja env vars
- [Zasoby Azure](./AZURE_RESOURCES_SETUP.md) — Key Vault, Functions
- [Rozwiązywanie problemów](./ROZWIAZYWANIE_PROBLEMOW.md) — centralna diagnostyka

---

**Ostatnia aktualizacja:** 2026-02-11  
**Wersja:** 1.0  
**Opiekun:** dvlp-dev team
