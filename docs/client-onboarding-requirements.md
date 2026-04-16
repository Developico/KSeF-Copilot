# KSeF Copilot — Wymagania wdrożeniowe

| | |
|---|---|
| **Dokument** | Wymagania wdrożeniowe KSeF Copilot |
| **Wersja** | 1.0 |
| **Data** | _________________ |
| **Przygotował** | Developico Sp. z o.o. |
| **Klient** | _________________ |

---

## 1. Cel dokumentu

Niniejszy dokument zawiera zestawienie informacji, dostępów i decyzji biznesowych niezbędnych do wdrożenia systemu **KSeF Copilot** w organizacji Klienta.

> **Ważne:** Nie wszystkie informacje muszą być dostarczone od razu. Prosimy o zapoznanie się z wymaganiami, potwierdzenie ich zrozumienia i przygotowanie poszczególnych elementów zgodnie z harmonogramem wdrożenia (sekcja 17).

### Czym jest KSeF Copilot?

KSeF Copilot to platforma integracyjna z **Krajowym Systemem e-Faktur (KSeF)**, która umożliwia:

- Automatyczną synchronizację faktur zakupowych z KSeF
- Kategoryzację faktur do centrów kosztowych (MPK) — ręczną lub wspieraną przez AI
- Proces zatwierdzania faktur z monitoringiem SLA
- Śledzenie budżetów per MPK z alertami przy przekroczeniu progów
- Monitoring płatności (oczekujące, zapłacone, przeterminowane)
- Samofakturowanie (wystawianie faktur w imieniu dostawcy)
- Rejestrację dokumentów kosztowych (paragony, rachunki, noty)
- Raportowanie, prognozowanie wydatków i wykrywanie anomalii

### Słowniczek pojęć

| Pojęcie | Wyjaśnienie |
|---------|-------------|
| **KSeF** | Krajowy System e-Faktur — system Ministerstwa Finansów do elektronicznego obiegu faktur ustrukturyzowanych |
| **NIP** | Numer Identyfikacji Podatkowej — 10-cyfrowy identyfikator firmy |
| **MPK** | Miejsce Powstawania Kosztów — centrum kosztowe, do którego przypisywane są faktury (np. Marketing, Zarząd, IT) |
| **Token KSeF** | Klucz autoryzacyjny umożliwiający systemowi pobieranie faktur z KSeF w imieniu firmy |
| **Entra ID** | Usługa tożsamości Microsoft (dawniej Azure Active Directory) — zarządzanie kontami i uprawnieniami użytkowników |
| **Dataverse** | Baza danych Microsoft Power Platform — przechowuje wszystkie dane systemu (faktury, MPK, budżety, dostawców) |
| **Key Vault** | Sejf cyfrowy w chmurze Azure — bezpieczne, szyfrowane przechowywanie tokenów i kluczy dostępowych |
| **SLA** | Service Level Agreement — maksymalny czas na wykonanie zadania (np. zatwierdzenie faktury) |
| **Self-billing** | Samofakturowanie — proces wystawiania faktur zakupowych w imieniu dostawcy na podstawie umowy |

---

## 2. Dane firmy Klienta

| Pole | Wartość |
|------|---------|
| Nazwa firmy | *Do uzupełnienia* |
| NIP | *Do uzupełnienia* |
| REGON | *Do uzupełnienia* |
| Adres siedziby | *Do uzupełnienia* |

**Koordynator wdrożenia** — osoba kontaktowa po stronie Klienta do bieżących pytań wdrożeniowych:

| Pole | Wartość |
|------|---------|
| Imię i nazwisko | *Do uzupełnienia* |
| Email | *Do uzupełnienia* |
| Telefon | *Do uzupełnienia* |

**Osoba decyzyjna** — zatwierdzanie konfiguracji, budżetów i akceptacja kolejnych faz wdrożenia:

| Pole | Wartość |
|------|---------|
| Imię i nazwisko | *Do uzupełnienia* |
| Email | *Do uzupełnienia* |

---

## 3. Dostęp do KSeF *(wymagane)*

### Czym jest token KSeF?

Token autoryzacyjny KSeF to klucz cyfrowy, który umożliwia systemowi KSeF Copilot pobieranie faktur zakupowych z Krajowego Systemu e-Faktur w imieniu Państwa firmy. Token generuje się w portalu Ministerstwa Finansów.

### Środowiska KSeF

System KSeF udostępniany przez Ministerstwo Finansów oferuje trzy środowiska:

| Środowisko | Adres | Przeznaczenie |
|------------|-------|---------------|
| **Testowe** | ksef-test.mf.gov.pl | Konfiguracja techniczna i testy deweloperskie |
| **Demo** | ksef-demo.mf.gov.pl | Testy biznesowe z danymi zbliżonymi do produkcyjnych |
| **Produkcyjne** | ksef.mf.gov.pl | Praca z prawdziwymi fakturami |

**Pytanie do Klienta:** Z których środowisk KSeF chcą Państwo korzystać?

- [ ] **Testowe** — do konfiguracji i testów technicznych
- [ ] **Demo** — do testów akceptacyjnych (UAT) z użytkownikami
- [ ] **Produkcyjne** — do pracy z prawdziwymi fakturami

> **Sugestia Developico:** Rekomendujemy uruchomienie minimum dwóch środowisk — **Demo** (do testów i szkoleń) oraz **Produkcja** (do pracy operacyjnej). Środowisko Demo pozwala bezpiecznie testować zmiany konfiguracji i szkolić nowych użytkowników bez wpływu na dane produkcyjne.

> Każde wybrane środowisko wymaga odrębnego tokenu KSeF.

### Checklist

- [ ] Wybór środowisk KSeF (powyżej)
- [ ] Wygenerowany token autoryzacyjny KSeF dla każdego wybranego środowiska (lub gotowość do wygenerowania)
- [ ] Wskazanie osoby uprawnionej do generowania tokenów w portalu MF
- [ ] Potwierdzenie numeru NIP firmy do synchronizacji faktur

> **Bezpieczeństwo:** Token KSeF jest przechowywany w zaszyfrowanym sejfie Azure Key Vault. Nigdy nie jest zapisywany w formie jawnej ani przesyłany niezabezpieczonym kanałem.

---

## 4. Środowisko Microsoft / Azure *(wymagane)*

### 4a. Subskrypcja Azure

System KSeF Copilot będzie hostowany na subskrypcji Azure Klienta. Prosimy o udzielenie odpowiedzi na poniższe pytania:

**Pytanie 1: Czy posiadają Państwo subskrypcję Azure?**

- [ ] **Tak** — posiadamy aktywną subskrypcję Azure
- [ ] **Nie** — potrzebujemy pomocy w jej utworzeniu

> **Sugestia Developico:** Rekomendujemy utworzenie **dedykowanej subskrypcji** przeznaczonej wyłącznie dla systemu KSeF Copilot. Pozwala to na przejrzystą kontrolę kosztów, łatwiejsze zarządzanie uprawnieniami i czytelne rozliczenia bez mieszania z innymi projektami.

**Pytanie 2: Jaki model rozliczeniowy posiada subskrypcja?**

- [ ] **Pay-As-You-Go** — płatność za faktyczne zużycie zasobów
- [ ] **Enterprise Agreement (EA)** — umowa korporacyjna z Microsoft
- [ ] **CSP (Cloud Solution Provider)** — subskrypcja zarządzana przez partnera Microsoft
- [ ] **Inna / Nie wiem**: _________________

**Pytanie 3: Czy istnieją limity budżetowe na subskrypcji Azure?**

- [ ] **Tak** — miesięczny limit: _________________ PLN/EUR
- [ ] **Nie** — brak limitów
- [ ] **Nie wiem**

> Szacunkowy miesięczny koszt utrzymania systemu można znaleźć w dokumentacji kosztowej, którą dostarczymy osobno.

### Dostęp do subskrypcji — konto wdrożeniowe

Najszybszą i najbardziej efektywną metodą przeprowadzenia wdrożenia jest **udostępnienie zespołowi Developico konta z uprawnieniami administracyjnymi** do wybranej subskrypcji Azure. Konto to umożliwi nam:

- Utworzenie i konfigurację wszystkich niezbędnych zasobów (Functions, App Service, Key Vault, VNet, monitoring)
- Konfigurację rejestracji aplikacji i grup zabezpieczeń w Entra ID
- Konfigurację środowiska Dataverse
- Wdrożenie i weryfikację poprawności działania systemu

**Dobre praktyki bezpieczeństwa dla konta wdrożeniowego:**

| Praktyka | Opis |
|----------|------|
| 🔒 **Konto tymczasowe** | Konto jest potrzebne wyłącznie na czas wdrożenia (Fazy 1–3). Po zakończeniu wdrożenia można je dezaktywować lub usunąć |
| 🔑 **Zmiana hasła po wdrożeniu** | Po zakończeniu prac rekomendujemy zmianę hasła lub dezaktywację konta |
| 👤 **Dedykowane konto** | Zalecamy utworzenie dedykowanego konta wdrożeniowego (np. `ksef-deploy@firma.onmicrosoft.com`) zamiast udostępniania konta osobistego |
| 📋 **Audyt działań** | Wszystkie operacje wykonane na koncie są rejestrowane w logach Azure (Activity Log) — możliwa pełna weryfikacja działań |
| ⏰ **Ograniczenie czasowe** | Można ustawić datę wygaśnięcia konta lub uprawnień (np. 2 miesiące od rozpoczęcia wdrożenia) |
| 🛡️ **MFA** | Konto powinno mieć włączone uwierzytelnianie wieloskładnikowe (Multi-Factor Authentication) |

**Wymagane uprawnienia konta wdrożeniowego:**

| Zakres | Rola | Cel |
|--------|------|-----|
| Subskrypcja Azure | **Owner** lub **Contributor** + **User Access Administrator** | Tworzenie zasobów i przypisywanie ról RBAC |
| Entra ID (tenant) | **Application Administrator** | Tworzenie rejestracji aplikacji i grup zabezpieczeń |
| Power Platform | **System Administrator** (środowisko Dataverse) | Tworzenie tabel i konfiguracja Dataverse |

**Checklist:**

- [ ] Udostępnimy konto wdrożeniowe z wymaganymi uprawnieniami
- [ ] Konto wdrożeniowe: _________________ (email)
- [ ] Lub: preferujemy inny sposób przekazania dostępu (jaki?): _________________
- [ ] Subskrypcja Azure (Subscription ID): _________________
- [ ] Tenant Azure (Tenant ID): _________________

**Pytanie: Jaki region Azure preferują Państwo?**

- [ ] **Poland Central** (Warszawa) — rekomendowany
- [ ] **West Europe** (Holandia)
- [ ] **North Europe** (Irlandia)
- [ ] **Germany West Central** (Frankfurt)
- [ ] Inny: _________________

> **Sugestia Developico:** Rekomendujemy region **Poland Central** — zapewnia najniższe opóźnienia dla użytkowników w Polsce oraz przechowywanie danych na terenie kraju, co może być istotne z perspektywy polityki bezpieczeństwa i regulacji wewnętrznych.
>
> **Ważne:** Wybór regionu może być ograniczony dostępnością usług wymaganych przez aplikację (np. Azure OpenAI, Azure Functions na planie Consumption). Przed finalnym wyborem zweryfikujemy wspólnie, czy wszystkie potrzebne usługi są dostępne w wybranym regionie. Jeśli występują ograniczenia, zaproponujemy optymalną alternatywę.

### Zasoby Azure tworzone w ramach wdrożenia

W ramach wdrożenia na subskrypcji Klienta zostaną utworzone następujące zasoby:

| Zasób | Opis biznesowy |
|-------|----------------|
| Azure Functions | Serwer API — logika biznesowa systemu |
| App Service | Aplikacja webowa — interfejs użytkownika |
| Key Vault | Sejf kluczy — bezpieczne przechowywanie tokenów KSeF i kluczy API |
| Application Insights | Monitoring — nadzór nad działaniem i wydajnością systemu |
| Virtual Network | Sieć prywatna — izolacja i bezpieczeństwo komunikacji między komponentami |
| Storage Account | Magazyn danych — pliki konfiguracyjne i załączniki |

### 4b. Microsoft Dataverse

Dataverse służy jako baza danych systemu. Przechowuje faktury, centra kosztowe, budżety, dostawców, historię zatwierdzeń i wszystkie pozostałe dane. W ramach wdrożenia zostanie utworzonych 14 tabel w środowisku Dataverse.

**Pytanie 1: Czy posiadają Państwo licencję Power Platform z dostępem do Dataverse?**

- [ ] **Tak** — posiadamy licencję Power Platform / Dynamics 365 z Dataverse
- [ ] **Nie** — potrzebujemy pomocy w uzyskaniu licencji

**Pytanie 2: Czy posiadają Państwo środowisko Dataverse, które możemy wykorzystać?**

- [ ] **Tak** — posiadamy istniejące środowisko (URL: _________________ )
- [ ] **Nie** — potrzebujemy utworzenia nowego środowiska

> **Sugestia Developico:** Rekomendujemy utworzenie **dedykowanego środowiska Dataverse** przeznaczonego wyłącznie dla KSeF Copilot. Dostępne typy środowisk:
>
> | Typ | Przeznaczenie | Kiedy wybrać |
> |-----|---------------|-------------|
> | **Sandbox** | Testy i rozwój — można je w każdej chwili zresetować | Dla środowiska Demo / testowego |
> | **Production** | Praca operacyjna z prawdziwymi danymi | Dla środowiska produkcyjnego |
>
> Idealne podejście to **dwa dedykowane środowiska**: Sandbox (do testów UAT i szkoleń) + Production (do pracy operacyjnej).

### Dostęp do Dataverse — konto wdrożeniowe

Analogicznie do subskrypcji Azure, najszybszą metodą konfiguracji jest **udostępnienie konta z rolą System Administrator** (właściciel środowiska) w wybranym środowisku Dataverse. Konto umożliwi nam:

- Utworzenie 14 tabel systemowych (faktury, MPK, budżety, dostawcy, itp.)
- Konfigurację relacji między tabelami i pól niestandardowych
- Import danych początkowych (MPK, kategorie)
- Weryfikację poprawności integracji z API

> **Uwaga:** Może to być **to samo konto wdrożeniowe**, które zostanie udostępnione do subskrypcji Azure (sekcja 4a), pod warunkiem że posiada ono również rolę System Administrator w środowisku Dataverse.

**Dobre praktyki bezpieczeństwa:**

| Praktyka | Opis |
|----------|------|
| 🔒 **Konto tymczasowe** | Rola System Administrator potrzebna jest na czas wdrożenia. Po zakończeniu można obniżyć uprawnienia do poziomu Basic User lub dezaktywować konto |
| 👤 **Dedykowane konto** | Zalecamy to samo dedykowane konto wdrożeniowe co w sekcji 4a (np. `ksef-deploy@firma.onmicrosoft.com`) |
| 📋 **Audyt** | Dataverse rejestruje wszystkie operacje na danych — możliwa pełna weryfikacja działań wdrożeniowych |
| 🛡️ **Obniżenie uprawnień po wdrożeniu** | Po zakończeniu prac wystarczy rola Basic User lub całkowite usunięcie konta ze środowiska |

**Checklist:**

- [ ] Dedykowane środowisko Dataverse: **Sandbox** / **Production** / posiadamy istniejące
- [ ] URL środowiska Dataverse: _________________
- [ ] Konto wdrożeniowe z rolą System Administrator w środowisku Dataverse (to samo co w sekcji 4a lub oddzielne): _________________
- [ ] Lub: preferujemy inny sposób konfiguracji: _________________

### 4c. Azure OpenAI *(opcjonalne — dla funkcji AI)*

Wymagane tylko jeśli Klient chce korzystać z:
- **Automatycznej kategoryzacji AI** — system sugeruje MPK i kategorię na podstawie treści faktury
- **Skanowania OCR** — rozpoznawanie tekstu z zeskanowanych dokumentów (paragonów, rachunków)

**Checklist:**

- [ ] Chcemy korzystać z funkcji AI: **Tak** / **Nie** / **Później**
- [ ] Jeśli tak: korzystamy z własnej instancji Azure OpenAI / instancji Developico

### 4d. Identyfikacja wizualna i domena aplikacji

Aplikacja webowa KSeF Copilot może być dostosowana wizualnie do identyfikacji Klienta. Prosimy o dostarczenie poniższych informacji:

**Pytanie 1: Jaka powinna być nazwa aplikacji widoczna dla użytkowników?**

> Nazwa wyświetlana w nagłówku aplikacji, zakładce przeglądarki i na ekranie logowania.

- Proponowana nazwa: _________________ (np. „KSeF Copilot", „KSeF Firma", „e-Faktury Firma")

**Pytanie 2: Prosimy o dostarczenie logotypu firmy**

| Format | Przeznaczenie | Wymagany |
|--------|---------------|----------|
| **SVG** | Logo w nagłówku aplikacji (preferowany — skalowalny) | Tak |
| **PNG** (min. 512×512 px, przezroczyste tło) | Ikona aplikacji (favicon, ekran logowania) | Tak |

**Pytanie 3: Jakie są barwy firmowe (brand colors)?**

| Element | Wartość (HEX / nazwa) | Przykład |
|---------|----------------------|----------|
| Kolor główny (Primary) | _________________ | np. `#0066CC` |
| Kolor dodatkowy (Secondary) | _________________ | np. `#FF6600` |
| Kolor akcentu (opcjonalnie) | _________________ | np. `#00CC66` |

> Kolory zostaną użyte w nagłówku, przyciskach, linkach i elementach interfejsu. Jeśli posiadają Państwo księgę znaku (brand book), prosimy o jej udostępnienie.

**Pytanie 4: Jaki adres URL powinna mieć aplikacja?**

- [ ] Subdomena własna Klienta (np. `ksef.firma.pl`) — **rekomendowane**
- [ ] Subdomena Azure (np. `firma-ksef.azurewebsites.net`) — domyślna, bez konfiguracji DNS
- [ ] Proponowany adres: _________________

### Konfiguracja DNS *(mocno zalecane)*

Aby aplikacja była dostępna pod własną domeną Klienta (np. `ksef.firma.pl`), konieczne jest dodanie odpowiednich rekordów w strefie DNS domeny.

> **Ważne:** Konfiguracja własnej domeny **nie jest wymagana** do działania systemu — aplikacja będzie działać na domyślnym adresie Azure (`*.azurewebsites.net`). Jednak **mocno rekomendujemy** konfigurację własnej domeny ze względu na:
>
> - Profesjonalny wygląd adresu dla użytkowników
> - Łatwiejsze zapamiętanie i udostępnianie linku
> - Możliwość konfiguracji certyfikatu SSL dla domeny Klienta
> - Zgodność z politykami bezpieczeństwa wielu organizacji

**Co będzie potrzebne:**

| Krok | Opis | Kto wykonuje |
|------|------|-------------|
| 1. Wskazanie domeny | Klient podaje domenę, pod którą ma działać aplikacja (np. `ksef.firma.pl`) | Klient |
| 2. Rekord CNAME / TXT | Developico przekaże wartość rekordu DNS do dodania | Developico |
| 3. Edycja strefy DNS | Klient (lub jego dostawca DNS) dodaje wskazany rekord w strefie DNS domeny | Klient / Dostawca DNS |
| 4. Weryfikacja i certyfikat SSL | Developico potwierdzi propagację DNS i skonfiguruje certyfikat SSL (Let's Encrypt — bezpłatny) | Developico |

**Checklist:**

- [ ] Nazwa aplikacji: _________________
- [ ] Logo w formacie SVG: **Dostarczone** / **Dostarczymy do** _________________
- [ ] Logo w formacie PNG (512×512 px): **Dostarczone** / **Dostarczymy do** _________________
- [ ] Barwy firmowe: **Podane powyżej** / **Dostarczymy księgę znaku**
- [ ] Domena własna: **Tak** (jaka: _________________ ) / **Nie** (zostajemy przy domenie Azure)
- [ ] Dostęp do edycji strefy DNS: **Tak, mamy dostęp** / **Musimy skontaktować się z dostawcą DNS** / **Nie dotyczy**

---

## 5. Użytkownicy i role *(wymagane)*

System rozpoznaje trzy role użytkowników. Każdy użytkownik loguje się swoim kontem Microsoft 365 (Entra ID).

### Role w systemie

| Rola | Opis | Przykładowe uprawnienia |
|------|------|------------------------|
| **Admin** | Pełny dostęp do systemu | Synchronizacja faktur z KSeF, konfiguracja firmy, zarządzanie MPK i budżetami, wysyłka faktur do KSeF, podgląd wszystkich faktur, zarządzanie dostawcami |
| **Użytkownik** | Przeglądanie i kategoryzacja | Przeglądanie faktur, przypisywanie MPK i kategorii, dodawanie notatek i załączników, podgląd raportów |
| **Zatwierdzający** | Zatwierdzanie w przypisanych MPK | Zatwierdzanie i odrzucanie faktur przypisanych do swoich MPK, podgląd faktur w zakresie swoich centrów kosztowych |

> **Uwagi:**
> - Jeden użytkownik może pełnić kilka ról jednocześnie (np. Admin + Zatwierdzający).
> - Rola Zatwierdzającego jest zawsze powiązana z konkretnymi MPK — zatwierdzający widzi i akceptuje tylko faktury ze swoich centrów kosztowych.
> - Użytkownicy identyfikowani są przez konta Microsoft 365 — nie ma potrzeby tworzenia oddzielnych loginów.

### Lista użytkowników *(do uzupełnienia)*

| Lp. | Imię i nazwisko | Email (Microsoft 365) | Rola | MPK (dla Zatwierdzających) |
|-----|----------------|----------------------|------|---------------------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

*Tabelę można rozszerzyć. Pełny szablon w Załączniku A.*

---

## 6. Centra kosztów — MPK *(wymagane)*

### 6a. Czym jest MPK?

**Miejsce Powstawania Kosztów (MPK)** to centrum kosztowe, do którego przypisywana jest każda faktura. Pozwala to na:
- Śledzenie, kto generuje jakie koszty
- Kontrolę budżetów per dział / zespół / projekt
- Kierowanie faktur do odpowiednich osób zatwierdzających

System pozwala na pełną personalizację listy MPK — nie ograniczamy do sztywnych predefiniowanych wartości.

### Przykładowe MPK *(do potwierdzenia lub modyfikacji)*

Poniżej lista przykładowych centrów kosztowych. Prosimy o potwierdzenie, modyfikację lub dostarczenie własnej listy:

| Nazwa MPK | Opis |
|-----------|------|
| Konsultanci | Koszty zespołu konsultingowego |
| BackOffice | Koszty administracji i zaplecza biurowego |
| Zarząd | Koszty zarządu i kadry kierowniczej |
| Flota | Koszty pojazdów służbowych i transportu |
| Prawne | Koszty obsługi prawnej |
| Marketing | Koszty marketingu, reklamy i promocji |
| Sprzedaż | Koszty działu sprzedaży i obsługi klienta |
| Dostawa | Koszty logistyki i dostaw |
| Finanse | Koszty działu finansowego i księgowości |
| Inne | Pozostałe koszty nieprzypisane do powyższych |

**Pytanie do Klienta:** Czy posiadacie Państwo własną strukturę MPK? Jeśli tak, prosimy o dostarczenie listy (szablon w Załączniku B).

### Szablon własnych MPK *(do uzupełnienia)*

| Lp. | Nazwa MPK | Kod | Opis | Aktywne od |
|-----|-----------|-----|------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

### 6b. Przypisanie zatwierdzających do MPK

Każde MPK może mieć jednego lub więcej zatwierdzających. Zasada działania:
- **Wystarczy zatwierdzenie jednej osoby** z listy przypisanych do danego MPK
- Jeśli w MPK nie przypisano żadnego zatwierdzającego, rolę tę przejmują Administratorzy
- Zatwierdzanie jest opcjonalne per MPK — można je wyłączyć dla wybranych centrów

| MPK | Zatwierdzający (email) | Wymagane zatwierdzanie? |
|-----|----------------------|------------------------|
| | | Tak / Nie |
| | | Tak / Nie |
| | | Tak / Nie |

*Pełny szablon w Załączniku B.*

> **Pytanie:** Czy wymagane jest zatwierdzanie wielopoziomowe (np. kierownik → dyrektor)? System obsługuje obecnie jeden poziom zatwierdzania. Jeśli potrzebne są dodatkowe poziomy, należy to zgłosić na etapie konfiguracji.

---

## 7. Budżety MPK *(wymagane — decyzja)*

### 7a. Decyzja o budżetowaniu

- [ ] **Tak** — chcemy korzystać z modułu budżetowania MPK
- [ ] **Nie** — nie potrzebujemy budżetowania na tym etapie
- [ ] **Później** — wrócimy do tego po uruchomieniu podstawowej funkcjonalności

> Jeśli „Nie" lub „Później" — pozostałą część tej sekcji można pominąć.

### 7b. Konfiguracja budżetów

**Okres budżetowy** — jak często odnawiany jest budżet:

- [ ] Miesięczny
- [ ] Kwartalny
- [ ] Półroczny
- [ ] Roczny

**Waluta:** Budżety prowadzone są w **PLN**. Faktury w walutach obcych (EUR, USD) przeliczane są automatycznie po kursie NBP z dnia wystawienia.

**Zasady działania budżetów:**
- Przekroczenie budżetu **nie blokuje** zatwierdzania faktur — generuje alerty informacyjne
- Budżet resetuje się automatycznie na początku nowego okresu
- Niewykorzystany budżet **nie przenosi się** na następny okres

**Progi alertów** (domyślne, konfigurowalne per MPK):

| Próg | Wartość domyślna | Akcja |
|------|-----------------|-------|
| Ostrzeżenie | **80%** wykorzystania | Powiadomienie do Admina |
| Przekroczenie | **100%** wykorzystania | Powiadomienie do Admina |

> Czy chcą Państwo zmienić domyślne progi? Jeśli tak, prosimy podać wartości.

### Szablon budżetów *(do uzupełnienia)*

| MPK | Okres | Kwota budżetu (PLN) | Próg ostrzeżenia | Próg przekroczenia |
|-----|-------|---------------------|-------------------|--------------------|
| | | | 80% | 100% |
| | | | 80% | 100% |
| | | | 80% | 100% |

*Pełny szablon w Załączniku B.*

**Pytanie:** Kto powinien otrzymywać powiadomienia o przekroczeniu budżetu?
- [ ] Tylko Administratorzy
- [ ] Administratorzy + Zatwierdzający danego MPK
- [ ] Wskazane osoby: _________________

---

## 8. Proces zatwierdzania faktur *(wymagane)*

### 8a. Workflow zatwierdzania

Każda faktura przechodzi przez następujący proces:

```
Szkic → Oczekuje na zatwierdzenie → Zatwierdzona / Odrzucona / Anulowana
```

**Kluczowe zasady:**
- Zatwierdzanie uruchamia się automatycznie po przypisaniu faktury do MPK, które ma włączone wymaganie zatwierdzenia
- **Faktury korygujące** (korekty) są zatwierdzane automatycznie — nie wymagają ręcznej akceptacji
- Każde MPK może mieć **własne SLA** zatwierdzenia (od 1 do 720 godzin)
- System monitoruje terminowość zatwierdzeń **co godzinę** i wysyła powiadomienia przy przekroczeniu SLA
- Administratorzy mogą **anulować** oczekujące zatwierdzenia

### Checklist

- [ ] Domyślne SLA zatwierdzenia: ______ godzin (sugerowane: 48h)
- [ ] Czy po przekroczeniu SLA wysyłamy eskalację? **Tak** / **Nie**
- [ ] Jeśli tak, do kogo: _________________
- [ ] Czy Administratorzy mogą anulować oczekujące zatwierdzenia? **Tak** (domyślnie) / **Nie**

### 8b. Kategoryzacja faktur

Każda faktura może być przypisana do kategorii kosztowej i opcjonalnie do projektu. Dostępne tryby:

| Tryb | Opis |
|------|------|
| **Manualny** | Użytkownik ręcznie wybiera MPK i kategorię z listy |
| **AI-wspierany** | System sugeruje MPK i kategorię na podstawie treści faktury (wymaga Azure OpenAI) |
| **Mieszany** | AI sugeruje, użytkownik potwierdza lub zmienia (zalecany) |

**Checklist:**

- [ ] Preferowany tryb kategoryzacji: **Manualny** / **AI** / **Mieszany**
- [ ] Lista kategorii kosztowych *(do uzupełnienia lub zaakceptowania domyślnych)*:

| Lp. | Kategoria | Opis |
|-----|-----------|------|
| 1 | | |
| 2 | | |
| 3 | | |

- [ ] Lista projektów do tagowania faktur *(opcjonalnie)*:

| Lp. | Nazwa projektu | Kod |
|-----|---------------|-----|
| 1 | | |
| 2 | | |

---

## 9. Płatności i waluty *(wymagane)*

### Śledzenie płatności

System monitoruje status płatności każdej faktury:

| Status | Opis |
|--------|------|
| **Oczekująca** | Faktura zarejestrowana, płatność nie została dokonana |
| **Zapłacona** | Płatność zrealizowana |
| **Przeterminowana** | Upłynął termin płatności, faktura niezapłacona |

### Obsługa walut

System obsługuje trzy waluty: **PLN**, **EUR**, **USD**. Kursy wymiany pobierane są automatycznie z **Narodowego Banku Polskiego (NBP)** — nie ma potrzeby ręcznego wprowadzania kursów.

**Pytanie:** Czy potrzebują Państwo obsługi dodatkowych walut poza PLN, EUR i USD?

- [ ] **Nie** — trzy waluty bazowe są wystarczające
- [ ] **Tak** — potrzebujemy dodatkowych walut: _________________

> Dodanie nowych walut jest możliwe, pod warunkiem że NBP publikuje ich kursy wymiany.

### Checklist

- [ ] Waluta domyślna dla raportów: **PLN** / EUR / USD
- [ ] Po ilu dniach od terminu płatności faktura oznaczana jako przeterminowana: ______ dni

---

## 10. Dostawcy *(wymagane)*

### 10a. Rejestr dostawców

Dostawcy mogą pojawić się w systemie na dwa sposoby:

| Sposób | Opis |
|--------|------|
| **Automatycznie z KSeF** | Dostawcy dodawani przy pierwszej synchronizacji ich faktury — nie wymaga ręcznej pracy |
| **Ręczny import** | Lista kluczowych dostawców wprowadzona przed uruchomieniem systemu |

**Checklist:**

- [ ] Źródło dostawców: **Automatycznie z KSeF** (zalecane) / Lista na start
- [ ] Jeśli lista na start: dostarczymy listę kluczowych dostawców (szablon w Załączniku C)

### 10b. Weryfikacja dostawców — Biała Lista VAT

System automatycznie weryfikuje dostawców w **Wykazie Podatników VAT (Biała Lista)** prowadzonym przez Krajową Administrację Skarbową (KAS). Pozwala to wykryć dostawców wyrejestrowanych z VAT lub o nieprawidłowym statusie podatkowym.

**Checklist:**

- [ ] Weryfikacja Biała Lista VAT: **Włączona** (domyślnie) / Wyłączona

---

## 11. Powiadomienia *(wymagane — konfiguracja)*

System generuje powiadomienia o kluczowych zdarzeniach. Wszystkie typy są domyślnie **włączone**. Prosimy o potwierdzenie lub wyłączenie wybranych:

| | Typ powiadomienia | Odbiorca domyślny | Włączone? |
|---|-------------------|-------------------|-----------|
| ✅ | Prośba o zatwierdzenie faktury | Zatwierdzający danego MPK | Tak / Nie |
| ✅ | Przekroczenie SLA zatwierdzenia | Zatwierdzający + Admin | Tak / Nie |
| ✅ | Ostrzeżenie budżetowe (80%) | Admin | Tak / Nie |
| ✅ | Przekroczenie budżetu (100%) | Admin | Tak / Nie |
| ✅ | Decyzja o zatwierdzeniu / odrzuceniu | Osoba, która złożyła wniosek | Tak / Nie |
| ✅ | Self-billing: prośba o akceptację dostawcy | Kontakt po stronie dostawcy | Tak / Nie |
| ✅ | Dokument kosztowy: prośba o zatwierdzenie | Zatwierdzający MPK | Tak / Nie |
| ✅ | Dokument kosztowy: decyzja | Osoba zgłaszająca | Tak / Nie |

> Czy chcą Państwo zmienić domyślnych odbiorców powiadomień?  
> Dodatkowe osoby do powiadomień: _________________

---

## 12. Prognozowanie i anomalie *(opcjonalne)*

### 12a. Prognozowanie wydatków

System oferuje prognozowanie przyszłych kosztów na podstawie danych historycznych. Wykorzystuje 5 algorytmów (w tym średnią ważoną, regresję liniową, dekompozycję sezonową) i automatycznie wybiera najlepszy na podstawie dostępnych danych.

> Wymaga minimum 1 miesiąca danych historycznych. Im więcej danych, tym dokładniejsze prognozy (optymalnie 12+ miesięcy).

**Checklist:**

- [ ] Włączyć prognozowanie wydatków? **Tak** / **Nie** / **Później**

### 12b. Wykrywanie anomalii

System monitoruje faktury pod kątem nietypowych sytuacji i generuje alerty. Dostępne reguły:

| Reguła | Co wykrywa |
|--------|-----------|
| **Skok kwotowy** | Faktura znacząco powyżej średniej danego dostawcy |
| **Nowy dostawca** | Pierwsza faktura od nieznanego dostawcy na kwotę powyżej 10 000 PLN |
| **Podejrzenie duplikatu** | Ten sam dostawca, zbliżona kwota, bliskie daty (w oknie 3 dni) |
| **Zmiana kategorii** | Wydatki w kategorii znacząco powyżej miesięcznej średniej |
| **Zmiana częstotliwości** | Dostawca fakturuje znacząco częściej niż historyczna średnia |

Poziomy ważności alertów: niski / średni / wysoki / krytyczny.

**Checklist:**

- [ ] Włączyć wykrywanie anomalii? **Tak** / **Nie** / **Później**
- [ ] Kto otrzymuje alerty o anomaliach? _________________

---

## 13. Raporty *(wymagane — zakres)*

System zawiera zestaw gotowych raportów z możliwością eksportu do CSV i Excel:

| Raport | Co zawiera |
|--------|-----------|
| **Wykorzystanie budżetu** | Planowany vs rzeczywisty budżet per MPK, procent wykorzystania |
| **Historia zatwierdzeń** | Wszystkie decyzje zatwierdzających z datami i komentarzami |
| **Wydajność zatwierdzających** | Liczba decyzji, wskaźnik zatwierdzeń, średni czas reakcji, zgodność z SLA |
| **Przetwarzanie faktur** | Pipeline: otrzymane → sklasyfikowane → zatwierdzone, średni czas per etap |
| **Dystrybucja kosztów** | Koszty według typu dokumentu, kategorii i miesiąca |

**Checklist:**

- [ ] Potwierdzam, że powyższe raporty są wystarczające
- [ ] Potrzebujemy dodatkowych raportów (opis): _________________
- [ ] Częstotliwość raportów: **Na żądanie** / Cyklicznie (jak często: _______)

---

## 14. Samofakturowanie *(opcjonalne)*

> Tę sekcję wypełniamy tylko jeśli Klient korzysta z mechanizmu samofakturowania (self-billing) — wystawiania faktur zakupowych w imieniu dostawcy.

### Jak działa samofakturowanie w systemie?

```
Szkic → Oczekuje na akceptację dostawcy → Zaakceptowana → Wysłana do KSeF
                                        → Odrzucona przez dostawcę
```

System wymaga:
- **Umowy samofakturowania** z dostawcą (dane, daty obowiązywania, warunki)
- **Szablonu faktury** (stawki VAT, opisy usług, warunki płatności)
- **Osoby kontaktowej** po stronie dostawcy do akceptacji faktur

### Checklist

- [ ] Czy korzystacie z samofakturowania? **Tak** / **Nie**
- [ ] Jeśli tak — lista dostawców objętych umowami self-billing:

| Lp. | Dostawca (nazwa) | NIP dostawcy | Kontakt dostawcy (email) | Umowa ważna od | Umowa ważna do |
|-----|-----------------|-------------|-------------------------|----------------|----------------|
| 1 | | | | | |
| 2 | | | | | |

- [ ] Szablony faktur (stawki VAT, opisy usług): *Do ustalenia na etapie konfiguracji*

---

## 15. Dokumenty kosztowe *(opcjonalne)*

System umożliwia rejestrację dokumentów kosztowych innych niż faktury VAT z KSeF.

### Obsługiwane typy dokumentów

| Typ | Opis |
|-----|------|
| **Paragon** | Paragony fiskalne i ich kopie |
| **Pokwitowanie** | Potwierdzenia odbioru / płatności |
| **Pro forma** | Faktury pro forma (nie stanowiące dokumentu księgowego) |
| **Nota księgowa** | Noty obciążeniowe i uznaniowe |
| **Rachunek** | Rachunki od podmiotów niebędących podatnikami VAT |
| **Umowa zlecenie / o dzieło** | Dokumenty kosztowe z tytułu umów cywilnoprawnych |
| **Inne** | Pozostałe dokumenty kosztowe |

**Funkcje dodatkowe:** notatki, załączniki (skany), workflow zatwierdzania (analogiczny do faktur), skanowanie OCR (automatyczne rozpoznawanie tekstu ze zdjęć i skanów — wymaga Azure OpenAI Vision).

### Checklist

- [ ] Czy rejestrujecie dokumenty kosztowe poza fakturami VAT? **Tak** / **Nie**
- [ ] Jeśli tak — które typy dokumentów:
  - [ ] Paragony
  - [ ] Pokwitowania
  - [ ] Pro forma
  - [ ] Noty księgowe
  - [ ] Rachunki
  - [ ] Umowy zlecenie / o dzieło
  - [ ] Inne: _________________
- [ ] Czy chcemy skanowanie OCR dokumentów? **Tak** / **Nie** (wymaga Azure OpenAI)

---

## 16. Integracja z Power Platform *(opcjonalne)*

System oferuje integrację z ekosystemem Microsoft Power Platform:

| Moduł | Opis | Wymagania |
|-------|------|-----------|
| **Copilot Studio w Teams** | Asystent konwersacyjny w Microsoft Teams — pozwala użytkownikom sprawdzać statusy faktur, budżety i zatwierdzać faktury przez czat (14 dostępnych narzędzi) | Licencja Copilot Studio |
| **Model-Driven App** | Aplikacja w Dynamics 365 z pełnym dostępem do danych Dataverse — dla zaawansowanych użytkowników i administratorów | Licencja Dynamics 365 lub Power Apps |
| **Custom Connector** | Konektor dla Power Automate umożliwiający tworzenie własnych automatyzacji (np. powiadomienia email, integracja z innymi systemami) | Licencja Power Automate |

### Checklist

- [ ] Copilot Studio w Microsoft Teams: **Tak** / **Nie** / **Później**
- [ ] Model-Driven App w Dynamics 365: **Tak** / **Nie** / **Później**
- [ ] Custom Connector dla Power Automate: **Tak** / **Nie** / **Później**

---

## 17. Harmonogram wdrożenia

Wdrożenie realizowane jest w trzech fazach:

### Faza 1 — Przygotowanie infrastruktury *(1–2 tygodnie)*

| Zadanie | Odpowiedzialny | Status |
|---------|---------------|--------|
| Przygotowanie subskrypcji Azure i uprawnień | Klient | ☐ |
| Konfiguracja Entra ID (rejestracje aplikacji, grupy) | Developico / Klient | ☐ |
| Wdrożenie zasobów Azure (Functions, App Service, Key Vault) | Developico | ☐ |
| Konfiguracja środowiska Dataverse | Developico | ☐ |
| Wygenerowanie tokenu KSeF (środowisko testowe) | Klient | ☐ |
| Uruchomienie środowiska testowego z 1–2 pilotażowymi MPK | Developico | ☐ |

### Faza 2 — Konfiguracja biznesowa i testy *(2–3 tygodnie)*

| Zadanie | Odpowiedzialny | Status |
|---------|---------------|--------|
| Konfiguracja pełnej listy MPK i zatwierdzających | Developico + Klient | ☐ |
| Konfiguracja budżetów (jeśli dotyczy) | Klient + Developico | ☐ |
| Konfiguracja workflow zatwierdzania i SLA | Developico + Klient | ☐ |
| Import / synchronizacja dostawców | Developico | ☐ |
| Konfiguracja powiadomień | Developico | ☐ |
| Testy akceptacyjne (UAT) z użytkownikami | Klient | ☐ |
| Konfiguracja modułów opcjonalnych (self-billing, dokumenty kosztowe) | Developico | ☐ |

### Faza 3 — Produkcja i Go-Live *(1 tydzień)*

| Zadanie | Odpowiedzialny | Status |
|---------|---------------|--------|
| Wygenerowanie tokenu KSeF (środowisko produkcyjne) | Klient | ☐ |
| Przełączenie systemu na środowisko produkcyjne | Developico | ☐ |
| Pierwsza synchronizacja produkcyjnych faktur | Developico + Klient | ☐ |
| Szkolenie użytkowników końcowych | Developico | ☐ |
| Weryfikacja poprawności działania | Klient + Developico | ☐ |
| Przekazanie dokumentacji i kontaktów wsparcia | Developico | ☐ |

---

## 17. Podsumowanie — Checklist gotowości

Przed rozpoczęciem wdrożenia prosimy o potwierdzenie przygotowania poniższych elementów:

### Wymagane (przed Fazą 1)

- [ ] Dane firmy (sekcja 2)
- [ ] Dostęp do portalu KSeF i gotowość do wygenerowania tokenu (sekcja 3)
- [ ] Tenant Azure z uprawnieniami administratora Entra ID (sekcja 4a)
- [ ] Środowisko Microsoft Dataverse (sekcja 4b)
- [ ] Subskrypcja Azure z uprawnieniami Contributor (sekcja 4d)
- [ ] Wstępna lista użytkowników i ról (sekcja 5)

### Wymagane (przed Fazą 2)

- [ ] Kompletna lista MPK z zatwierdzającymi (sekcja 6)
- [ ] Decyzja o budżetowaniu i kwoty budżetów (sekcja 7)
- [ ] Parametry workflow zatwierdzania — SLA, eskalacja (sekcja 8)
- [ ] Konfiguracja powiadomień (sekcja 11)

### Opcjonalne (przed Fazą 2 lub 3)

- [ ] Decyzja o AI i Azure OpenAI (sekcja 4c)
- [ ] Kategorie kosztowe i projekty (sekcja 8b)
- [ ] Moduł samofakturowania — dostawcy, umowy, szablony (sekcja 14)
- [ ] Dokumenty kosztowe — typy, OCR (sekcja 15)

---

## Załączniki

### Załącznik A — Szablon listy użytkowników i ról

| Lp. | Imię i nazwisko | Email (Microsoft 365) | Rola (Admin / Użytkownik / Zatwierdzający) | MPK (dla Zatwierdzających) | Uwagi |
|-----|----------------|----------------------|---------------------------------------------|---------------------------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

### Załącznik B — Szablon MPK, zatwierdzający i budżety

| Lp. | Nazwa MPK | Kod MPK | Opis | Zatwierdzający (email) | Wymagane zatwierdzanie? | SLA (godziny) | Okres budżetu | Kwota budżetu (PLN) |
|-----|-----------|---------|------|----------------------|------------------------|---------------|---------------|---------------------|
| 1 | | | | | Tak / Nie | | | |
| 2 | | | | | Tak / Nie | | | |
| 3 | | | | | Tak / Nie | | | |
| 4 | | | | | Tak / Nie | | | |
| 5 | | | | | Tak / Nie | | | |
| 6 | | | | | Tak / Nie | | | |
| 7 | | | | | Tak / Nie | | | |
| 8 | | | | | Tak / Nie | | | |
| 9 | | | | | Tak / Nie | | | |
| 10 | | | | | Tak / Nie | | | |

### Załącznik C — Szablon listy dostawców

| Lp. | Nazwa dostawcy | NIP | Osoba kontaktowa | Email kontaktowy | Umowa self-billing? | Uwagi |
|-----|---------------|-----|-----------------|-----------------|---------------------|-------|
| 1 | | | | | Tak / Nie | |
| 2 | | | | | Tak / Nie | |
| 3 | | | | | Tak / Nie | |
| 4 | | | | | Tak / Nie | |
| 5 | | | | | Tak / Nie | |

### Załącznik D — Generowanie tokenu KSeF

Instrukcja krok po kroku:

1. Zaloguj się na portal **Ministerstwa Finansów** (www.podatki.gov.pl)
2. Przejdź do sekcji **KSeF — Krajowy System e-Faktur**
3. Wybierz firmę po numerze **NIP**
4. W ustawieniach autoryzacji wygeneruj **token API**
5. Skopiuj wygenerowany token — zostanie on bezpiecznie przechowywany w Azure Key Vault

> **Uwaga:** Token jest wrażliwym kluczem dostępowym. Nie przesyłaj go mailem. Przekaż go bezpiecznie za pośrednictwem uzgodnionego z Developico kanału (np. zaszyfrowana wiadomość, Key Vault direct upload).

> Szczegółowa instrukcja z ilustracjami zostanie dostarczona osobno.

### Załącznik E — Konfiguracja grup zabezpieczeń w Entra ID

W ramach wdrożenia potrzebne są trzy grupy zabezpieczeń w Microsoft Entra ID:

| Grupa | Przeznaczenie | Kto powinien być członkiem |
|-------|---------------|---------------------------|
| **KSeF-Admin** | Rola Administratora | Osoby z pełnym dostępem do systemu |
| **KSeF-User** | Rola Użytkownika | Osoby przeglądające i kategoryzujące faktury |
| **KSeF-Approver** | Rola Zatwierdzającego | Osoby zatwierdzające faktury w swoich MPK |

**Opcje konfiguracji:**

1. **Klient tworzy grupy samodzielnie** — Administrator Entra ID tworzy 3 grupy zabezpieczeń i dodaje użytkowników
2. **Developico konfiguruje** — Klient udziela tymczasowego dostępu administratora, Developico wykonuje konfigurację

> Szczegółowa instrukcja konfiguracji Entra ID zostanie dostarczona osobno.

---

*Dokument przygotowany przez Developico Sp. z o.o. na potrzeby wdrożenia KSeF Copilot.*
