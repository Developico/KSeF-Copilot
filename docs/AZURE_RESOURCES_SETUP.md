# Konfiguracja zasobów Azure dla KSeF

Instrukcja tworzenia i konfiguracji zasobów Azure potrzebnych do wdrożenia integracji KSeF.

## Spis treści

1. [Przegląd architektury](#przegląd-architektury)
2. [Resource Group](#resource-group)
3. [Key Vault](#key-vault)
4. [Azure Functions (API)](#azure-functions-api)
5. [Static Web App (opcjonalnie)](#static-web-app)
6. [Weryfikacja konfiguracji](#weryfikacja-konfiguracji)

---

## Przegląd architektury

```
┌─────────────────────────────────────────────────────────────────┐
│                        Azure Resource Group                      │
│                         (rg-ksef-prod)                          │
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │  Azure Key     │     │  Azure          │                    │
│  │  Vault         │◀────│  Functions      │                    │
│  │  (kv-ksef)     │     │  (func-ksef)    │                    │
│  └─────────────────┘     └─────────────────┘                    │
│         │                        │                               │
│         │ Secrets                │ API                          │
│         ▼                        ▼                               │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │ - ClientSecret │     │  Dataverse      │                    │
│  │ - KSeF Token   │     │  (CRM Online)   │                    │
│  │ - Connection   │     │                 │                    │
│  │   Strings      │     │                 │                    │
│  └─────────────────┘     └─────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resource Group

### Krok 1: Utwórz Resource Group

1. Przejdź do [Azure Portal](https://portal.azure.com)
2. Wyszukaj **"Resource groups"**
3. Kliknij **"+ Create"**
4. Wypełnij:
   - **Subscription:** Twoja subskrypcja
   - **Resource group:** `rg-ksef-prod` (lub `rg-ksef-dev` dla dev)
   - **Region:** `West Europe` (lub najbliższy)
5. Kliknij **"Review + create"** → **"Create"**

### Konwencja nazewnictwa

| Środowisko | Resource Group | Region |
|------------|----------------|--------|
| Development | `rg-ksef-dev` | West Europe |
| Production | `rg-ksef-prod` | West Europe |

---

## Key Vault

### Krok 2: Utwórz Key Vault

1. W Resource Group kliknij **"+ Create"**
2. Wyszukaj **"Key Vault"** i wybierz
3. Kliknij **"Create"**

#### Zakładka Basics

| Pole | Wartość | Opis |
|------|---------|------|
| Subscription | (twoja subskrypcja) | - |
| Resource group | `rg-ksef-prod` | - |
| Key vault name | `kv-ksef-prod` | Musi być unikalny globalnie |
| Region | `West Europe` | Ten sam co RG |
| Pricing tier | **Standard** | Wystarczy dla secrets |

#### Zakładka Access configuration

> ⚠️ **WAŻNE:** To jest kluczowa sekcja dla uprawnień!

| Pole | Wartość | Opis |
|------|---------|------|
| Permission model | **Azure role-based access control (RBAC)** | ✅ Rekomendowane |

**Dlaczego RBAC?**
- Centralne zarządzanie uprawnieniami przez Azure IAM
- Lepsza integracja z Managed Identity
- Audytowalność przez Azure Activity Log

#### Zakładka Networking

| Pole | Wartość | Opis |
|------|---------|------|
| Enable public access | **All networks** | Dla dev; w prod rozważ Private Endpoint |

#### Zakładka Tags (opcjonalnie)

| Tag | Wartość |
|-----|---------|
| `project` | `ksef` |
| `environment` | `production` |

5. Kliknij **"Review + create"** → **"Create"**

### Krok 3: Skonfiguruj uprawnienia do Key Vault (RBAC)

Po utworzeniu Key Vault, musisz nadać uprawnienia:

#### 3.1 Uprawnienia dla siebie (administratora)

1. Przejdź do Key Vault → **"Access control (IAM)"**
2. Kliknij **"+ Add"** → **"Add role assignment"**
3. Wybierz rolę:
   - **Role:** `Key Vault Administrator`
4. Kliknij **"Next"**
5. **Assign access to:** `User, group, or service principal`
6. Kliknij **"+ Select members"** i wybierz siebie
7. Kliknij **"Review + assign"**

#### 3.2 Uprawnienia dla Azure Functions (Managed Identity)

> ⚠️ Ten krok wykonaj PO utworzeniu Azure Functions z włączonym Managed Identity

1. Przejdź do Key Vault → **"Access control (IAM)"**
2. Kliknij **"+ Add"** → **"Add role assignment"**
3. Wybierz rolę:
   - **Role:** `Key Vault Secrets User`
   
   > 📝 Ta rola pozwala tylko na **odczyt** secrets - zasada minimalnych uprawnień
   
4. Kliknij **"Next"**
5. **Assign access to:** `Managed identity`
6. Kliknij **"+ Select members"**:
   - **Managed identity:** `Function App`
   - Wybierz swoją aplikację Functions (np. `func-ksef-prod`)
7. Kliknij **"Review + assign"**

### Krok 4: Dodaj sekrety do Key Vault

1. Przejdź do Key Vault → **"Secrets"**
2. Kliknij **"+ Generate/Import"**

#### Wymagane sekrety

| Nazwa sekretu | Wartość | Opis |
|---------------|---------|------|
| `ENTRA-CLIENT-SECRET` | (z App Registration) | Client Secret aplikacji |
| `DATAVERSE-URL` | `https://org.crm4.dynamics.com` | URL środowiska Dataverse |
| `ENTRA-CLIENT-ID` | (z App Registration) | Application (client) ID |
| `ENTRA-TENANT-ID` | (z App Registration) | Directory (tenant) ID |

> 💡 **Wskazówka:** Użyj nazw z myślnikami zamiast podkreślników - Azure automatycznie konwertuje je na zmienne środowiskowe

#### Dodawanie sekretu

Dla każdego sekretu:
1. **Name:** np. `ENTRA-CLIENT-SECRET`
2. **Secret value:** wartość sekretu
3. **Content type:** (opcjonalnie) `text/plain`
4. **Set activation date:** (opcjonalnie)
5. **Set expiration date:** ✅ Ustaw dla CLIENT-SECRET (np. 1 rok)
6. Kliknij **"Create"**

### Podsumowanie ról Key Vault

| Podmiot | Rola | Uprawnienia |
|---------|------|-------------|
| Administrator (Ty) | `Key Vault Administrator` | Pełne zarządzanie secrets, keys, certificates |
| Azure Functions | `Key Vault Secrets User` | Tylko odczyt secrets (Get, List) |
| App Registration | Brak bezpośredniej roli | Używa Managed Identity przez Functions |

---

## Azure Functions (API)

### Krok 5: Utwórz Azure Functions App

1. W Resource Group kliknij **"+ Create"**
2. Wyszukaj **"Function App"** i wybierz
3. Kliknij **"Create"**

#### Zakładka Basics

| Pole | Wartość | Opis |
|------|---------|------|
| Subscription | (twoja subskrypcja) | - |
| Resource Group | `rg-ksef-prod` | - |
| Function App name | `func-ksef-prod` | Musi być unikalny globalnie |
| Runtime stack | **Node.js** | - |
| Version | **20 LTS** | Wymagane przez projekt |
| Region | `West Europe` | - |
| Operating System | **Linux** | Rekomendowane dla Node.js |
| Hosting plan | **Consumption (Serverless)** | Lub Premium dla większych obciążeń |

#### Zakładka Storage

| Pole | Wartość | Opis |
|------|---------|------|
| Storage account | `stksefprod` (nowy) | Automatycznie utworzony |

#### Zakładka Networking

| Pole | Wartość | Opis |
|------|---------|------|
| Enable public access | **On** | - |

#### Zakładka Monitoring

| Pole | Wartość | Opis |
|------|---------|------|
| Enable Application Insights | **Yes** | ✅ Rekomendowane |
| Application Insights | `appi-ksef-prod` (nowy) | - |

#### Zakładka Deployment

| Pole | Wartość | Opis |
|------|---------|------|
| Enable continuous deployment | **No** | Skonfiguruj później przez GitHub Actions |

5. Kliknij **"Review + create"** → **"Create"**

### Krok 6: Włącz System-assigned Managed Identity

> ⚠️ **WAŻNE:** To jest wymagane do integracji z Key Vault!

1. Przejdź do Function App → **"Identity"**
2. W zakładce **"System assigned"**:
   - **Status:** `On`
3. Kliknij **"Save"**
4. Potwierdź w oknie dialogowym
5. Po zapisaniu pojawi się **Object (principal) ID** - zanotuj go

> 📝 Po tym kroku wróć do Key Vault i nadaj uprawnienia `Key Vault Secrets User` dla tej tożsamości (Krok 3.2)

### Krok 7: Skonfiguruj Key Vault References

Zamiast wpisywać sekrety bezpośrednio w Application Settings, użyj Key Vault References:

1. Przejdź do Function App → **"Environment variables"** (lub Configuration)
2. Kliknij **"+ Add"**

#### Format Key Vault Reference

```
@Microsoft.KeyVault(SecretUri=https://kv-ksef-prod.vault.azure.net/secrets/SECRET-NAME/)
```

#### Wymagane zmienne środowiskowe

| Name | Value | Opis |
|------|-------|------|
| `ENTRA_CLIENT_ID` | `@Microsoft.KeyVault(SecretUri=https://kv-ksef-prod.vault.azure.net/secrets/ENTRA-CLIENT-ID/)` | Client ID z Key Vault |
| `ENTRA_TENANT_ID` | `@Microsoft.KeyVault(SecretUri=https://kv-ksef-prod.vault.azure.net/secrets/ENTRA-TENANT-ID/)` | Tenant ID z Key Vault |
| `ENTRA_CLIENT_SECRET` | `@Microsoft.KeyVault(SecretUri=https://kv-ksef-prod.vault.azure.net/secrets/ENTRA-CLIENT-SECRET/)` | Client Secret z Key Vault |
| `DATAVERSE_URL` | `@Microsoft.KeyVault(SecretUri=https://kv-ksef-prod.vault.azure.net/secrets/DATAVERSE-URL/)` | URL Dataverse z Key Vault |
| `DATAVERSE_ENTITY_INVOICES` | `dvlp_ksefinvoices` | Nazwa tabeli faktur (nie wymaga Key Vault) |
| `DATAVERSE_ENTITY_SETTINGS` | `dvlp_ksefsettings` | Nazwa tabeli ustawień (nie wymaga Key Vault) |

3. Kliknij **"Apply"** i potwierdź restart aplikacji

#### Weryfikacja Key Vault References

Po zapisaniu, przy każdej zmiennej powinna pojawić się zielona ikona ✅ oznaczająca poprawne połączenie z Key Vault.

Jeśli widzisz czerwoną ikonę ❌:
- Sprawdź czy Managed Identity ma rolę `Key Vault Secrets User`
- Sprawdź czy nazwa sekretu jest poprawna
- Sprawdź czy Key Vault jest dostępny (networking)

### Krok 8: Skonfiguruj CORS (jeśli potrzebne)

1. Przejdź do Function App → **"CORS"**
2. Dodaj dozwolone origins:
   - `https://your-web-app.azurestaticapps.net`
   - `http://localhost:3000` (dla development)
3. ✅ Zaznacz **"Enable Access-Control-Allow-Credentials"** jeśli używasz cookies
4. Kliknij **"Save"**

---

## Static Web App (opcjonalnie)

Jeśli wdrażasz Next.js frontend jako Static Web App:

### Krok 9: Utwórz Static Web App

1. W Resource Group kliknij **"+ Create"**
2. Wyszukaj **"Static Web App"** i wybierz
3. Kliknij **"Create"**

#### Zakładka Basics

| Pole | Wartość | Opis |
|------|---------|------|
| Subscription | (twoja subskrypcja) | - |
| Resource Group | `rg-ksef-prod` | - |
| Name | `swa-ksef-prod` | - |
| Plan type | **Free** lub **Standard** | Standard dla custom domains |
| Region | `West Europe` | - |
| Source | **GitHub** | Lub Other dla manual deploy |

#### Konfiguracja GitHub (jeśli wybrano)

| Pole | Wartość |
|------|---------|
| Organization | (twoja organizacja) |
| Repository | `dvlp-ksef` |
| Branch | `main` |
| Build Presets | **Next.js** |
| App location | `/web` |
| Output location | `.next` |

4. Kliknij **"Review + create"** → **"Create"**

### Krok 10: Skonfiguruj połączenie z API

1. Przejdź do Static Web App → **"APIs"**
2. Wybierz **"Link"** aby połączyć z Function App
3. Wybierz `func-ksef-prod`
4. Kliknij **"Link"**

Alternatywnie, w `staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html"
  }
}
```

---

## Weryfikacja konfiguracji

### Checklist Key Vault

- [ ] Key Vault utworzony z Permission model = **RBAC**
- [ ] Ty masz rolę **Key Vault Administrator**
- [ ] Azure Functions ma włączone **System-assigned Managed Identity**
- [ ] Azure Functions ma rolę **Key Vault Secrets User** w Key Vault
- [ ] Wszystkie wymagane sekrety zostały dodane:
  - [ ] `ENTRA-CLIENT-ID`
  - [ ] `ENTRA-TENANT-ID`
  - [ ] `ENTRA-CLIENT-SECRET`
  - [ ] `DATAVERSE-URL`

### Checklist Azure Functions

- [ ] Function App utworzony z Node.js 20 LTS
- [ ] System-assigned Managed Identity = **On**
- [ ] Application Insights włączony
- [ ] Key Vault References skonfigurowane (zielone ikony ✅)
- [ ] CORS skonfigurowany dla frontend URL

### Test połączenia z Key Vault

W Azure Functions → **Console**:

```bash
# Sprawdź czy zmienne są dostępne
echo $ENTRA_CLIENT_ID
```

Lub w kodzie funkcji:
```javascript
// W dowolnej funkcji
console.log('Client ID configured:', !!process.env.ENTRA_CLIENT_ID);
```

### Test połączenia z Dataverse

Wywołaj endpoint API (po wdrożeniu):

```bash
curl https://func-ksef-prod.azurewebsites.net/api/health
```

Oczekiwana odpowiedź:
```json
{
  "status": "healthy",
  "dataverse": "connected",
  "timestamp": "2026-01-27T10:00:00.000Z"
}
```

---

## Rozwiązywanie problemów

### Key Vault Reference nie działa (czerwona ikona)

1. **Sprawdź Managed Identity:**
   ```
   Function App → Identity → System assigned → Status = On
   ```

2. **Sprawdź rolę w Key Vault:**
   ```
   Key Vault → Access control (IAM) → Role assignments
   → Szukaj "Key Vault Secrets User" dla Function App
   ```

3. **Sprawdź format SecretUri:**
   - Poprawny: `@Microsoft.KeyVault(SecretUri=https://kv-name.vault.azure.net/secrets/secret-name/)`
   - Zauważ końcowy `/` po nazwie sekretu

### Error: "Access denied to Key Vault"

- Permission model Key Vault musi być **RBAC** (nie Access policies)
- Lub zmień na Access policies i dodaj odpowiednie uprawnienia ręcznie

### Error: "Managed Identity not found"

1. Wyłącz i włącz ponownie Managed Identity
2. Odczekaj kilka minut na propagację
3. Zrestartuj Function App

---

## Koszty szacunkowe

| Zasób | Plan | Szacunkowy koszt/miesiąc |
|-------|------|-------------------------|
| Resource Group | - | $0 |
| Key Vault | Standard | ~$0.03/10k operations |
| Azure Functions | Consumption | Pay per execution (~$0-5) |
| Storage Account | Standard LRS | ~$1-2 |
| Application Insights | - | Pay per GB (~$2-3) |
| Static Web App | Free/Standard | $0 / $9 |
| **Razem (dev)** | - | **~$5-15/miesiąc** |

---

## Następne kroki

1. ✅ Zasoby Azure skonfigurowane
2. → [Konfiguracja Entra ID](./ENTRA_ID_SETUP.md) (jeśli nie wykonano)
3. → Wdrożenie kodu (CI/CD lub ręczne)
4. → Testy integracyjne
