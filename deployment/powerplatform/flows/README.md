# Procesy Power Automate — KSeF Integration

## Przegląd

Solucja Power Platform zawiera przykładowe procesy Power Automate demonstrujące najczęstsze scenariusze automatyzacji z KSeF Integration API.

> **Uwaga:** Po imporcie solucji procesy mogą być wyłączone. Każdy proces wymaga skonfigurowania Connection References i ręcznego włączenia.

## Lista procesów

### 1. Codzienna synchronizacja faktur

| Parametr | Wartość |
|----------|---------|
| **Nazwa** | KSeF — Codzienny sync faktur |
| **Wyzwalacz** | Recurrence (codziennie o 6:00) |
| **Rola** | Admin |

**Opis:** Automatycznie synchronizuje faktury z KSeF dla wszystkich aktywnych firm. Po synchronizacji uruchamia kategoryzację AI dla nowo zaimportowanych faktur.

**Kroki:**
1. Pobranie listy aktywnych firm (`ListSettings`)
2. Dla każdej firmy: `StartKsefSession` → `StartSync` → `EndKsefSession`
3. Dla nowych faktur: `AICategorize`
4. Wysłanie podsumowania email / Teams

---

### 2. Alert o przeterminowanych fakturach

| Parametr | Wartość |
|----------|---------|
| **Nazwa** | KSeF — Alert przeterminowane |
| **Wyzwalacz** | Recurrence (co poniedziałek o 9:00) |
| **Rola** | Reader |

**Opis:** Sprawdza faktury z przekroczonym terminem płatności i wysyła powiadomienie na kanał Teams / email.

**Kroki:**
1. `ListInvoices` (filtr: `paymentStatus=pending`, `dueDate < today`)
2. Jeśli są przeterminowane: generuje tabelę HTML
3. Wysyła powiadomienie do zespołu księgowości

---

### 3. Weryfikacja nowego dostawcy

| Parametr | Wartość |
|----------|---------|
| **Nazwa** | KSeF — Weryfikacja dostawcy VAT |
| **Wyzwalacz** | Dataverse — gdy utworzono nową fakturę |
| **Rola** | Reader |

**Opis:** Przy każdej nowej fakturze automatycznie sprawdza dostawcę w rejestrze VAT (Biała Lista).

**Kroki:**
1. Wyzwalacz: nowy rekord w `dvlp_ksefinvoice`
2. `VatLookup` (NIP dostawcy)
3. Jeśli dostawca **nie jest czynnym** podatnikiem VAT → utwórz zadanie do weryfikacji
4. Jeśli OK → zaktualizuj opis faktury danymi z GUS

---

### 4. Kategoryzacja AI z zatwierdzeniem

| Parametr | Wartość |
|----------|---------|
| **Nazwa** | KSeF — Kategoryzacja AI (approval) |
| **Wyzwalacz** | Dataverse — gdy faktura ma `aiConfidence < 0.7` |
| **Rola** | Admin |

**Opis:** Dla faktur z niskim confidence AI wysyła prośbę o zatwierdzenie do managera.

**Kroki:**
1. Wyzwalacz: zmiana w `dvlp_ksefinvoice` (filtr: `aiConfidence < 0.7`)
2. Approval: "Zatwierdź kategoryzację AI: {invoiceNumber}, MPK: {aiMpkSuggestion}"
3. Jeśli zatwierdzono → `UpdateInvoice` (mpk = aiMpkSuggestion)
4. Jeśli odrzucono → utwórz zadanie do ręcznej kategoryzacji

---

### 5. Raport miesięczny

| Parametr | Wartość |
|----------|---------|
| **Nazwa** | KSeF — Raport miesięczny |
| **Wyzwalacz** | Recurrence (1. dzień miesiąca o 8:00) |
| **Rola** | Reader |

**Opis:** Generuje raport ze statystykami faktur za poprzedni miesiąc.

**Kroki:**
1. `GetDashboardStats` (okres: poprzedni miesiąc)
2. `GetForecastMonthly` (prognoza na kolejne 6 miesięcy)
3. Generuje plik Excel ze statystykami
4. Zapisuje do SharePoint
5. Wysyła email z załącznikiem

---

## Konfiguracja procesów po imporcie

### Krok 1: Connection References

Każdy proces korzysta z Connection References. Po imporcie solucji:

1. Otwórz **Solutions** → **DvlpKSeF**
2. Przejdź do **Connection References**
3. Dla każdego połączenia:
   - **KSeF API** → wybierz lub utwórz połączenie z Custom Connector
   - **Dataverse** → wybierz bieżące połączenie
   - **Office 365 Outlook** / **Teams** → zaloguj się

### Krok 2: Włączenie procesów

1. Otwórz **Solutions** → **DvlpKSeF** → **Cloud flows**
2. Dla każdego procesu: kliknij **...** → **Turn on**

### Krok 3: Dostosowanie

Każdy proces można dostosować do potrzeb organizacji:
- Zmienić harmonogram (Recurrence trigger)
- Dodać/zmienić odbiorców powiadomień
- Dostosować filtry (NIP firmy, środowisko)
- Zmienić kanał Teams / adres email

## Tworzenie własnych procesów

Custom Connector udostępnia pełne API — możesz tworzyć własne procesy korzystając z dowolnej akcji. Pełna lista dostępnych akcji → [`deployment/powerplatform/connector/README.md`](../connector/README.md)

### Przydatne wzorce

| Wzorzec | Opis |
|---------|------|
| **Scheduled sync** | Recurrence → StartSync → AI Categorize |
| **Event-driven** | Dataverse trigger → akcja API |
| **Approval flow** | Trigger → Approval → Update |
| **Report generation** | Recurrence → GetDashboardStats → Excel → SharePoint |
| **Alert/notification** | Trigger → warunek → Teams/Email |
