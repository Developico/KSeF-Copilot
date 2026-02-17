# Power Platform — Artefakty wdrożeniowe

Ten katalog zawiera wszystkie komponenty Power Platform wymagane do wdrożenia rozwiązania KSeF Integration.

## Struktura

```
powerplatform/
├── README.md                 ← Ten plik
├── solution/                 # Plik solucji Power Platform (.zip)
│   └── README.md             # Instrukcja importu solucji
├── connector/                # Custom Connector (definicja OpenAPI)
│   ├── apiDefinition.swagger.json
│   └── README.md
└── flows/                    # Przykładowe procesy Power Automate
    └── README.md
```

## Zawartość solucji Power Platform

Plik solucji (`.zip`) w katalogu `solution/` zawiera:

| Komponent | Opis |
|-----------|------|
| **Tabele Dataverse** | `dvlp_ksefinvoice`, `dvlp_ksefsetting`, `dvlp_ksefsession`, `dvlp_ksefsynclog` |
| **Model-Driven App (MDA)** | Aplikacja administracyjna do zarządzania fakturami i ustawieniami |
| **Code Component (PCF)** | Aplikacja frontendowa (React/Vite) osadzona w Power Apps |
| **Custom Connector** | Konektor do API Azure Functions (KSeF Integration) |
| **Procesy Power Automate** | Przykładowe przepływy automatyzacji (sync, kategoryzacja AI, alerty) |
| **Security Roles** | Role bezpieczeństwa: KSeF Admin, KSeF Reader |
| **Option Sets** | Zestawy opcji: status faktury, kierunek, środowisko KSeF, status sesji |

## Kolejność wdrożenia

1. **Najpierw** wdroż infrastrukturę Azure (Functions, Key Vault) — patrz `deployment/README.md`
2. **Następnie** zaimportuj solucję Power Platform do docelowego środowiska
3. **Na koniec** skonfiguruj Connection References i włącz procesy Power Automate

## Wymagania

- Środowisko Power Platform z licencją Dataverse
- Rola **System Administrator** lub **System Customizer** w środowisku docelowym
- Power Platform CLI (`pac`) — [Instalacja](https://learn.microsoft.com/power-platform/developer/cli/introduction)
- Wdrożone API Azure Functions (Custom Connector wymaga działającego backendu)

## Wersje solucji

| Typ | Zastosowanie | Plik |
|-----|-------------|------|
| **Managed** | Środowiska produkcyjne i UAT | `*_managed.zip` |
| **Unmanaged** | Środowiska deweloperskie | `*.zip` (bez suffiksu `_managed`) |

> **Uwaga:** Na produkcji zawsze używaj wersji **managed**. Unmanaged solution służy wyłącznie do dalszego rozwoju.
