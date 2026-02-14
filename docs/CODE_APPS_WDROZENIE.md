# Code Apps — Instrukcja Wdrożenia

Procedura wdrożenia **KSeF Copilot** jako Power Apps Code App.

Code Apps pozwalają opublikować aplikację Vite + React SPA bezpośrednio w Power Platform jako samodzielną aplikację — widoczną w `make.powerapps.com`, udostępnianą jak canvas apps i zarządzaną w ramach solucji.

> **Dokumentacja**: [Power Apps Code Apps](https://learn.microsoft.com/en-us/power-apps/developer/code-apps/overview)

---

## Wymagania wstępne

### 1. Włączenie Code Apps w środowisku

1. Przejdź do [Power Platform Admin Center](https://admin.powerplatform.microsoft.com/)
2. **Zarządzaj** → **Środowiska** → wybierz swoje środowisko
3. **Ustawienia** → **Produkt** → **Funkcje**
4. Przełącz **Power Apps code apps** → **Włączone**
5. Kliknij **Zapisz**

### 2. Licencja

Użytkownicy uruchamiający code apps potrzebują licencji **Power Apps Premium**.

### 3. Instalacja PAC CLI

```powershell
winget install Microsoft.PowerAppsCLI
```

Po instalacji zrestartuj terminal i zweryfikuj:

```powershell
pac --version
```

### 4. Instalacja zależności projektu

```powershell
cd code-app
pnpm install
```

---

## Konfiguracja jednorazowa

### Uwierzytelnienie i wybór środowiska

```powershell
pac auth create
pac env select --environment <ID-lub-URL-środowiska>
```

Zaloguj się kontem Power Platform gdy pojawi się monit. ID środowiska znajdziesz w Admin Center lub użyj URL środowiska (np. `https://orgXXXXXXXX.crm4.dynamics.com`).

Weryfikacja połączenia:

```powershell
pac auth list
pac env who
```

### Inicjalizacja Code App

```powershell
pac code init --displayname "KSeF Copilot"
```

To tworzy plik `power.config.json` w katalogu głównym projektu. **Nie modyfikuj tego pliku ręcznie** — jest zarządzany przez PAC CLI i Power Apps SDK.

> Opcjonalne parametry:
> - `--description "Integracja KSeF i zarządzanie fakturami"`
> - `--logoPath ./public/logo.png`
> - `--buildPath dist` (domyślnie katalog wyjściowy Vite)

---

## Wdrożenie

### Budowanie i publikacja (jedno polecenie)

```powershell
pnpm run build | pac code push
```

Aby wdrożyć do **konkretnej solucji**:

```powershell
pnpm run build | pac code push --solutionName "KSeF"
```

Po udanym wdrożeniu CLI zwraca URL Power Apps, pod którym można uruchomić aplikację.

### Weryfikacja wdrożenia

```powershell
pac code list
```

Lub otwórz [Power Apps](https://make.powerapps.com/) → **Aplikacje** — aplikacja pojawi się jako samodzielna.

---

## Aktualizacja (kolejne wdrożenia)

Za każdym razem gdy chcesz opublikować nową wersję:

```powershell
pnpm run build | pac code push
```

To samo polecenie obsługuje zarówno pierwszą publikację, jak i aktualizacje.

---

## Dodanie do solucji (ALM)

Jeśli użyłeś `--solutionName` podczas push, aplikacja jest już w tej solucji.

Weryfikacja:

1. Przejdź do [make.powerapps.com](https://make.powerapps.com/)
2. **Rozwiązania** → otwórz swoją solucję
3. Code app powinna być widoczna w sekcji **Aplikacje**

Aplikacja podróżuje z solucją podczas eksportu/importu między środowiskami.

---

## Źródła danych (opcjonalne)

Code Apps mogą korzystać z konektorów Power Platform bezpośrednio z JavaScript. Aby dodać źródło danych:

```powershell
# Lista dostępnych tabel
pac code list-tables --apiId shared_commondataserviceforapps

# Dodaj Dataverse jako źródło danych
pac code add-data-source --apiId shared_commondataserviceforapps
```

> **Uwaga**: KSeF Copilot łączy się obecnie z własnym API Azure Functions (`VITE_API_BASE_URL`), więc konektory Power Platform są opcjonalne. Możesz je dodać później, aby połączyć się bezpośrednio z tabelami Dataverse (np. `dvlp_ksefsetting`, `dvlp_ksefsession`).

---

## Lokalne testowanie z konektorami

Aby testować połączenia Power Platform lokalnie:

```powershell
# Terminal 1: Uruchom proxy dla połączeń
pac code run

# Terminal 2: Uruchom serwer deweloperski
pnpm run dev
```

Otwórz URL **Local Play** wyświetlony przez `pac code run` (w tym samym profilu przeglądarki co Twój tenant Power Platform).

---

## Architektura

```
code-app/
├── src/                    # Kod źródłowy aplikacji React
├── dist/                   # Wynik budowania (uploadowany przez pac code push)
├── power.config.json       # Generowany przez pac code init (metadane SDK + CLI)
├── vite.config.ts          # Zawiera plugin powerApps()
├── package.json            # Zawiera SDK @microsoft/power-apps
└── CODE_APPS_DEPLOYMENT.md # Instrukcja wdrożenia (EN)
```

| Komponent | Przeznaczenie |
|---|---|
| `@microsoft/power-apps` | SDK — API do konektorów, uwierzytelniania, integracji z platformą |
| `@microsoft/power-apps-vite` | Plugin Vite — `powerApps()` w vite.config.ts |
| `power.config.json` | Metadane — ID aplikacji, połączenia, powiązanie ze środowiskiem |
| `pac code push` | CLI — publikuje wynik budowania do Power Platform |

---

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| `pac: command not found` | Zainstaluj: `winget install Microsoft.PowerAppsCLI`, zrestartuj terminal |
| `Code apps are not enabled` | Włącz w Admin Center → Ustawienia → Funkcje |
| `pac code push` nie działa | Sprawdź `pac auth list` — upewnij się o aktywnym profilu auth |
| Budowanie zbyt duże (ostrzeżenie >5 MB) | Rozważ code-splitting z dynamicznymi importami |
| Konektory nie działają lokalnie | Użyj `pac code run` jako lokalnego proxy |
| Aplikacja niewidoczna w Power Apps | Sprawdź wybór środowiska: `pac env who` |

---

## Zmienne środowiskowe

Aplikacja korzysta z tych zmiennych (ustawianych w `.env` lub `.env.production`):

| Zmienna | Opis |
|---|---|
| `VITE_API_BASE_URL` | URL API Azure Functions |
| `VITE_AZURE_CLIENT_ID` | Client ID rejestracji Entra ID |
| `VITE_AZURE_TENANT_ID` | Tenant ID Entra ID |
| `VITE_API_SCOPE` | Zakres API do pozyskiwania tokenu |
| `VITE_ADMIN_GROUP` | ID grupy roli Admin (opcjonalne) |
| `VITE_USER_GROUP` | ID grupy roli User (opcjonalne) |

> **Ważne**: Gdy aplikacja działa jako Code App, uwierzytelnianie jest zarządzane przez hosta Power Apps. Konfiguracja MSAL jest używana tylko w trybie standalone/lokalnym.
