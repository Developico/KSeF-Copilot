# Specyfikacja pól AI dla Dataverse - dvlp_ksefinvoice

> Pola do dodania w tabeli `dvlp_ksefinvoice` dla obsługi kategoryzacji AI

## Spis treści

1. [Przegląd](#przegląd)
2. [Nowe atrybuty](#nowe-atrybuty)
3. [Nowy Option Set](#nowy-option-set)
4. [Konfiguracja pól w Dataverse](#konfiguracja-pól-w-dataverse)
5. [Aktualizacja formularza](#aktualizacja-formularza)
6. [Instrukcja wdrożenia](#instrukcja-wdrożenia)
7. [Zmiany w kodzie po wdrożeniu](#zmiany-w-kodzie-po-wdrożeniu)

---

## Przegląd

### Cel

Dodanie 5 nowych pól do tabeli `dvlp_ksefinvoice` umożliwiających:
- Przechowywanie sugestii AI dotyczących kategoryzacji
- Śledzenie pewności modelu AI
- Zapisywanie opisu wygenerowanego przez AI
- Audyt kiedy AI przetworzyło fakturę

### Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                    dvlp_ksefinvoice                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ISTNIEJĄCE POLA KATEGORYZACJI:                                 │
│  ├── dvlp_category (String) - finalna kategoria                 │
│  └── dvlp_costcenter (OptionSet) - finalne MPK                  │
│                                                                  │
│  NOWE POLA AI (do dodania):                                     │
│  ├── dvlp_aimpksuggestion (OptionSet) - sugestia MPK od AI      │
│  ├── dvlp_aicategorysuggestion (String) - sugestia kategorii    │
│  ├── dvlp_aidescription (String) - opis wygenerowany przez AI   │
│  ├── dvlp_airationale (String) - uzasadnienie decyzji AI        │
│  ├── dvlp_aiconfidence (Decimal) - pewność AI (0.0-1.0)         │
│  └── dvlp_aiprocessedat (DateTime) - kiedy AI przetworzyło      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Nowe atrybuty

### Tabela szczegółowa

| # | Nazwa logiczna | Nazwa wyświetlana (EN) | Nazwa wyświetlana (PL) | Typ | Wymagane | Opis |
|---|----------------|------------------------|------------------------|-----|----------|------|
| 1 | `dvlp_aimpksuggestion` | AI MPK Suggestion | Sugestia MPK (AI) | OptionSet (dvlp_costcenter) | ❌ | MPK zasugerowane przez AI |
| 2 | `dvlp_aicategorysuggestion` | AI Category Suggestion | Sugestia kategorii (AI) | String(100) | ❌ | Kategoria zasugerowana przez AI |
| 3 | `dvlp_aidescription` | AI Description | Opis (AI) | String(500) | ❌ | Krótki opis faktury wygenerowany przez AI |
| 4 | `dvlp_airationale` | AI Rationale | Uzasadnienie (AI) | String(500) | ❌ | Uzasadnienie decyzji kategoryzacji AI |
| 5 | `dvlp_aiconfidence` | AI Confidence | Pewność AI | Decimal(3,2) | ❌ | Poziom pewności AI (0.00-1.00) |
| 6 | `dvlp_aiprocessedat` | AI Processed At | Przetworzono przez AI | DateTime | ❌ | Timestamp kiedy AI przetworzyło fakturę |

---

## Nowy Option Set

### dvlp_costcenter (jeśli nie istnieje)

**Nazwa wyświetlana:** MPK / Cost Center  
**Typ:** Global OptionSet  
**Opis:** Miejsca Powstawania Kosztów dla kategoryzacji

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000001 | Consultants | Konsultanci | Usługi konsultingowe, szkolenia, outsourcing |
| 100000002 | BackOffice | Back Office | Biuro, administracja, sprzątanie |
| 100000003 | Management | Zarząd | Zarząd, strategia, reprezentacja |
| 100000004 | Cars | Samochody | Pojazdy, paliwo, serwis, ubezpieczenia |
| 100000005 | Legal | Prawne | Usługi prawne, notarialne, compliance |
| 100000006 | Marketing | Marketing | Reklama, promocja, eventy |
| 100000007 | Sales | Sprzedaż | Sprzedaż, CRM, lead generation |
| 100000008 | Delivery | Realizacja | Projekty, narzędzia developerskie |
| 100000009 | Finance | Finanse | Księgowość, audyt, bankowość |
| 100000010 | Other | Inne | Wszystko inne |

---

## Konfiguracja pól w Dataverse

### 1. dvlp_aimpksuggestion

```yaml
Display Name: AI MPK Suggestion / Sugestia MPK (AI)
Schema Name: dvlp_aimpksuggestion
Data Type: Choice (OptionSet)
Option Set: dvlp_costcenter (use existing or create new)
Required: No
Searchable: Yes
Description: MPK suggested by AI categorization. User can accept or override.
Audit: Yes
```

### 2. dvlp_aicategorysuggestion

```yaml
Display Name: AI Category Suggestion / Sugestia kategorii (AI)
Schema Name: dvlp_aicategorysuggestion
Data Type: Single Line of Text
Format: Text
Max Length: 100
Required: No
Searchable: Yes
Description: Cost category suggested by AI. Examples: "Licencje software", "Usługi hostingowe"
Audit: Yes
```

### 3. dvlp_aidescription

```yaml
Display Name: AI Description / Opis (AI)
Schema Name: dvlp_aidescription
Data Type: Single Line of Text
Format: Text Area
Max Length: 500
Required: No
Searchable: No
Description: Short description of the invoice generated by AI for easier identification.
Audit: No
```

### 4. dvlp_aiconfidence

```yaml
Display Name: AI Confidence / Pewność AI
Schema Name: dvlp_aiconfidence
Data Type: Decimal Number
Precision: 2
Minimum Value: 0
Maximum Value: 1
Required: No
Searchable: No
Description: AI model confidence score (0.00 = uncertain, 1.00 = very confident)
Audit: No
```

### 5. dvlp_aiprocessedat

```yaml
Display Name: AI Processed At / Przetworzono przez AI
Schema Name: dvlp_aiprocessedat
Data Type: Date and Time
Format: Date and Time
Behavior: User Local
Required: No
Searchable: No
Description: Timestamp when AI categorization was performed on this invoice.
Audit: No
```

---

## Aktualizacja formularza

### Nowa sekcja w formularzu głównym (Main Form)

Dodaj nową sekcję **"AI Categorization"** w zakładce **"Kategoryzacja"**:

```
┌─────────────────────────────────────────────────────────────────┐
│ TAB: Kategoryzacja                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SEKCJA: Ręczna kategoryzacja                                │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Kategoria           │ MPK                 │               │ │
│ │ │ [dvlp_category]     │ [dvlp_costcenter]   │               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ SEKCJA: Sugestie AI                          [Read-only]    │ │
│ │ ┌─────────────────────┬─────────────────────┐               │ │
│ │ │ Sugestia kategorii  │ Sugestia MPK        │               │ │
│ │ │ [dvlp_aicategory..] │ [dvlp_aimpksugge..] │               │ │
│ │ ├─────────────────────┴─────────────────────┤               │ │
│ │ │ Opis (AI)                                 │               │ │
│ │ │ [dvlp_aidescription]                      │               │ │
│ │ ├─────────────────────┬─────────────────────┤               │ │
│ │ │ Pewność AI          │ Przetworzono        │               │ │
│ │ │ [dvlp_aiconfidence] │ [dvlp_aiprocessed..]│               │ │
│ │ └─────────────────────┴─────────────────────┘               │ │
│ │                                                              │ │
│ │ [🤖 Uruchom kategoryzację AI] [✓ Akceptuj sugestię]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Business Rules

| Nazwa | Warunek | Akcja |
|-------|---------|-------|
| Lock AI fields | Always | Lock: `dvlp_aimpksuggestion`, `dvlp_aicategorysuggestion`, `dvlp_aidescription`, `dvlp_aiconfidence`, `dvlp_aiprocessedat` |
| Show AI confidence as % | `dvlp_aiconfidence != null` | Format as percentage in UI |

### Nowe widoki

| Nazwa | Filtr | Kolumny |
|-------|-------|---------|
| Faktury do kategoryzacji AI | `dvlp_aiprocessedat = null AND dvlp_category = null` | Numer, Sprzedawca, Brutto, Data |
| Skategoryzowane przez AI | `dvlp_aiprocessedat != null` | Numer, Sprzedawca, Sugestia MPK, Pewność AI |
| Niska pewność AI | `dvlp_aiconfidence < 0.7` | Numer, Sprzedawca, Sugestia, Pewność |

---

## Instrukcja wdrożenia

### Krok 1: Utwórz Option Set (jeśli nie istnieje)

1. Przejdź do **Power Apps** → **Solutions** → **dvlp-ksef**
2. Dodaj nowy **Choice** (Global OptionSet):
   - Name: `dvlp_costcenter`
   - Display Name: `Cost Center / MPK`
   - Dodaj wartości wg tabeli powyżej

### Krok 2: Dodaj pola do tabeli

1. Przejdź do tabeli **dvlp_ksefinvoice**
2. Kliknij **+ New column** dla każdego pola
3. Wypełnij wg konfiguracji powyżej
4. **Save** po każdym polu

### Krok 3: Zaktualizuj formularz

1. Otwórz główny formularz **Faktura KSeF**
2. Dodaj nową sekcję "Sugestie AI" w zakładce Kategoryzacja
3. Przeciągnij nowe pola do sekcji
4. Ustaw pola jako **Read-only**
5. **Save and Publish**

### Krok 4: Opublikuj zmiany

1. Kliknij **Publish all customizations**
2. Zweryfikuj w **Solutions** że wersja się zwiększyła

---

## Zmiany w kodzie po wdrożeniu

### 1. Aktualizacja config.ts

```typescript
// api/src/lib/dataverse/config.ts

// W sekcji invoice dodaj:
invoice: {
  // ... istniejące pola ...
  
  // AI Categorization fields
  aiMpkSuggestion: process.env.DV_FIELD_INVOICE_AI_MPK || 'dvlp_aimpksuggestion',
  aiCategorySuggestion: process.env.DV_FIELD_INVOICE_AI_CATEGORY || 'dvlp_aicategorysuggestion',
  aiDescription: process.env.DV_FIELD_INVOICE_AI_DESC || 'dvlp_aidescription',
  aiConfidence: process.env.DV_FIELD_INVOICE_AI_CONFIDENCE || 'dvlp_aiconfidence',
  aiProcessedAt: process.env.DV_FIELD_INVOICE_AI_PROCESSED || 'dvlp_aiprocessedat',
}
```

### 2. Aktualizacja mappers.ts

```typescript
// api/src/lib/dataverse/mappers.ts

// W mapDvInvoiceToApp - zamień undefined na prawdziwe mapowanie:
export function mapDvInvoiceToApp(raw: DvInvoice): Invoice {
  // ... istniejący kod ...
  
  // AI fields - zmień z undefined na:
  aiMpkSuggestion: mapDvCostCenterToMpk(raw[s.aiMpkSuggestion]),
  aiCategorySuggestion: raw[s.aiCategorySuggestion] as string | undefined,
  aiDescription: raw[s.aiDescription] as string | undefined,
  aiConfidence: raw[s.aiConfidence] as number | undefined,
  aiProcessedAt: raw[s.aiProcessedAt] as string | undefined,
}

// W mapAppInvoiceToDv - odkomentuj:
export function mapAppInvoiceToDv(app: Partial<Invoice>): Record<string, unknown> {
  // ... istniejący kod ...
  
  // AI fields
  if (app.aiMpkSuggestion !== undefined) payload[s.aiMpkSuggestion] = mapMpkToDvCostCenter(app.aiMpkSuggestion)
  if (app.aiCategorySuggestion !== undefined) payload[s.aiCategorySuggestion] = app.aiCategorySuggestion
  if (app.aiDescription !== undefined) payload[s.aiDescription] = app.aiDescription
  if (app.aiConfidence !== undefined) payload[s.aiConfidence] = app.aiConfidence
  if (app.aiProcessedAt !== undefined) payload[s.aiProcessedAt] = app.aiProcessedAt
}
```

### 3. Odkomentuj w ai-categorize.ts

```typescript
// api/src/functions/ai-categorize.ts

// Odkomentuj bloki zapisujące do Dataverse:
await invoiceService.update(invoiceId, {
  aiMpkSuggestion: categorization.mpk as MPK,
  aiCategorySuggestion: categorization.category,
  aiDescription: categorization.description,
  aiConfidence: categorization.confidence,
  aiProcessedAt: new Date().toISOString(),
})
```

---

## Mapowanie wartości OptionSet

### MPK enum → Dataverse OptionSet

| MPK (TypeScript) | Wartość Dataverse |
|------------------|-------------------|
| `Consultants` | 100000001 |
| `BackOffice` | 100000002 |
| `Management` | 100000003 |
| `Cars` | 100000004 |
| `Legal` | 100000005 |
| `Marketing` | 100000006 |
| `Sales` | 100000007 |
| `Delivery` | 100000008 |
| `Finance` | 100000009 |
| `Other` | 100000010 |

---

## Weryfikacja po wdrożeniu

### Checklist

- [ ] Option Set `dvlp_costcenter` utworzony z 10 wartościami
- [ ] Pole `dvlp_aimpksuggestion` dodane jako Choice
- [ ] Pole `dvlp_aicategorysuggestion` dodane jako Text(100)
- [ ] Pole `dvlp_aidescription` dodane jako Text(500)
- [ ] Pole `dvlp_airationale` dodane jako Text(500)
- [ ] Pole `dvlp_aiconfidence` dodane jako Decimal(3,2)
- [ ] Pole `dvlp_aiprocessedat` dodane jako DateTime
- [ ] Formularz zaktualizowany z sekcją "Sugestie AI"
- [ ] Widoki utworzone (do kategoryzacji, skategoryzowane, niska pewność)
- [ ] Customizations opublikowane
- [ ] Tabela `dvlp_aifeedback` utworzona (patrz sekcja poniżej)
- [ ] Kod zaktualizowany (config.ts, mappers.ts, ai-categorize.ts)
- [ ] Testy przeszły

---

## Tabela AI Feedback (dvlp_aifeedback)

### Cel

Tabela przechowuje historię interakcji użytkowników z sugestiami AI, umożliwiając:
- Śledzenie jak często użytkownicy akceptują/modyfikują sugestie
- Budowanie kontekstu dla promptów AI (few-shot learning)
- Poprawę jakości kategoryzacji w czasie

### Specyfikacja

**Nazwa wyświetlana:** AI Feedback / Feedback AI  
**Nazwa logiczna:** `dvlp_aifeedback`  
**Nazwa zestawu:** `dvlp_aifeedbacks`  
**Typ własności:** Organization

### Atrybuty

| # | Nazwa logiczna | Nazwa wyświetlana | Typ | Wymagane | Opis |
|---|----------------|-------------------|-----|----------|------|
| 1 | `dvlp_aifeedbackid` | ID | Uniqueidentifier | Auto | Klucz główny |
| 2 | `dvlp_name` | Nazwa | String(100) | Auto | Auto-generated: "{Dostawca} - {Data}" |
| 3 | `dvlp_invoiceid` | Faktura | Lookup (dvlp_ksefinvoice) | ✅ | Powiązanie z fakturą źródłową |
| 4 | `dvlp_tenantnip` | NIP Firmy | String(10) | ✅ | NIP firmy (tenant) |
| 5 | `dvlp_suppliernip` | NIP Dostawcy | String(15) | ✅ | NIP dostawcy |
| 6 | `dvlp_suppliername` | Nazwa Dostawcy | String(250) | ✅ | Nazwa dostawcy |
| 7 | `dvlp_invoicedescription` | Kontekst faktury | Memo(500) | ❌ | Fragment opisu faktury |
| 8 | `dvlp_aimpksuggestion` | Sugestia MPK (AI) | String(50) | ❌ | MPK zasugerowane przez AI |
| 9 | `dvlp_aicategorysuggestion` | Sugestia kategorii (AI) | String(100) | ❌ | Kategoria zasugerowana przez AI |
| 10 | `dvlp_aiconfidence` | Pewność AI | Decimal(3,2) | ❌ | Poziom pewności AI |
| 11 | `dvlp_usermpk` | Wybrane MPK | String(50) | ❌ | MPK wybrane przez użytkownika |
| 12 | `dvlp_usercategory` | Wybrana kategoria | String(100) | ❌ | Kategoria wybrana przez użytkownika |
| 13 | `dvlp_feedbacktype` | Typ feedbacku | OptionSet | ✅ | applied/modified/rejected |

### Option Set - dvlp_feedbacktype

| Wartość | Label (EN) | Label (PL) | Opis |
|---------|------------|------------|------|
| 100000000 | Applied | Zaakceptowano | Użytkownik zaakceptował sugestię AI bez zmian |
| 100000001 | Modified | Zmieniono | Użytkownik zmienił sugestię AI |
| 100000002 | Rejected | Odrzucono | Użytkownik odrzucił sugestię AI |

### Indeksy

| Nazwa | Atrybuty | Uzasadnienie |
|-------|----------|--------------|
| `IX_tenant_supplier` | `dvlp_tenantnip`, `dvlp_suppliernip` | Agregacja per dostawca dla uczenia |
| `IX_createdon` | `createdon` | Sortowanie chronologiczne |

### Jak działa uczenie

1. Użytkownik klika "Kategoryzuj z AI" → AI generuje sugestię
2. Użytkownik akceptuje lub modyfikuje sugestię
3. Przy zapisie faktury system tworzy rekord w `dvlp_aifeedback`
4. Przy kolejnej kategoryzacji tego samego dostawcy:
   - System pobiera historię z `dvlp_aifeedback`
   - Dodaje do promptu: "Dla dostawcy X użytkownicy zazwyczaj wybierają MPK=Y, Kategoria=Z"
   - AI bierze to pod uwagę przy kategoryzacji

---

## Szacowany czas wdrożenia

| Zadanie | Czas |
|---------|------|
| Utworzenie Option Set `dvlp_costcenter` | 5 min |
| Dodanie 6 pól AI w `dvlp_ksefinvoice` | 15 min |
| Aktualizacja formularza | 10 min |
| Utworzenie widoków | 10 min |
| **Utworzenie tabeli `dvlp_aifeedback`** | **15 min** |
| **Utworzenie Option Set `dvlp_feedbacktype`** | **5 min** |
| Publikacja | 2 min |
| Aktualizacja kodu | 15 min |
| Testy | 15 min |
| **RAZEM** | **~1h 30min** |
