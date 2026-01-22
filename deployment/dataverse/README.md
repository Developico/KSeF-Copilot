# Dataverse Solution - KSeF Integration

To rozwiązanie zawiera wszystkie komponenty Dataverse wymagane przez KSeF Integration.

## Struktura rozwiązania

```
solution/
├── Other/
│   ├── Customizations.xml    # Główny plik manifestu
│   └── Solution.xml          # Metadane rozwiązania
├── Entities/
│   ├── dvlp_ksefsession/     # Sesje KSeF
│   ├── dvlp_ksefsetting/     # Konfiguracja per firma
│   └── dvlp_invoice/         # Faktury (rozszerzenie)
└── OptionSets/
    └── dvlp_invoicestatus/   # Status faktury KSeF
```

## Tabele (Entities)

### dvlp_ksefsession
Sesje komunikacji z KSeF API.

| Pole | Typ | Opis |
|------|-----|------|
| dvlp_sessionid | String | ID sesji z KSeF |
| dvlp_nip | String | NIP firmy |
| dvlp_sessiontoken | String | Token sesji (encrypted) |
| dvlp_startedat | DateTime | Czas rozpoczęcia |
| dvlp_expiresat | DateTime | Czas wygaśnięcia |
| dvlp_status | OptionSet | active/expired/terminated |

### dvlp_ksefsetting
Konfiguracja KSeF per firma.

| Pole | Typ | Opis |
|------|-----|------|
| dvlp_nip | String (PK) | NIP firmy |
| dvlp_companyname | String | Nazwa firmy |
| dvlp_environment | OptionSet | test/demo/prod |
| dvlp_autosync | Boolean | Automatyczna synchronizacja |
| dvlp_syncinterval | Integer | Interwał sync (minuty) |
| dvlp_lastsyncat | DateTime | Ostatnia synchronizacja |
| dvlp_keyvaultsecretname | String | Nazwa secretu w Key Vault |

### dvlp_invoice (lub rozszerzenie istniejącej tabeli)
Faktury z informacjami KSeF.

| Pole | Typ | Opis |
|------|-----|------|
| dvlp_ksefreferenceNumber | String | Numer referencyjny KSeF |
| dvlp_ksefstatus | OptionSet | Rozszerzony status |
| dvlp_ksefsentat | DateTime | Czas wysłania do KSeF |
| dvlp_ksefupo | String | Urzędowe Poświadczenie Odbioru |
| dvlp_ksefrawxml | Memo | Surowy XML faktury |
| dvlp_direction | OptionSet | incoming/outgoing |

## Option Sets

### dvlp_ksefstatus
- 1: Draft (Szkic)
- 2: Pending (Oczekuje)
- 3: Sent (Wysłano)
- 4: Accepted (Zaakceptowano)
- 5: Rejected (Odrzucono)
- 6: Error (Błąd)

### dvlp_ksefdirection
- 1: Incoming (Przychodzące)
- 2: Outgoing (Wychodzące)

### dvlp_ksefenvironment
- 1: Test
- 2: Demo
- 3: Production

### dvlp_sessionstatus
- 1: Active (Aktywna)
- 2: Expired (Wygasła)
- 3: Terminated (Zakończona)

## Instalacja

### Managed Solution (Produkcja)

```powershell
pac solution import --path KSeF_1_0_0_0_managed.zip
```

### Unmanaged Solution (Development)

```powershell
pac solution import --path KSeF_1_0_0_0.zip
```

## Eksport rozwiązania

```powershell
# Eksport unmanaged
pac solution export --path ./KSeF_1_0_0_0.zip --name KSeF --overwrite

# Eksport managed
pac solution export --path ./KSeF_1_0_0_0_managed.zip --name KSeF --managed --overwrite
```

## Aktualizacja

Przy aktualizacji managed solution:

```powershell
pac solution import --path KSeF_1_1_0_0_managed.zip --upgrade
```

## Security Roles

Rozwiązanie definiuje dwie role:

### KSeF Admin
- Pełny CRUD na wszystkich tabelach KSeF
- Zarządzanie konfiguracją
- Zarządzanie sesjami

### KSeF Reader
- Odczyt faktur
- Odczyt statusów
- Brak możliwości modyfikacji
