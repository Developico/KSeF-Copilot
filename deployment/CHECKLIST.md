# Lista kontrolna wdrożenia — KSeF Integration

Interaktywna lista kontrolna z polami do zapisywania danych w trakcie wdrożenia.

> **Instrukcja:** Skopiuj ten plik do issue trackera lub zaznaczaj checkboxy bezpośrednio w edytorze Markdown.
> Uzupełniaj wartości w miarę postępu — będą potrzebne w kolejnych krokach.
>
> **Fazy:** Kroki są pogrupowane w 7 faz (A–G). Każda faza kończy się bramką STOP —
> nie przechodź dalej, dopóki wszystkie checkboxy w fazie nie są zaznaczone.

**Wersja:** 4.0  
**Data rozpoczęcia wdrożenia:** _______________  
**Środowisko docelowe (test/prod):** _______________  
**Szacowany czas całości:** ~6–8 h (nie licząc oczekiwania na admin consent)

---

## Dane zebrane w trakcie wdrożenia

Centralna tabela — uzupełniaj w miarę uzyskiwania wartości:

| # | Parametr | Wartość | Krok |
|---|----------|---------|------|
| 1 | `AZURE_SUBSCRIPTION_ID` | | 1 |
| 2 | `AZURE_TENANT_ID` | | 3 |
| 3 | `AZURE_CLIENT_ID` | | 3 |
| 4 | `AZURE_CLIENT_SECRET` | | 3 |
| 5 | `RESOURCE_GROUP_NAME` | | 5 |
| 6 | `LOCATION` | | 5 |
| 7 | `FUNCTION_APP_NAME` | | 5 |
| 8 | `WEB_APP_NAME` | | 5 |
| 9 | `KEY_VAULT_NAME` | | 5 |
| 10 | `DATAVERSE_URL` | | 2 |
| 11 | `KSEF_ENVIRONMENT` | | 12 |
| 12 | `KSEF_NIP` | | 12 |
| 13 | `OPENAI_RESOURCE_NAME` | | 9 |
| 14 | `AZURE_OPENAI_ENDPOINT` | | 9 |
| 15 | `FUNCTION_APP_URL` | | 7 |
| 16 | `WEB_APP_URL` | | 8 |
| 17 | `APP_INSIGHTS_CONNECTION_STRING` | | 5 |
| 18 | `KEY_VAULT_URL` | | 5 |

---

## 🅰️ Faza A — Przygotowanie (⏱ ~50 min)

## Krok 0 — Instalacja narzędzi i rozszerzeń (⏱ ~30 min)

### Narzędzia

- [ ] PowerShell 7+ → wersja: __________
- [ ] Azure CLI 2.60+ → wersja: __________
- [ ] Azure Functions Core Tools 4.x → wersja: __________
- [ ] Node.js 22 LTS → wersja: __________
- [ ] npm 10+ → wersja: __________
- [ ] Power Platform CLI → wersja: __________
- [ ] Git → wersja: __________

### Rozszerzenia VS Code

- [ ] Azure Functions (`ms-azuretools.vscode-azurefunctions`)
- [ ] Azure App Service (`ms-azuretools.vscode-azureappservice`)
- [ ] Azure Resources (`ms-azuretools.vscode-azureresourcegroups`)
- [ ] Bicep (`ms-azuretools.vscode-bicep`)
- [ ] PowerShell (`ms-vscode.powershell`)
- [ ] Power Platform Tools (`microsoft.powerplatform-vscode`)
- [ ] ESLint (`dbaeumer.vscode-eslint`)
- [ ] Prettier (`esbenp.prettier-vscode`)
- [ ] Tailwind CSS (`bradlc.vscode-tailwindcss`)
- [ ] Azure Tools (`ms-vscode.vscode-node-azure-pack`)

### Uprawnienia i role

- [ ] Subskrypcja Azure → Contributor/Owner
- [ ] Entra ID → Application Administrator
- [ ] Power Platform → System Administrator
- [ ] Dataverse → System Administrator lub System Customizer
- [ ] Repozytorium Git → Read
- [ ] Tokeny KSeF przygotowane dla każdej firmy
- [ ] URL środowiska Dataverse znany

### MPK (centrum kosztów) — weryfikacja

- [ ] Domyślne wartości MPK odpowiadają klientowi (lub zaplanowano modyfikację)
- [ ] Jeśli zmiana MPK → zaplanowano aktualizację w 4 lokalizacjach:
  - [ ] Dataverse optionset `dvlp_costcenter`
  - [ ] `api/src/lib/dataverse/entities.ts` → `MpkValues`
  - [ ] `web/src/components/invoices/invoice-detail-content.tsx` → `MPK_OPTIONS`
  - [ ] `api/src/lib/openai-service.ts` → prompt AI

---

## Krok 1 — Logowanie i weryfikacja dostępów (⏱ ~20 min)

- [ ] Zalogowano do Azure CLI (`az login`)
- [ ] Ustawiono subskrypcję: `AZURE_SUBSCRIPTION_ID`: __________
- [ ] Zalogowano do Power Platform CLI (`pac auth create`)
- [ ] Zweryfikowano uprawnienia Azure (Contributor+)
- [ ] Zweryfikowano uprawnienia Power Platform (System Admin)
- [ ] Zweryfikowano rolę Dataverse (System Administrator)

> 🚨 **STOP — Bramka Fazy A:** Wszystkie narzędzia zainstalowane, zalogowano do Azure i Power Platform, uprawnienia potwierdzone? → Przejdź do Fazy B.

---

## 🅱️ Faza B — Power Platform (⏱ ~30 min)

## Krok 2 — Import solucji Power Platform (⏱ ~30 min)

- [ ] Plik solucji wybrany:
  - [ ] Managed: `DevelopicoKSeF_*_managed.zip` (produkcja)
  - [ ] Unmanaged: `DevelopicoKSeF_*.zip` (dev)
- [ ] Import uruchomiony (`pac solution import` lub Maker Portal)
- [ ] Import zakończony pomyślnie (brak błędów)
- [ ] `DATAVERSE_URL`: __________
- [ ] Tabele Dataverse widoczne:
  - [ ] `dvlp_ksefinvoice`
  - [ ] `dvlp_ksefsetting`
  - [ ] `dvlp_ksefsession`
  - [ ] `dvlp_ksefsynclog`
  - [ ] `dvlp_ksefsupplier`
  - [ ] `dvlp_ksefsbagrement`
  - [ ] `dvlp_ksefselfbillingtemplate`
- [ ] MDA App widoczna w Apps
- [ ] Custom Connector widoczny w Data → Custom connectors
- [ ] Cloud Flows widoczne

> 🚨 **STOP — Bramka Fazy B:** Import zakończony, tabele widoczne, MDA App i Custom Connector dostępne? → Przejdź do Fazy C.

---

## 🅲️ Faza C — Tożsamość i dostępy (⏱ ~40 min)

## Krok 3 — Entra ID: App Registration (⏱ ~25 min)

- [ ] Uruchomiono `deployment\azure\Setup-EntraId.ps1` lub ręcznie w Portal
- [ ] App Registration utworzona: nazwa: __________
- [ ] Service Principal utworzony
- [ ] Client Secret wygenerowany i **bezpiecznie zapisany**
- [ ] Uprawnienia Dataverse API dodane (`user_impersonation`)
- [ ] Admin Consent nadany
- [ ] **Expose an API** → Application ID URI: `api://` __________
- [ ] Scope `access_as_user` dodany
- [ ] Redirect URI dodane: `https://global.consent.azure-apim.net/redirect`
- [ ] Zapisano wartości:
  - `AZURE_TENANT_ID`: __________
  - `AZURE_CLIENT_ID`: __________
  - `AZURE_CLIENT_SECRET`: __________ *(nie commituj!)*

---

## Krok 4 — Application User w Dataverse (⏱ ~15 min)

- [ ] Power Platform Admin Center → Application users → **+ New app user**
- [ ] App Registration wybrana (po `AZURE_CLIENT_ID`)
- [ ] Business unit: __________
- [ ] Security role przypisana: __________
- [ ] Application User aktywny

> 🚨 **STOP — Bramka Fazy C:** App Registration gotowa, secret zapisany, Application User aktywny? → Przejdź do Fazy D.

---

## 🅳️ Faza D — Infrastruktura Azure (⏱ ~40 min)

## Krok 5 — Infrastruktura Azure (⏱ ~25 min)

### Metoda

- [ ] **Bicep** (zalecane) / [ ] **Ręcznie w Portal**
- [ ] Region: __________ (zalecany: Poland Central)

### Zasoby

- [ ] Plik parametrów wybrany (jeśli Bicep):
  - [ ] `main.test.bicepparam` (test)
  - [ ] `main.prod.bicepparam` (produkcja)
- [ ] Grupa zasobów utworzona
  - `RESOURCE_GROUP_NAME`: __________
  - `LOCATION`: __________
- [ ] Deployment zakończony (Bicep lub ręcznie)
- [ ] Zasoby zweryfikowane (`az resource list`):
  - [ ] Function App (Flex Consumption)
  - [ ] App Service Plan
  - [ ] App Service
  - [ ] Key Vault
  - [ ] Storage Account
  - [ ] Application Insights
  - [ ] Log Analytics Workspace
- [ ] Wartości z outputs:
  - `FUNCTION_APP_NAME`: __________
  - `FUNCTION_APP_URL`: __________
  - `WEB_APP_NAME`: __________
  - `WEB_APP_URL`: __________
  - `KEY_VAULT_NAME`: __________
  - `KEY_VAULT_URL`: __________
  - `APP_INSIGHTS_CONNECTION_STRING`: __________

---

## Krok 6 — Zmienne środowiskowe Function App (⏱ ~15 min)

- [ ] `AZURE_TENANT_ID` — ustawione
- [ ] `AZURE_CLIENT_ID` — ustawione
- [ ] `AZURE_CLIENT_SECRET` — ustawione
- [ ] `DATAVERSE_URL` — ustawione
- [ ] `DATAVERSE_ENTITY_INVOICE` = `dvlp_ksefinvoice`
- [ ] `DATAVERSE_ENTITY_SETTING` = `dvlp_ksefsetting`
- [ ] `DATAVERSE_ENTITY_SESSION` = `dvlp_ksefsession`
- [ ] `DATAVERSE_ENTITY_SYNCLOG` = `dvlp_ksefsynclog`
- [ ] `DATAVERSE_ENTITY_SUPPLIER` = `dvlp_ksefsupplier`
- [ ] `DATAVERSE_ENTITY_SB_AGREEMENT` = `dvlp_ksefsbagrement`
- [ ] `DATAVERSE_ENTITY_SB_TEMPLATE` = `dvlp_ksefselfbillingtemplate`
- [ ] `AZURE_KEYVAULT_URL` — ustawione
- [ ] `KSEF_ENVIRONMENT` — ustawione
- [ ] `KSEF_NIP` — ustawione
- [ ] **`AzureWebJobsFeatureFlags`** = `EnableWorkerIndexing` ← WYMAGANE!
- [ ] `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR` = `true`

> 🚨 **STOP — Bramka Fazy D:** Zasoby Azure utworzone, zmienne ustawione, `AzureWebJobsFeatureFlags` = `EnableWorkerIndexing`? → Przejdź do Fazy E.

---

## 🅴️ Faza E — Wdrożenie aplikacji (⏱ ~60 min)

## Krok 7 — Deploy API (⏱ ~20 min)

- [ ] `cd api`
- [ ] `npm install --omit=dev --no-workspaces --ignore-scripts` — zakończone
- [ ] `npm run build` — zakończone bez błędów
- [ ] ZIP utworzony (`Compress-Archive`)
- [ ] `az functionapp deployment source config-zip` — zakończone
- [ ] `func azure functionapp list-functions` — lista widoczna
  - Liczba funkcji: __________
- [ ] Health endpoint:
  - `GET /api/health` → `status`: __________
  - Dataverse: __________
  - Key Vault: __________
  - KSeF: __________

---

## Krok 8 — Deploy Web (⏱ ~25 min)

### Zmienne App Service

- [ ] `NEXT_PUBLIC_AZURE_CLIENT_ID` — ustawione
- [ ] `NEXT_PUBLIC_AZURE_TENANT_ID` — ustawione
- [ ] `NEXT_PUBLIC_API_BASE_URL` — ustawione
- [ ] `NEXT_PUBLIC_API_SCOPE` — ustawione (`api://{CLIENT_ID}/.default`)

### Deploy

- [ ] `npm install --workspace=web` — zakończone
- [ ] `npm run build --workspace=web` — zakończone
- [ ] ZIP ze `standalone/` utworzony
- [ ] `az webapp deploy` — zakończone
- [ ] Startup command ustawiony: `node server.js`
- [ ] Strona dostępna: `WEB_APP_URL`: __________
- [ ] Logowanie przez Entra ID działa

---

## Krok 8a — Redirect URI w Entra ID (⏱ ~15 min)

- [ ] Redirect URI dodane w App Registration → Authentication:
  - [ ] `https://global.consent.azure-apim.net/redirect` (Custom Connector)
  - [ ] `https://<WEB_APP_URL>` (Web App)
  - [ ] `https://<WEB_APP_URL>/api/auth/callback/azure-ad` (NextAuth callback)
  - [ ] `http://localhost:3000` (lokalne dev — opcjonalnie)
- [ ] Web App → logowanie → redirect → powrót do dashboardu
- [ ] Brak błędu AADSTS50011

> 🚨 **STOP — Bramka Fazy E:** API zwraca health, Web się ładuje, logowanie działa, redirect OK? → Przejdź do Fazy F.

---

## 🅵️ Faza F — Integracje i konfiguracja (⏱ ~90 min)

## Krok 9 — AI Categorization (⏱ ~30 min)

> Pomiń jeśli klient nie potrzebuje AI. Pozostaw `FEATURE_AI_CATEGORIZATION=false`.

### 9a. Zasób Azure OpenAI

- [ ] Zasób utworzony: nazwa: __________
- [ ] Region: __________ (zalecany: Poland Central)
- [ ] `AZURE_OPENAI_ENDPOINT`: __________

### 9b. Model

- [ ] Model `gpt-4o-mini` wdrożony
- [ ] Deployment name: `gpt-4o-mini`
- [ ] TPM: __________

### 9c. Key Vault

- [ ] Secret `AZURE-OPENAI-API-KEY` dodany do Key Vault
- [ ] Secret `AZURE-OPENAI-ENDPOINT` dodany do Key Vault

### 9d. Feature flag i zmienne

- [ ] `FEATURE_AI_CATEGORIZATION` = `true` → ustawione w Function App
- [ ] `AZURE_OPENAI_DEPLOYMENT` = `gpt-4o-mini` → ustawione
- [ ] `AZURE_OPENAI_API_VERSION` = `2024-10-21` → ustawione
- [ ] Test połączenia z modelem → OK

### Prompt AI

- [ ] Prompt przejrzany w `api/src/lib/openai-service.ts`
- [ ] Lista MPK w prompcie odpowiada klientowi (patrz Krok 0)

---

## Krok 10 — Custom Connector (⏱ ~20 min)

- [ ] Custom Connector edytowany:
  - [ ] Host: `FUNCTION_APP_NAME`.azurewebsites.net
  - [ ] Authentication: OAuth 2.0 / Azure AD
  - [ ] Client ID → `AZURE_CLIENT_ID`
  - [ ] Client Secret → `AZURE_CLIENT_SECRET`
  - [ ] Tenant ID → `AZURE_TENANT_ID`
  - [ ] Resource URL: `api://AZURE_CLIENT_ID`
  - [ ] Scope: `api://AZURE_CLIENT_ID/.default`
- [ ] **Update connector** kliknięty
- [ ] Connection utworzone i zalogowane
- [ ] Test `HealthCheck` → wynik: __________
- [ ] Test `ListCompanies` → wynik: __________

> Jeśli AADSTS90009 → wróć do kroku 3 (Expose an API)

---

## Krok 11 — Connection References i Power Automate (⏱ ~20 min)

- [ ] Connection Reference **KSeF API** → skonfigurowany
- [ ] Connection Reference **Dataverse** → skonfigurowany
- [ ] Cloud Flows włączone:
  - [ ] KSeF Sync — Turn on
  - [ ] KSeF AI Categorize — Turn on (jeśli AI)
  - [ ] KSeF Alert — Turn on
- [ ] Ręczny test flow przechodzi

---

## Krok 12 — Tokeny KSeF (⏱ ~20 min)

- [ ] Tokeny dodane do Key Vault:
  - [ ] Firma 1: NIP __________ → `ksef-token-__________`
  - [ ] Firma 2: NIP __________ → `ksef-token-__________`
  - [ ] _(dodaj wiersze w razie potrzeby)_
- [ ] Secrety widoczne w Key Vault (`az keyvault secret list`)
- [ ] Function App ma uprawnienia do Key Vault (RBAC/Access Policy)
- [ ] `GET /api/settings/companies` → firmy widoczne

> 🚨 **STOP — Bramka Fazy F:** AI skonfigurowane (lub pominięte), Custom Connector działa, Flows włączone, tokeny dodane? → Przejdź do Fazy G.

---

## 🅶️ Faza G — Bezpieczeństwo i utrzymanie (⏱ ~60 min)

## Krok 13 — Role i uprawnienia (⏱ ~20 min)

### Entra ID (Role aplikacyjne)

- [ ] Rola `Admin` zdefiniowana w App Registration
- [ ] Rola `Reader` zdefiniowana w App Registration
- [ ] Użytkownicy przypisani do ról (Enterprise applications):
  - [ ] Admin: __________
  - [ ] Reader: __________

### Dataverse (Security Roles)

- [ ] `KSeF Admin` — przypisany do: __________
- [ ] `KSeF Reader` — przypisany do: __________

### Weryfikacja RBAC

- [ ] Admin → pełne CRUD ✓
- [ ] Reader → tylko odczyt ✓
- [ ] Nieautoryzowany → 401 ✓
- [ ] Brak roli → 403 ✓

---

## Krok 14 — Weryfikacja końcowa (⏱ ~30 min)

### API

- [ ] `GET /api/health` → healthy (wszystkie serwisy)
- [ ] `GET /api/settings/companies` → lista firm
- [ ] `GET /api/invoices` → faktury (z tokenem Bearer)

### Web Dashboard

- [ ] Strona ładuje się
- [ ] Logowanie Entra ID działa
- [ ] Dashboard wyświetla dane
- [ ] Filtrowanie/sortowanie działa

### Samofakturowanie (Self-Billing)

- [ ] Strona dostawców — lista dostawców widoczna
- [ ] Szczegóły dostawcy — karta umowy SB, szablony
- [ ] Strona samofakturowania — lista faktur SB
- [ ] Generowanie faktur — podgląd i potwierdzenie
- [ ] Import z pliku — pobieranie szablonu, upload, walidacja
- [ ] Dashboard — kafelki KPI samofakturowania widoczne

### Power Platform

- [ ] Custom Connector — `HealthCheck` ✓
- [ ] Custom Connector — `ListCompanies` ✓
- [ ] Custom Connector — `GetInvoices` ✓
- [ ] MDA App — otwiera się i wyświetla dane
- [ ] Power Automate — ręczny test flow ✓
- [ ] Faktury zaimportowane do Dataverse ✓

### AI Categorization (jeśli krok 9 wykonany)

- [ ] `POST /api/invoices/categorize` → odpowiedź z sugestią
- [ ] Sugestia AI zapisana w Dataverse
- [ ] UI wyświetla sugestie
- [ ] Poprawki użytkownika zapisane w cache

### Redirect URI

- [ ] Logowanie Web App → bez błędu AADSTS50011
- [ ] Logowanie lokalne (localhost:3000) → bez błędu (jeśli dodano)

---

## Krok 15 — Po wdrożeniu (⏱ ~30 min)

### 15a. Monitoring

- [ ] Application Insights aktywne (Live Metrics)
- [ ] Alerty Azure Monitor skonfigurowane
- [ ] Powiadomienia e-mail / Teams ustawione

### 15b. Backup

- [ ] Backup Dataverse skonfigurowany (automatyczny, co 24h)
- [ ] ARM template export wykonany

### 15c. Dokumentacja

- [ ] Instrukcja dla użytkowników końcowych przekazana
- [ ] FAQ przygotowane
- [ ] Dane kontaktowe wsparcia przekazane

### 15d. CI/CD (opcjonalnie)

- [ ] Pipeline deploy API (GitHub Actions)
- [ ] Pipeline deploy Web (GitHub Actions)
- [ ] Pipeline Infrastructure (Bicep)

### 15e. Harmonogram utrzymania

- [ ] Rotacja `AZURE_CLIENT_SECRET` (co 24 mies.) → data: __________
- [ ] Rotacja tokenów KSeF → wg polityki firmy
- [ ] Przegląd modelu AI → co kwartał
- [ ] Przegląd alertów → co tydzień

---

## Podpisy

| Rola | Osoba | Data | Status |
|------|-------|------|--------|
| Wdrożenie Azure | | | |
| Wdrożenie Power Platform | | | |
| Konfiguracja AI | | | |
| Konfiguracja bezpieczeństwa | | | |
| Weryfikacja końcowa | | | |
| Odbiór klienta | | | |

---

*Wersja 4.0 — 2025-06-21 — 16 kroków (0-15 + 8a) w 7 fazach (A–G) z bramkami STOP i szacowanymi czasami, zgodna z deployment/README.md v4.0*
