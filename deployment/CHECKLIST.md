# Lista kontrolna wdrożenia KSeF Integration

Interaktywna lista kontrolna — zaznaczaj kroki w miarę postępu wdrożenia.

> **Instrukcja:** Skopiuj ten plik do issue trackera lub zaznaczaj checkboxy bezpośrednio w edytorze Markdown.

---

## Przygotowanie

- [ ] Azure CLI zainstalowane i zaktualizowane (`az --version`)
- [ ] Azure Functions Core Tools v4 (`func --version`)
- [ ] PowerShell 7+ (`pwsh --version`)
- [ ] Power Platform CLI (`pac --help`)
- [ ] Node.js 20 LTS (`node --version`)
- [ ] pnpm 8+ (`pnpm --version`)
- [ ] Dostęp do subskrypcji Azure (rola Contributor/Owner)
- [ ] Dostęp do Power Platform (rola System Administrator)
- [ ] Tokeny KSeF przygotowane dla każdej firmy
- [ ] Klucz API OpenAI (jeśli AI kategoryzacja)
- [ ] URL środowiska Dataverse znany

---

## Krok 1: Weryfikacja narzędzi i dostępów

- [ ] Zalogowano do Azure CLI (`az login`)
- [ ] Ustawiono właściwą subskrypcję (`az account set`)
- [ ] Zalogowano do Power Platform CLI (`pac auth create`)
- [ ] Zweryfikowano uprawnienia w Azure (Contributor+)
- [ ] Zweryfikowano uprawnienia w Power Platform (System Admin)

---

## Krok 2: Entra ID — App Registration

- [ ] Uruchomiono `Setup-EntraId.ps1` lub `Configure-Azure.ps1`
- [ ] App Registration utworzona w Entra ID
- [ ] Service Principal utworzony
- [ ] Client Secret wygenerowany i **bezpiecznie zapisany**
- [ ] Uprawnienia Dataverse API dodane
- [ ] Admin Consent nadany
- [ ] Zapisano wartości:
  - [ ] `AZURE_TENANT_ID`
  - [ ] `AZURE_CLIENT_ID`
  - [ ] `AZURE_CLIENT_SECRET`

---

## Krok 3: Infrastruktura Azure (Bicep)

- [ ] Grupa zasobów utworzona (`az group create`)
- [ ] Deployment Bicep uruchomiony i zakończony
- [ ] Zasoby zweryfikowane (`az resource list`):
  - [ ] Function App
  - [ ] Key Vault
  - [ ] Storage Account
  - [ ] Application Insights
  - [ ] Log Analytics Workspace
  - [ ] Static Web App

---

## Krok 4: Zmienne środowiskowe

- [ ] App Settings ustawione na Function App
- [ ] `AZURE_TENANT_ID` — poprawne
- [ ] `AZURE_CLIENT_ID` — poprawne
- [ ] `AZURE_CLIENT_SECRET` — poprawne
- [ ] `DATAVERSE_URL` — poprawne
- [ ] `DATAVERSE_ENTITY_*` — poprawne nazwy tabel
- [ ] `KEY_VAULT_URL` — poprawne
- [ ] `KSEF_ENVIRONMENT` — poprawne środowisko
- [ ] `OPENAI_API_KEY` — ustawione (jeśli AI)
- [ ] `FUNCTIONS_NODE_BLOCK_ON_ENTRY_POINT_ERROR` = `true`

---

## Krok 5: Azure Functions (API)

- [ ] `pnpm install` zakończone
- [ ] `pnpm run build` zakończone bez błędów
- [ ] `func azure functionapp publish` zakończone
- [ ] Lista funkcji widoczna (`func azure functionapp list-functions`)
- [ ] Health endpoint odpowiada `status: healthy`

---

## Krok 6: Web App (Static Web App)

- [ ] `pnpm install` zakończone
- [ ] `pnpm run build` zakończone bez błędów
- [ ] Token SWA pobrany
- [ ] Deploy zakończony
- [ ] Strona dostępna pod URL SWA

---

## Krok 7: Solucja Power Platform

- [ ] Plik solucji `.zip` przygotowany (managed lub unmanaged)
- [ ] Import solucji uruchomiony (`pac solution import` lub Maker Portal)
- [ ] Import zakończony pomyślnie (brak błędów)
- [ ] Tabele Dataverse widoczne w środowisku:
  - [ ] `dvlp_ksefinvoice`
  - [ ] `dvlp_ksefsetting`
  - [ ] `dvlp_ksefsession`
  - [ ] `dvlp_ksefsynclog`
- [ ] MDA App widoczna w Apps
- [ ] Code App / Code Component załadowany
- [ ] Custom Connector widoczny w Data → Custom connectors
- [ ] Procesy Power Automate widoczne w Cloud flows

---

## Krok 8: Connection References

- [ ] Custom Connector — OAuth 2.0 skonfigurowany:
  - [ ] Host ustawiony na URL Function App
  - [ ] Client ID / Secret / Tenant ID poprawne
  - [ ] Update connector wykonany
  - [ ] Test `HealthCheck` przeszedł
- [ ] Connection Reference **KSeF API** skonfigurowany w solucji
- [ ] Connection Reference **Dataverse** skonfigurowany w solucji
- [ ] Utworzono połączenie (connection) i zalogowano się

---

## Krok 9: Tokeny KSeF w Key Vault

- [ ] Dla każdej firmy dodano secret `ksef-token-{NIP}`:
  - [ ] Firma 1: NIP __________ → secret dodany
  - [ ] Firma 2: NIP __________ → secret dodany
  - [ ] _(dodaj kolejne wiersze w razie potrzeby)_
- [ ] Secrety widoczne w Azure Portal → Key Vault → Secrets

---

## Krok 10: Role i uprawnienia

### Entra ID (RBAC)
- [ ] Role aplikacyjne zdefiniowane (Admin, Reader)
- [ ] Użytkownicy przypisani do ról

### Dataverse — Application User
- [ ] Application User utworzony w Power Platform Admin Center
- [ ] Rola przypisana (KSeF Admin / System Administrator)

### Dataverse — Security Roles
- [ ] Administratorzy mają rolę **KSeF Admin**
- [ ] Użytkownicy mają rolę **KSeF Reader**

---

## Krok 11: Weryfikacja końcowa

### API
- [ ] `GET /api/health` → `status: healthy`
- [ ] Wszystkie serwisy (Dataverse, Key Vault, KSeF) → `healthy`
- [ ] `GET /api/settings` → zwraca listę firm
- [ ] `GET /api/settings/companies` → zwraca listę firm

### Power Platform
- [ ] Custom Connector — test `HealthCheck` przechodzi
- [ ] Custom Connector — test `ListCompanies` przechodzi
- [ ] MDA App — otwiera się i wyświetla dane
- [ ] Code App / Dashboard — ładuje się poprawnie

### Power Automate
- [ ] Procesy włączone (Turn on)
- [ ] Connection References skonfigurowane
- [ ] Ręczny test flow przeszedł pomyślnie

### Bezpieczeństwo
- [ ] Użytkownik Admin — ma pełne uprawnienia (CRUD, sync)
- [ ] Użytkownik Reader — ma tylko odczyt
- [ ] Nieautoryzowany request → 401
- [ ] Brak roli → 403

---

## Po wdrożeniu

- [ ] Dokumentacja przekazana zespołowi
- [ ] Harmonogram rotacji Client Secret ustawiony (co 24 miesiące)
- [ ] Monitorowanie Application Insights skonfigurowane
- [ ] Alerty w Azure Monitor ustawione (opcjonalnie)
- [ ] Backup środowiska Dataverse skonfigurowany
- [ ] Procesy Power Automate monitorowane

---

## Podpisy

| Rola | Osoba | Data | Status |
|------|-------|------|--------|
| Wdrożenie Azure | | | |
| Wdrożenie Power Platform | | | |
| Konfiguracja bezpieczeństwa | | | |
| Weryfikacja końcowa | | | |
| Odbiór klienta | | | |
