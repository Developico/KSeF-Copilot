# Solucja Power Platform — KSeF Integration

## Opis

Ten katalog jest przeznaczony na plik(i) `.zip` solucji Power Platform zawierającej wszystkie komponenty rozwiązania KSeF Integration.

> **Uwaga:** Plik solucji (`.zip`) zostanie dodany po wyeksportowaniu z środowiska deweloperskiego.

## Oczekiwana zawartość

```
solution/
├── README.md                              ← Ten plik
├── DvlpKSeF_1_0_0_0.zip                   # Unmanaged (dev)
└── DvlpKSeF_1_0_0_0_managed.zip           # Managed (prod/UAT)
```

## Komponenty w solucji

### Tabele Dataverse

| Tabela | Nazwa wyświetlana | Opis |
|--------|-------------------|------|
| `dvlp_ksefinvoice` | KSeF Invoice | Faktury — dane z KSeF + manualne |
| `dvlp_ksefsetting` | KSeF Setting | Konfiguracja per firma (NIP, środowisko, sync) |
| `dvlp_ksefsession` | KSeF Session | Sesje komunikacji z KSeF API |
| `dvlp_ksefsynclog` | KSeF Sync Log | Logi synchronizacji z KSeF |

Szczegółowy schemat tabel → patrz [`deployment/dataverse/README.md`](../dataverse/README.md)

### Aplikacja Model-Driven (MDA)

- **KSeF Admin App** — interfejs administracyjny do:
  - Przeglądania i edycji faktur
  - Zarządzania konfiguracją firm
  - Podglądu logów synchronizacji
  - Zarządzania sesjami KSeF

### Code Component (PCF / Code App)

- **KSeF Dashboard** — aplikacja frontendowa (React + Vite) osadzona jako Code Component:
  - Dashboard ze statystykami
  - Lista faktur z filtrami i wyszukiwaniem
  - Kategoryzacja AI (sugestie MPK i kategorii)
  - Prognoza wydatków
  - Synchronizacja z KSeF
  - Weryfikacja VAT (Biała Lista)

### Custom Connector

- **KSeF Integration Connector** — konektor do API Azure Functions
  - Definicja OpenAPI 2.0 z pełną listą akcji
  - Autentykacja OAuth 2.0 (Entra ID)
  - Szczegóły → [`deployment/powerplatform/connector/README.md`](../connector/README.md)

### Procesy Power Automate

Przykładowe przepływy automatyzacji — szczegóły w [`deployment/powerplatform/flows/README.md`](../flows/README.md)

### Role bezpieczeństwa

| Rola | Opis |
|------|------|
| **KSeF Admin** | Pełny CRUD na tabelach KSeF, zarządzanie konfiguracją, sync, kategoryzacja AI |
| **KSeF Reader** | Odczyt faktur, statystyki dashboard, lookup VAT — bez możliwości modyfikacji |

## Import solucji

### Przez Power Platform CLI

```powershell
# Zaloguj się do środowiska
pac auth create --environment "https://twoja-org.crm4.dynamics.com"

# Import managed (produkcja)
pac solution import --path DvlpKSeF_1_0_0_0_managed.zip

# Import unmanaged (development)
pac solution import --path DvlpKSeF_1_0_0_0.zip
```

### Przez Maker Portal

1. Przejdź do [make.powerapps.com](https://make.powerapps.com)
2. Wybierz docelowe środowisko
3. **Solutions** → **Import solution** → wybierz plik `.zip`
4. Postępuj zgodnie z kreatorem importu
5. Skonfiguruj **Connection References** (Custom Connector, Dataverse)

### Aktualizacja (upgrade)

```powershell
# Upgrade managed solution
pac solution import --path DvlpKSeF_1_1_0_0_managed.zip --upgrade
```

## Konfiguracja po imporcie

### 1. Connection References

Po imporcie solucji skonfiguruj referencje połączeń:

| Connection Reference | Typ | Konfiguracja |
|---------------------|-----|-------------|
| **KSeF API** | Custom Connector | Podaj dane OAuth (Client ID, Tenant ID) → zaloguj się |
| **Dataverse** | Dataverse | Automatycznie — użyj bieżącego użytkownika |

### 2. Włączenie procesów Power Automate

Po imporcie procesy Power Automate mogą być wyłączone. Dla każdego procesu:

1. Otwórz proces w edytorze Power Automate
2. Skonfiguruj połączenia (Connection References)
3. Włącz proces (**Turn on**)

### 3. Security Roles

Przypisz użytkownikom odpowiednie role w **Power Platform Admin Center**:
- **KSeF Admin** — administratorzy, osoby zarządzające fakturami
- **KSeF Reader** — osoby z dostępem tylko do odczytu

## Eksport solucji (dla deweloperów)

```powershell
# Eksport unmanaged
pac solution export --path DvlpKSeF_1_0_0_0.zip --name DvlpKSeF --overwrite

# Eksport managed
pac solution export --path DvlpKSeF_1_0_0_0_managed.zip --name DvlpKSeF --managed --overwrite
```

## Rozwiązywanie problemów

| Problem | Przyczyna | Rozwiązanie |
|---------|-----------|-------------|
| Import nie powiódł się | Brakujące zależności | Sprawdź czy Custom Connector jest dostępny |
| Connection Reference błąd | Brak autoryzacji | Skonfiguruj OAuth dla Custom Connector |
| MDA App nie wyświetla danych | Brak uprawnień | Przypisz rolę Security Role użytkownikowi |
| Code Component nie ładuje się | Brak pliku bundle | Sprawdź czy PCF jest poprawnie spakowany w solucji |
| Procesy Power Automate nie działają | Wyłączone po imporcie | Włącz ręcznie i skonfiguruj Connection References |
