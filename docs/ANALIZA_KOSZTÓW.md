# Analiza kosztów — KSeF PP Connector

> Dokument przygotowany: luty 2026  
> Wersja: 1.1  
> Ceny na podstawie cenników Microsoft/OpenAI (region: Poland Central / West Europe)

---

## Spis treści

1. [Podsumowanie](#1-podsumowanie)
2. [Azure — koszty zasobów](#2-azure--koszty-zasobów)
3. [Power Platform — licencje](#3-power-platform--licencje)
4. [Azure OpenAI — modele AI](#4-azure-openai--modele-ai)
5. [Scenariusze kosztowe](#5-scenariusze-kosztowe)
6. [Optymalizacja kosztów](#6-optymalizacja-kosztów)
7. [Podsumowanie miesięczne](#7-podsumowanie-miesięczne)

---

## 1. Podsumowanie

Rozwiązanie KSeF PP Connector składa się z trzech warstw kosztowych:

| Warstwa | Zakres | Szacunek miesięczny |
|---------|--------|---------------------|
| **Azure Infrastructure** | Functions, Storage, Key Vault, App Insights, Static Web App | ~30–120 PLN |
| **Power Platform** | Licencje premium (Custom Connector) | ~85–420 PLN/użytkownik |
| **Azure OpenAI** | Kategoryzacja faktur, ekstrakcja dokumentów | ~2–50 PLN |
| **Łącznie (5 użytkowników, mała firma)** | | **~500–900 PLN/mies.** |
| **Łącznie (20 użytkowników, średnia firma)** | | **~2 000–4 500 PLN/mies.** |

---

## 2. Azure — koszty zasobów

### 2.1 Infrastruktura rozwiązania

| Zasób | Typ/SKU | Rola |
|-------|---------|------|
| Function App | Y1 (Consumption) | Backend API |
| Storage Account | Standard_LRS | Magazyn Functions + dane |
| Key Vault | Standard | Sekrety (KSeF token, OpenAI keys) |
| Application Insights | Pay-per-use | Monitoring |
| Log Analytics | PerGB2018 | Logi i KQL |
| Static Web App | Free / Standard | Frontend (Next.js) |

### 2.2 Szacowane koszty miesięczne Azure

| Zasób | Jednostka | Cena | Darmowy tier | Szacunek (mała firma) | Szacunek (duża firma) |
|-------|-----------|------|--------------|----------------------|----------------------|
| **Azure Functions (Consumption Y1)** | | | | | |
| — Wykonania | 1M exec | 0,80 PLN | 1M/mies. za darmo | 0 PLN | ~1 PLN |
| — Czas wykonania (GB-s) | 400 000 GB-s | ~65 PLN | 400 000 GB-s za darmo | 0 PLN | ~10 PLN |
| **Storage Account** | | | | | |
| — Blob Storage | 1 GB/mies. | ~0,08 PLN | — | ~1 PLN | ~5 PLN |
| — Operacje (transactions) | 10 000 ops | ~0,02 PLN | — | ~1 PLN | ~3 PLN |
| — File Share (Functions) | 1 GB | ~0,25 PLN | — | ~3 PLN | ~10 PLN |
| **Key Vault** | | | | | |
| — Operacje secrets | 10 000 ops | ~0,12 PLN | — | ~1 PLN | ~5 PLN |
| **Application Insights** | | | | | |
| — Data ingestion | 1 GB | ~9,30 PLN | 5 GB/mies. za darmo | 0 PLN | ~15 PLN |
| **Log Analytics** | | | | | |
| — Data ingestion | 1 GB | ~9,30 PLN | 5 GB/mies. za darmo | (wliczone powyżej) | (wliczone powyżej) |
| **Static Web App** | | | | | |
| — Free tier | — | 0 PLN | Tak | 0 PLN | 0 PLN |
| — Standard tier (opcja) | miesiąc | ~36 PLN | — | — | ~36 PLN |
| **Azure OpenAI** | | | | zob. sekcja 4 | zob. sekcja 4 |
| **RAZEM Azure Infra** | | | | **~6–10 PLN** | **~50–85 PLN** |

> **Uwaga:** Przy niskim wolumenie (< 1M exec, < 5 GB ingestion) większość zasobów mieści się w darmowych tierach. Realne koszty Azure zaczynają być odczuwalne powyżej 100 000 faktur/miesiąc.

### 2.3 Azure Functions — szczegółowa kalkulacja

Consumption Plan (Y1) — model rozliczeniowy:

| Metryka | Darmowy limit / mies. | Cena za nadwyżkę |
|---------|----------------------|-------------------|
| Wykonania | 1 000 000 | ~0,80 PLN / mln |
| Czas (GB-s) | 400 000 GB-s | ~0,065 PLN / 1000 GB-s |
| Pamięć | 1,5 GB alokacji | — |

**Przykład:** 50 000 faktur/mies. × ~5 requestów/fakturę = ~250 000 exec → **w darmowym tierze**.  
Przy średnim czasie ~500ms i 256MB RAM: 250 000 × 0,5s × 0,25 GB = ~31 250 GB-s → **w darmowym tierze**.

---

## 3. Power Platform — licencje

### 3.1 Dlaczego potrzebne licencje premium?

KSeF Connector jest **Custom Connectorem** w Power Platform. Użycie Custom Connectorów wymaga licencji premium Power Platform.

### 3.2 Opcje licencjonowania

| Licencja | Cena / mies. (netto) | Zakres | Kiedy wybrać |
|----------|---------------------|--------|--------------|
| **Power Apps per user** | ~85 PLN (~$20) | Nieograniczone aplikacje Power Apps dla 1 użytkownika | Użytkownicy korzystający codziennie |
| **Power Automate per user** | ~65 PLN (~$15) | Nieograniczone flows dla 1 użytkownika | Tylko automatyzacje |
| **Power Apps per app** | ~22 PLN (~$5) / app / user | 1 konkretna aplikacja dla 1 użytkownika | Sporadyczni użytkownicy |
| **Power Automate per flow** | ~420 PLN (~$100) | 1 flow bez limitu użytkowników | Współdzielony flow (np. cykliczna sync) |

### 3.3 Rekomendacje

| Scenariusz | Rekomendacja | Koszt / mies. |
|------------|-------------|---------------|
| **1–3 użytkowników (mała firma)** | Power Apps per user | 85–255 PLN |
| **5–10 użytkowników (średnia)** | Power Apps per user | 425–850 PLN |
| **20+ użytkowników** | Power Apps per user + per app dla okazjonalnych | ~1 000–2 500 PLN |
| **Tylko automatyzacje** | Power Automate per flow (2–3 flows) | ~840–1 260 PLN |

> **Uwaga:** Licencje Power Platform mogą być już dostępne w ramach istniejących planów Microsoft 365 E3/E5 lub Dynamics 365. Warto sprawdzić posiadane licencje przed zakupem.

### 3.4 Dodatkowe koszty Power Platform

| Element | Cena | Darmowy limit |
|---------|------|---------------|
| Dataverse Storage (Database) | ~160 PLN/GB/mies. | 1 GB wliczone w licencję |
| Dataverse Storage (File) | ~8 PLN/GB/mies. | 2 GB wliczone |
| Dataverse Storage (Log) | ~40 PLN/GB/mies. | 2 GB wliczone |
| Power Automate API calls | — | 6 000 / 5 min (per flow) |
| Dataverse API requests | — | 20 000 / 24h (per user) |

**Szacunek Dataverse:** Przy 1 000 faktur/mies. × ~2 KB/fakturę = ~2 MB → mieści się w darmowym 1 GB.

---

## 4. Azure OpenAI — modele AI

### 4.1 Zastosowania AI w KSeF Connector

| Funkcja | Model (domyślny) | Tokeny wejściowe | Tokeny wyjściowe | Opis |
|---------|-------------------|-------------------|-------------------|------|
| **Kategoryzacja faktur** | gpt-4o-mini | ~500–800 | ~100–200 | MPK, kategoria, opis, confidence |
| **Ekstrakcja z PDF (tekst)** | gpt-4o-mini | ~2 000–4 000 | ~500–2 000 | Parsowanie danych z tekstu PDF |
| **Ekstrakcja z obrazu (Vision)** | gpt-4o-mini / gpt-4o | ~2 000–5 000* | ~500–2 000 | OCR + ekstrakcja z skanów |
| **Test połączenia** | gpt-4o-mini | ~10 | ~5 | Weryfikacja konfiguracji |

*Tokeny obrazu zależą od rozdzielczości (512×512 → ~765 tokens, 1024×1024 → ~2 900 tokens).

### 4.2 Cennik Azure OpenAI (region: Sweden Central / East US)

| Model | Input (1M tokenów) | Output (1M tokenów) | Uwagi |
|-------|---------------------|----------------------|-------|
| **gpt-4o-mini** (domyślny) | **~0,60 PLN** ($0.15) | **~2,40 PLN** ($0.60) | ✅ Rekomendowany — najlepszy stosunek cena/jakość |
| gpt-4o | ~10 PLN ($2.50) | ~40 PLN ($10.00) | Wyższa jakość, 15× droższy |
| gpt-4o (2024-11-20) | ~10 PLN ($2.50) | ~40 PLN ($10.00) | Najnowsza wersja |
| gpt-3.5-turbo | ~2 PLN ($0.50) | ~6 PLN ($1.50) | Przestarzały, niepolecany |
| gpt-4-turbo | ~40 PLN ($10.00) | ~120 PLN ($30.00) | Drogi, zastąpiony przez gpt-4o |

> **Przelicznik:** 1 USD ≈ 4,0 PLN (orientacyjny kurs).

### 4.3 Koszt per faktura

| Operacja | Model | Tokeny (in/out) | Koszt per fakturę (PLN) |
|----------|-------|-----------------|------------------------|
| **Kategoryzacja** | gpt-4o-mini | 700/150 | **~0,0008** |
| **Kategoryzacja** | gpt-4o | 700/150 | **~0,013** |
| **Ekstrakcja PDF** | gpt-4o-mini | 3 000/1 000 | **~0,004** |
| **Ekstrakcja PDF** | gpt-4o | 3 000/1 000 | **~0,070** |
| **Ekstrakcja Vision** | gpt-4o-mini | 3 500/1 000 | **~0,005** |
| **Ekstrakcja Vision** | gpt-4o | 3 500/1 000 | **~0,075** |

### 4.4 Porównanie modeli — koszt vs jakość

| Scenariusz (1 000 faktur/mies.) | gpt-4o-mini | gpt-4o | gpt-3.5-turbo |
|----------------------------------|-------------|--------|---------------|
| Kategoryzacja | ~0,80 PLN | ~13 PLN | ~2 PLN |
| + Ekstrakcja PDF (50%) | ~2,80 PLN | ~48 PLN | ~8 PLN |
| + Ekstrakcja Vision (20%) | ~3,80 PLN | ~63 PLN | ~12 PLN |
| **Łączny koszt AI** | **~3,80 PLN** | **~63 PLN** | **~12 PLN** |

| Cecha | gpt-4o-mini | gpt-4o | gpt-3.5-turbo |
|-------|-------------|--------|---------------|
| Jakość kategoryzacji PL | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Ekstrakcja danych z PDF | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Vision (skany) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ brak |
| Szybkość odpowiedzi | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Koszt | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ |

**Rekomendacja:** `gpt-4o-mini` — oferuje bardzo dobrą jakość dla polskich faktur przy minimalnym koszcie. Model `gpt-4o` warto rozważyć tylko dla ekstrakcji z trudnych skanów.

---

## 5. Scenariusze kosztowe

### 5.1 Mała firma (5 użytkowników, 200 faktur/mies.)

| Składnik | Koszt / mies. |
|----------|---------------|
| Azure Functions | 0 PLN (w darmowym tierze) |
| Storage Account | ~2 PLN |
| Key Vault | ~1 PLN |
| App Insights + Log Analytics | 0 PLN (< 5 GB ingestion) |
| Static Web App (Free) | 0 PLN |
| **Azure Infra łącznie** | **~3 PLN** |
| Azure OpenAI (gpt-4o-mini, kategoryzacja + ekstrakcja) | ~1 PLN |
| Power Apps per user × 5 | 425 PLN |
| Dataverse Storage | 0 PLN (w darmowym 1 GB) |
| **RAZEM** | **~430 PLN / mies.** |

### 5.2 Średnia firma (10 użytkowników, 2 000 faktur/mies.)

| Składnik | Koszt / mies. |
|----------|---------------|
| Azure Functions | 0 PLN (w darmowym tierze) |
| Storage Account | ~5 PLN |
| Key Vault | ~3 PLN |
| App Insights + Log Analytics | ~10 PLN |
| Static Web App (Standard) | 36 PLN |
| **Azure Infra łącznie** | **~54 PLN** |
| Azure OpenAI (gpt-4o-mini) | ~8 PLN |
| Power Apps per user × 10 | 850 PLN |
| Dataverse Storage | 0 PLN |
| **RAZEM** | **~910 PLN / mies.** |

### 5.3 Duża firma (50 użytkowników, 20 000 faktur/mies.)

| Składnik | Koszt / mies. |
|----------|---------------|
| Azure Functions | ~5 PLN |
| Storage Account | ~15 PLN |
| Key Vault | ~10 PLN |
| App Insights + Log Analytics | ~30 PLN |
| Static Web App (Standard) | 36 PLN |
| **Azure Infra łącznie** | **~96 PLN** |
| Azure OpenAI (gpt-4o-mini) | ~76 PLN |
| Azure OpenAI (gpt-4o, wariant) | ~1 260 PLN |
| Power Apps per user × 20 + per app × 30 | 2 360 PLN |
| Dataverse Storage (+1 GB) | ~160 PLN |
| **RAZEM (gpt-4o-mini)** | **~2 690 PLN / mies.** |
| **RAZEM (gpt-4o)** | **~3 880 PLN / mies.** |

### 5.4 Scenariusz enterprise (100+ użytkowników, 100 000 faktur/mies.)

| Składnik | Koszt / mies. |
|----------|---------------|
| Azure Functions | ~20 PLN |
| Storage Account | ~40 PLN |
| Key Vault | ~25 PLN |
| App Insights (z sampling) | ~50 PLN |
| Static Web App (Standard) | 36 PLN |
| **Azure Infra łącznie** | **~171 PLN** |
| Azure OpenAI (gpt-4o-mini) | ~380 PLN |
| Power Platform (licencje mieszane) | ~5 000–8 000 PLN |
| Dataverse Storage (+5 GB) | ~800 PLN |
| **RAZEM** | **~6 350–9 350 PLN / mies.** |

---

## 6. Optymalizacja kosztów

### 6.1 Azure Functions
- ✅ **Consumption Plan (Y1)** — optymalny dla < 1M exec/mies.
- ✅ Wyłączenie nadmiernego health probe
- 🔄 Rozważenie **Flex Consumption** dla przewidywalnych obciążeń

### 6.2 Application Insights
- ✅ Włączenie **sampling** (domyślne adaptive sampling od 100% do 0,1%)
- ✅ Ustawienie `retentionInDays: 30` (minimum)
- ✅ Wyłączenie `AppPerformanceCounters` jeśli niepotrzebne
- 🔄 Daily cap na ingestion (np. 1 GB/dzień)

### 6.3 Azure OpenAI
- ✅ **gpt-4o-mini** jako domyślny model — 15× tańszy niż gpt-4o
- ✅ Niski `max_tokens` (200 dla kategoryzacji)
- ✅ Cache wyników per dostawca (supplier cache w kodzie)
- ✅ Learning context — mniej tokenów na znanych dostawców
- 🔄 **Batch API** — 50% taniej za asynchroniczne przetwarzanie
- 🔄 **Provisioned Throughput** — dla stałego, dużego wolumenu

### 6.4 Power Platform
- ✅ Sprawdzenie istniejących licencji M365 E3/E5 / Dynamics 365
- ✅ Mix licencji — per user (aktywni) + per app (okazjonalni)
- ✅ Power Automate per flow dla współdzielonych procesów
- 🔄 Negocjacja wolumenowa z Microsoft (EA/CSP)

### 6.5 Storage
- ✅ Standard_LRS (wystarczający, brak potrzeby geo-replikacji)
- ✅ Lifecycle management — automatyczne usuwanie starych logów
- 🔄 Przeniesienie starych danych do Cool/Archive tier

---

## 7. Podsumowanie miesięczne

| Scenariusz | Azure Infra | OpenAI (4o-mini) | Power Platform | Dataverse | **RAZEM** |
|------------|-------------|------------------|----------------|-----------|-----------|
| **Mała (5 os., 200 fv)** | ~3 PLN | ~1 PLN | ~425 PLN | 0 PLN | **~430 PLN** |
| **Średnia (10 os., 2k fv)** | ~54 PLN | ~8 PLN | ~850 PLN | 0 PLN | **~910 PLN** |
| **Duża (50 os., 20k fv)** | ~96 PLN | ~76 PLN | ~2 360 PLN | ~160 PLN | **~2 690 PLN** |
| **Enterprise (100 os., 100k fv)** | ~171 PLN | ~380 PLN | ~5 000–8 000 PLN | ~800 PLN | **~6 350–9 350 PLN** |

### Kluczowe wnioski

1. **Power Platform stanowi 70–90% kosztów** — największa pozycja to licencje premium
2. **Azure infrastructure jest bardzo tania** — Consumption model + darmowe tiery pokrywają większość kosztów małej/średniej firmy
3. **Azure OpenAI z gpt-4o-mini jest praktycznie darmowy** — nawet 20 000 faktur/mies. to ~76 PLN
4. **Przesiadka na gpt-4o zwiększa koszty AI ~15×** — ale nadal <1 300 PLN/mies. dla 20k faktur
5. **Najważniejsza optymalizacja** — weryfikacja istniejących licencji Power Platform

---

## Załącznik A: Źródła cennikowe

- [Azure Functions Pricing](https://azure.microsoft.com/pricing/details/functions/)
- [Azure OpenAI Pricing](https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/)
- [Power Apps Pricing](https://www.microsoft.com/power-platform/products/power-apps/pricing)
- [Power Automate Pricing](https://www.microsoft.com/power-platform/products/power-automate/pricing)
- [Dataverse Storage Pricing](https://learn.microsoft.com/power-platform/admin/pricing-storage)
- [Application Insights Pricing](https://azure.microsoft.com/pricing/details/monitor/)
