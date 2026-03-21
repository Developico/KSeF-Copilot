# Role i uprawnienia

Niniejszy dokument opisuje model kontroli dostępu opartej na rolach (RBAC) stosowany w aplikacji KSeF.

## Hierarchia ról

| Rola | Poziom | Opis |
|------|--------|------|
| **Admin** | Najwyższy | Pełny dostęp — zarządzanie firmami, synchronizacja, ustawienia, usuwanie, wysyłka do KSeF |
| **Użytkownik (Reader)** | Średni | Dostęp do odczytu — przeglądanie wszystkich faktur, raportów, prognoz, eksport |
| **Akceptant (Approver)** | Zakresowy | Zatwierdzanie/odrzucanie ograniczone do przypisanych centrów kosztowych i dostawców |
| **Nieautoryzowany** | Brak | Uwierzytelniony, ale nieprzynależny do żadnej grupy — odmowa dostępu |

- **Admin** dziedziczy wszystkie uprawnienia Użytkownika i Akceptanta.
- **Użytkownik** dziedziczy uprawnienia Akceptanta (może zatwierdzać wszystko, co widzi Reader).
- **Akceptant** to rola równoległa — dostęp wyłącznie w zakresie przypisania, bez możliwości odczytu wszystkiego ani administracji.

## Grupy bezpieczeństwa Entra ID

Każda rola mapowana jest na grupę bezpieczeństwa Azure Entra ID. Przynależność do grupy odczytywana jest z tokenu ID użytkownika (claim `groups`).

| Rola | Zmienna środowiskowa (API) | Zmienna środowiskowa (Web) | Zmienna środowiskowa (Code-App) |
|------|---------------------------|---------------------------|--------------------------------|
| Admin | `ADMIN_GROUP_ID` / `NEXT_PUBLIC_ADMIN_GROUP` | `NEXT_PUBLIC_ADMIN_GROUP` | `VITE_ADMIN_GROUP` |
| Użytkownik | `USER_GROUP_ID` / `NEXT_PUBLIC_USER_GROUP` | `NEXT_PUBLIC_USER_GROUP` | `VITE_USER_GROUP` |
| Akceptant | `APPROVER_GROUP_ID` / `NEXT_PUBLIC_APPROVER_GROUP` | `NEXT_PUBLIC_APPROVER_GROUP` | `VITE_APPROVER_GROUP` |

## Macierz dostępu do endpointów API

### Zatwierdzanie faktur (`/api/approvals/*`)

| Endpoint | Admin | Użytkownik/Reader | Akceptant |
|----------|-------|-------------------|-----------|
| POST `/approve` | ✅ | ✅ | ✅ |
| POST `/reject` | ✅ | ✅ | ✅ |
| POST `/cancel` | ✅ | ❌ | ❌ |
| POST `/refresh-approvers` | ✅ | ✅ | ✅ |
| POST `/bulk-approve` | ✅ | ✅ | ✅ |
| GET `/pending` | ✅ | ✅ | ✅ |

### Faktury samofakturowania (`/api/self-billing/*`)

| Endpoint | Admin | Użytkownik/Reader | Akceptant |
|----------|-------|-------------------|-----------|
| GET `/invoices` (lista) | ✅ | ✅ | ✅ |
| GET `/invoices/{id}` | ✅ | ✅ | ✅ |
| POST `/invoices/preview` | ✅ | ✅ | ❌ |
| POST `/invoices/generate` | ✅ | ❌ | ❌ |
| PUT `/invoices/{id}` | ✅ | ❌ | ❌ |
| DELETE `/invoices/{id}` | ✅ | ❌ | ❌ |
| POST `/invoices/{id}/submit` | ✅ | ❌ | ❌ |
| POST `/invoices/{id}/approve` | ✅ | ✅ | ✅ |
| POST `/invoices/{id}/reject` | ✅ | ✅ | ✅ |
| POST `/invoices/{id}/send-ksef` | ✅ | ❌ | ❌ |
| GET `/approvals/pending` | ✅ | ✅ | ✅ |

### Endpointy tylko dla Admina

| Endpoint | Uwagi |
|----------|-------|
| GET `/api/approvers/overview` | Tylko Admin — podgląd członków grupy (tylko odczyt) |
| POST `/api/sync/*` | Wszystkie operacje synchronizacji |
| CRUD ustawień/firm | Zarządzanie firmami |

## Nawigacja w interfejsie

| Element nawigacji | Admin | Użytkownik | Akceptant |
|-------------------|-------|------------|-----------|
| Dashboard | ✅ | ✅ | ✅ |
| Faktury | ✅ | ✅ | ❌ |
| Zatwierdzenia | ✅ | ✅ | ✅ |
| Raporty | ✅ | ✅ | ❌ |
| Prognozy | ✅ | ✅ | ❌ |
| Dostawcy | ✅ | ✅ | ❌ |
| Samofakturowanie | ✅ | ✅ | ✅ |
| Synchronizacja | ✅ | ❌ | ❌ |
| Ustawienia | ✅ | ❌ | ❌ |

## Zakres Akceptanta

Akceptanci mają dostęp **zakresowy** określany przez:

1. **Przypisania do centrów MPK** — centra kosztowe, w których użytkownik jest wymieniony jako akceptant (konfiguracja w Ustawienia → Centra kosztowe).
2. **Przypisania do dostawców** — dostawcy, dla których użytkownik jest ustawiony jako `sbContactUser` (kontakt ds. samofakturowania).

Zakres jest rozwiązywany przez `resolveApproverScope()` w `api/src/lib/auth/approver-scope.ts`.

## Integracja z Graph API

Przynależność do grupy Akceptantów jest również weryfikowana po stronie serwera za pomocą Microsoft Graph API (client credentials flow) dla zakładki Ustawienia → Akceptanci. Wymaga to:

- Uprawnienia aplikacyjnego `GroupMember.Read.All` (z admin consent)
- Skonfigurowanego `AZURE_CLIENT_SECRET` dla API

---

**Ostatnia aktualizacja:** 2026-03-20
**Wersja:** 1.0
**Opiekun:** dvlp-dev team
