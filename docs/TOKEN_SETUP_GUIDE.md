# Przewodnik konfiguracji tokenów KSeF

## Problem

Aplikacja wyświetlała status "missing" dla tokenów KSeF mimo że zostały dodane do Azure Key Vault. Dodatkowo niemożliwe było usuwanie firm gdy były aktualnie wybrane. Brakowało też narzędzi diagnostycznych do sprawdzania połączenia z Key Vault i KSeF.

## Rozwiązanie

### 1. Implementacja sprawdzania tokenów

Backend został zaktualizowany aby:
- Sprawdzał istnienie tokenów w Key Vault podczas pobierania listy firm
- Obliczał status tokenu (`valid`, `expiring`, `expired`, `missing`)
- Zwracał pole `tokenStatus` w odpowiedzi API

### 2. Narzędzia diagnostyczne

Dodano trzy nowe narzędzia diagnostyczne:

#### A. Test Token Button (Przycisk testowania tokenu)
- Znajduje się przy każdej firmie w tabeli (ikona probówki 🧪)
- Sprawdza:
  - Czy token istnieje w Key Vault
  - Czy można go odczytać (uprawnienia)
  - Czy KSeF API jest osiągalne
- Wyświetla szczegółowy wynik testu

#### B. System Status Panel (Panel statusu systemu)
- Nowa zakładka "System Status" w Settings
- Pokazuje status wszystkich serwisów:
  - ✅ Azure Key Vault
  - ✅ Microsoft Dataverse
  - ✅ KSeF API (wszystkie środowiska)
- Automatyczne odświeżanie co 30 sekund
- Przycisk ręcznego odświeżenia

#### C. Status Badge (Wskaźnik statusu w nagłówku)
- Mały badge w prawym górnym rogu aplikacji
- 🟢 **All Systems** - wszystko działa
- 🟡 **Degraded** - częściowe problemy
- 🔴 **Issues** - błędy krytyczne
- Tooltip ze szczegółami każdego serwisu

### 2. Format nazwy sekretu w Key Vault

Token dla każdej firmy musi być zapisany w Key Vault z nazwą w formacie:
```
ksef-token-{NIP}
```

Przykłady:
- Dla NIP `5272976789` → `ksef-token-5272976789`
- Dla NIP `1234567890` → `ksef-token-1234567890`

### 3. Testowanie połączenia z tokenem

#### Szybki test przy firmie
1. Przejdź do **Settings** → **Companies**
2. Znajdź firmę dla której chcesz przetestować token
3. Kliknij ikonę probówki 🧪 (**Test Token**)
4. Poczekaj na wynik testu:
   - ✅ **Success**: Token działa, KSeF API osiągalne
   - ❌ **Failed**: Szczegóły błędu w notyfikacji

#### Pełny status systemu
1. Przejdź do **Settings** → **System Status**
2. Sprawdź status wszystkich serwisów:
   - **Azure Key Vault**: Połączenie i ilość tokenów
   - **Microsoft Dataverse**: Połączenie z bazą danych
   - **KSeF API**: Status wszystkich środowisk (test/demo/prod)
3. Kliknij **Refresh** aby odświeżyć status
4. Sprawdź szczegóły każdego serwisu (czas odpowiedzi, błędy)

#### Status badge w nagłówku
- Znajdź badge w prawym górnym rogu aplikacji
- Najedź kursorem aby zobaczyć szczegóły
- Kliknij aby przejść do szczegółowego widoku (wkrótce)

### 4. Dodawanie tokenu do Key Vault

#### Metoda 1: Azure Portal

1. Zaloguj się do [Azure Portal](https://portal.azure.com)
2. Znajdź Key Vault (np. `YOUR_KEYVAULT`)
3. Przejdź do **Secrets**
4. Kliknij **+ Generate/Import**
5. Wypełnij:
   - **Name**: `ksef-token-{NIP}` (np. `ksef-token-5272976789`)
   - **Secret value**: wklej token z portalu KSeF
   - **Content type**: `text/plain` (opcjonalnie)
   - **Expiration date**: ustaw zgodnie z datą wygaśnięcia tokenu w KSeF
6. Kliknij **Create**

#### Metoda 2: Azure CLI

```bash
az keyvault secret set \
  --vault-name YOUR_KEYVAULT \
  --name ksef-token-5272976789 \
  --value "TUTAJ_WKLEJ_TOKEN_Z_KSEF"
```

### 4. Uzyskanie tokenu z portalu KSeF

1. Zaloguj się do odpowiedniego środowiska KSeF:
   - **Produkcja**: https://ksef.mf.gov.pl/
   - **Demo**: https://ksef-demo.mf.gov.pl/
   - **Test**: https://ksef-test.mf.gov.pl/

2. Przejdź do sekcji zarządzania tokenami
3. Wygeneruj nowy token z uprawnieniami:
   - `INVOICE_READ` - do odczytu faktur zakupowych
   - (opcjonalnie inne uprawnienia według potrzeb)
4. Skopiuj wygenerowany token

### 5. Konfiguracja w aplikacji

1. Zaloguj się do aplikacji dvlp-ksef
2. Przejdź do **Settings** → **Companies**
3. Dodaj firmę (jeśli jeszcze nie istnieje):
   - **Company Name**: Nazwa firmy
   - **NIP**: 10-cyfrowy NIP (np. `5272976789`)
   - **KSeF Environment**: wybierz środowisko (production/test/demo)
   - **Auto Sync**: czy automatycznie synchronizować faktury
4. Po dodaniu tokenu do Key Vault, odśwież stronę
5. W kolumnie **KSeF Token** powinien pojawić się status:
   - ✅ **Valid** - token aktywny i ważny
   - ⚠️ **Expiring Soon** - token wygasa w ciągu 7 dni
   - ❌ **Expired** - token wygasł
   - ⚠️ **Missing** - token nie został znaleziony w Key Vault

### 6. Usuwanie firm

Po aktualizacji możliwe jest usuwanie dowolnej firmy (również aktualnie wybranej):
- Usunięcie jest **soft delete** - firma zostaje oznaczona jako nieaktywna (`isActive = false`)
- Firma nie zostaje fizycznie usunięta z bazy danych
- W razie potrzeby można ją reaktywować przez aktualizację rekordu w Dataverse

### 7. Rozwiązywanie problemów

#### Token pokazuje status "missing" mimo dodania do Key Vault

1. **Użyj przycisku Test Token** - kliknij 🧪 przy firmie
2. Sprawdź szczegółowy komunikat błędu:
   - "Token not found" → Zła nazwa sekretu w KV
   - "Key Vault connection failed" → Problem z uprawnieniami lub konfiguracją
   - "KSeF API unreachable" → Problem sieciowy lub KSeF offline

3. Sprawdź nazwę sekretu w Key Vault - musi być `ksef-token-{NIP}`
4. Sprawdź uprawnienia - Azure Functions musi mieć rolę **Key Vault Secrets User**
5. Sprawdź zmienną środowiskową `AZURE_KEYVAULT_URL` w API

#### Błąd przy próbie usunięcia firmy

1. Sprawdź czy masz rolę **Admin** w aplikacji
2. Sprawdź logi API - powinny pokazać szczegóły błędu
3. Użyj **System Status** panel aby sprawdzić połączenie z Dataverse

#### Token nie pobiera się przy synchronizacji

1. Sprawdź czy wybrana firma ma ustawioną wartość `keyVaultSecretName`
2. Jeśli pole jest puste, domyślnie używana jest nazwa `ksef-token-{NIP}`
3. Możesz ręcznie ustawić niestandardową nazwę sekretu przez edycję firmy

#### System Status pokazuje "unhealthy" dla Key Vault

1. Sprawdź zmienną `AZURE_KEYVAULT_URL` w API
2. Upewnij się że Azure Functions ma Managed Identity włączoną
3. Sprawdź RBAC - przypisz rolę **Key Vault Secrets User**
4. Użyj Azure CLI: `az keyvault secret list --vault-name <nazwa-kv>`

#### KSeF API pokazuje "unhealthy"

1. To może być normalne jeśli środowisko KSeF jest w konserwacji
2. Sprawdź czy wybrane środowisko (test/demo/prod) jest aktywne
3. Sprawdź połączenie sieciowe - czy API może dotrzeć do mf.gov.pl
4. Zweryfikuj na stronie KSeF czy serwis działa

## Zmiany techniczne

### Pliki zmodyfikowane:

#### Backend (API)

1. **api/src/lib/dataverse/mappers.ts**
   - Dodane pole `tokenStatus` do interfejsu `AppSetting`

2. **api/src/lib/dataverse/services/setting-service.ts**
   - Dodana metoda `checkTokenStatus()` sprawdzająca token w Key Vault
   - Zaktualizowane metody `getAll()` i `getById()` aby zwracały status tokenu

3. **api/src/functions/settings-test-token.ts** ✨ NOWY
   - Endpoint `POST /api/settings/:id/test-token`
   - Testuje istnienie tokenu, połączenie z KV i KSeF API
   - Zwraca szczegółowe informacje diagnostyczne

4. **api/src/functions/health-detailed.ts** ✨ NOWY
   - Endpoint `GET /api/health/detailed`
   - Sprawdza status Key Vault, Dataverse, KSeF API
   - Mierzy czas odpowiedzi każdego serwisu
   - Zwraca agregowane statystyki

#### Frontend (Web)

1. **web/src/lib/api.ts**
   - Dodane typy: `TokenTestResult`, `DetailedHealthResponse`, `ServiceStatus`
   - Nowe endpointy: `healthDetailed()`, `settings.testToken()`

2. **web/src/hooks/use-api.ts**
   - Nowy hook: `useHealthDetailed()` z auto-refresh co 30s
   - Nowy hook: `useTestToken()` do testowania tokenów firm

3. **web/src/app/[locale]/settings/page.tsx**
   - Dodany przycisk Test Token (🧪) przy każdej firmie
   - Funkcja `testToken()` z wyświetlaniem wyników
   - Nowa zakładka "System Status"
   - Import `HealthStatusPanel` component
   - Usunięta blokada usuwania aktualnie wybranej firmy

4. **web/src/components/health/health-status-panel.tsx** ✨ NOWY
   - Kompletny panel statusu systemu
   - Wyświetla status wszystkich serwisów z kolorami
   - Szczegóły każdego serwisu (response time, errors)
   - Przycisk odświeżania
   - Statystyki sumaryczne

5. **web/src/components/health/system-status-badge.tsx** ✨ NOWY
   - Mini badge w nagłówku aplikacji
   - Pokazuje ogólny status systemu
   - Tooltip ze szczegółami wszystkich serwisów
   - Auto-refresh co 30 sekund

6. **web/src/components/layout/header.tsx**
   - Dodany `SystemStatusBadge` component
   - Wyświetlany tylko dla zalogowanych użytkowników

### Testy

Wszystkie testy przeszły pomyślnie:
```
✓ tests/config.test.ts (13)
✓ tests/entities.test.ts (13)
✓ tests/parser.test.ts (11)

Test Files  3 passed (3)
Tests  37 passed (37)
```

## Najlepsze praktyki

1. **Bezpieczeństwo**:
   - Nigdy nie przechowuj tokenów KSeF w kodzie źródłowym
   - Używaj tylko Azure Key Vault do przechowywania tokenów
   - Regularnie rotuj tokeny (co 6-12 miesięcy)

2. **Monitorowanie**:
   - Sprawdzaj regularnie daty wygaśnięcia tokenów
   - Aplikacja wyświetla ostrzeżenie 7 dni przed wygaśnięciem
   - Ustaw przypomnienia w kalendarzu na miesiąc przed wygaśnięciem

3. **Backup**:
   - Przechowuj backup tokenów w bezpiecznym miejscu
   - Dokumentuj proces generowania nowych tokenów
   - Miej plan awaryjny na wypadek utraty dostępu do KSeF

4. **Środowiska**:
   - Używaj osobnych tokenów dla test/demo/production
   - Nie używaj tokenów produkcyjnych w środowisku testowym
   - Testuj przepływ z tokenami w środowisku demo przed produkcją
