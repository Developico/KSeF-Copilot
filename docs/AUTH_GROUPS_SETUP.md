# Konfiguracja Autentykacji i Autoryzacji - KSeF Web App

## Spis treści

1. [Przegląd architektury](#przegląd-architektury)
2. [Porównanie z dvlp-planner](#porównanie-z-dvlp-planner)
3. [Konfiguracja grup bezpieczeństwa w Entra ID](#konfiguracja-grup-bezpieczeństwa-w-entra-id)
4. [Konfiguracja App Registration](#konfiguracja-app-registration)
5. [Zmienne środowiskowe](#zmienne-środowiskowe)
6. [Plan wdrożenia kodu](#plan-wdrożenia-kodu)
7. [Testowanie](#testowanie)
8. [Rozwiązywanie problemów](#rozwiązywanie-problemów)

---

## Przegląd architektury

### MSAL vs NextAuth.js

Projekt KSeF używa **MSAL (Microsoft Authentication Library)** zamiast NextAuth.js. Jest to lepsze rozwiązanie dla tego typu aplikacji:

| Aspekt | MSAL (KSeF) | NextAuth.js (Planner) |
|--------|-------------|----------------------|
| Architektura | Client-side (SPA) | Server-side (SSR) |
| Token storage | sessionStorage/memory | JWT cookie |
| Cookie size | ✅ Brak problemu | ⚠️ Wymaga volatile-store |
| Grupy/role | ID token claims | ID token claims + Graph API fallback |
| Refresh token | Automatyczny silent refresh | Ręczna obsługa |
| Kompleksność | Prosta | Złożona (431 errors, chunking) |

### Flow autentykacji

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │     │   Entra ID      │     │   Azure         │
│   (Next.js)     │────▶│   (MSAL)        │────▶│   Functions     │
│                 │     │                 │     │   (API)         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │  1. Login redirect    │                       │
        │  2. Groups in ID token│                       │
        ▼                       ▼                       ▼
   ┌─────────┐           ┌─────────┐           ┌─────────┐
   │ roles[] │           │ Access  │           │ Verify  │
   │ claim   │           │ Token   │           │ JWT     │
   └─────────┘           └─────────┘           └─────────┘
```

---

## Porównanie z dvlp-planner

### Problemy rozwiązane w KSeF

1. **HTTP 431 (Request Header Fields Too Large)**
   - Planner: Wymagał `volatile-store.ts` do przechowywania tokenów poza JWT cookie
   - KSeF: MSAL przechowuje tokeny w sessionStorage - brak limitu 4KB

2. **Groups overage (>200 grup)**
   - Planner: Fallback do Graph API w callback JWT
   - KSeF: Ten sam mechanizm można dodać, ale rzadziej potrzebny

3. **Refresh token handling**
   - Planner: Ręczna implementacja refresh w volatile-store
   - KSeF: MSAL automatycznie obsługuje silent refresh

### Elementy do wykorzystania z Planner

1. **Struktura ról** - hierarchia Administrator > User
2. **Konfiguracja grup przez env vars** - NEXT_PUBLIC_ADMIN_GROUP, NEXT_PUBLIC_USER_GROUP
3. **Komponent RequireRole** - już zaimplementowany w KSeF

---

## Konfiguracja grup bezpieczeństwa w Entra ID

### Krok 1: Utwórz grupy bezpieczeństwa

1. Przejdź do [Entra ID Portal](https://entra.microsoft.com)
2. Wybierz **Groups** → **All groups**
3. Kliknij **"+ New group"**

#### Grupa Administrator

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `DVLP-KSeF-Administrators` |
| Group description | `Administrators of KSeF integration - full access` |
| Microsoft Entra roles can be assigned | **No** |
| Membership type | **Assigned** |

Po utworzeniu, kliknij **"Members"** → **"+ Add members"** i dodaj użytkowników-administratorów.

#### Grupa User

| Pole | Wartość |
|------|---------|
| Group type | **Security** |
| Group name | `DVLP-KSeF-Users` |
| Group description | `Regular users of KSeF integration - read access` |
| Microsoft Entra roles can be assigned | **No** |
| Membership type | **Assigned** |

### Krok 2: Skopiuj Object ID grup

Po utworzeniu grup, skopiuj ich **Object ID** (GUID):

1. Kliknij na grupę
2. W zakładce **Overview** znajdź **Object ID**
3. Skopiuj wartość (np. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**Zanotuj:**
- `DVLP-KSeF-Administrators` Object ID: `___________________________`
- `DVLP-KSeF-Users` Object ID: `___________________________`

---

## Konfiguracja App Registration

### Krok 3: Włącz grupy w token claims

1. Przejdź do [App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps)
2. Wybierz swoją App Registration (np. `YOUR_WEB_APP`)
3. Przejdź do **Token configuration**

#### 3.1 Dodaj groups claim

1. Kliknij **"+ Add groups claim"**
2. Wybierz typ grup do uwzględnienia:
   - ✅ **Security groups**
   - ❌ Directory roles (nie potrzebne)
   - ❌ Groups assigned to the application (opcjonalnie)

3. W sekcji **Customize token properties by type**:
   
   **ID Token:**
   - ✅ Emit groups as role claims (opcjonalnie)
   - Group ID: **sAMAccountName** lub **Group ID** (rekomendowane: Group ID)

4. Kliknij **"Add"**

#### 3.2 Alternatywa: App Roles (opcjonalnie)

Jeśli wolisz używać App Roles zamiast grup bezpieczeństwa:

1. W App Registration przejdź do **App roles**
2. Kliknij **"+ Create app role"**

**Admin Role:**
| Pole | Wartość |
|------|---------|
| Display name | `Administrator` |
| Allowed member types | **Users/Groups** |
| Value | `Admin` |
| Description | `Full access to KSeF application` |

**User Role:**
| Pole | Wartość |
|------|---------|
| Display name | `User` |
| Allowed member types | **Users/Groups** |
| Value | `User` |
| Description | `Read access to KSeF application` |

3. Przypisz użytkowników/grupy do ról:
   - **Enterprise Applications** → wybierz aplikację → **Users and groups** → **+ Add user/group**

---

## Zmienne środowiskowe

### Web App (.env.local)

```bash
# =============================================================================
# Azure Authentication (Entra ID) - Web App
# =============================================================================
NEXT_PUBLIC_AZURE_CLIENT_ID=YOUR_CLIENT_ID
NEXT_PUBLIC_AZURE_TENANT_ID=YOUR_TENANT_ID

# API Scope (dla wywołań do Azure Functions)
NEXT_PUBLIC_API_SCOPE=api://ksef-api/.default

# =============================================================================
# Security Groups Object IDs
# =============================================================================
# Wklej Object ID grup utworzonych w Entra ID
NEXT_PUBLIC_ADMIN_GROUP=<object-id-grupy-administrators>
NEXT_PUBLIC_USER_GROUP=<object-id-grupy-users>
```

### Jak znaleźć API Scope

1. Przejdź do App Registration dla **API** (Azure Functions)
2. W **Expose an API** znajdź **Application ID URI**
3. Scope to: `{Application ID URI}/.default`
   - Przykład: `api://func-ksef-prod/.default`
   - Lub: `api://YOUR_CLIENT_ID/.default`

---

## Plan wdrożenia kodu

### Faza 1: Aktualizacja auth-config.ts

```typescript
// Dodaj konfigurację grup
export const groupConfig = {
  admin: process.env.NEXT_PUBLIC_ADMIN_GROUP || '',
  user: process.env.NEXT_PUBLIC_USER_GROUP || '',
}

// Dodaj scope dla grup
export const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read'],
}
```

### Faza 2: Rozszerzenie useUser hook

```typescript
export function useUser() {
  const { accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const user = accounts[0]
    ? {
        id: accounts[0].localAccountId,
        name: accounts[0].name || accounts[0].username,
        email: accounts[0].username,
        // Pobierz grupy z ID token claims
        groups: (accounts[0].idTokenClaims?.groups as string[]) || [],
        // Mapuj grupy na role
        roles: mapGroupsToRoles(accounts[0].idTokenClaims?.groups as string[]),
      }
    : null

  return {
    user,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
  }
}

function mapGroupsToRoles(groups: string[] = []): ('Admin' | 'User')[] {
  const roles: ('Admin' | 'User')[] = []
  
  if (groupConfig.admin && groups.includes(groupConfig.admin)) {
    roles.push('Admin')
  }
  if (groupConfig.user && groups.includes(groupConfig.user)) {
    roles.push('User')
  }
  
  return roles
}
```

### Faza 3: Komponent wymagający grupy

```typescript
export function RequireGroup({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser()
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (!user || user.roles.length === 0) {
    return <AccessDenied message="Nie należysz do żadnej grupy uprawniającej do dostępu." />
  }
  
  return <>{children}</>
}
```

### Faza 4: Obsługa Groups Overage

Gdy użytkownik ma >200 grup, Azure nie wysyła ich w tokenie. Trzeba dodać fallback:

```typescript
async function fetchGroupsFromGraph(accessToken: string): Promise<string[]> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  
  const data = await response.json()
  return data.value
    .filter((g: any) => g['@odata.type'] === '#microsoft.graph.group')
    .map((g: any) => g.id)
}
```

---

## Testowanie

### Checklist konfiguracji

- [ ] Grupy `DVLP-KSeF-Administrators` i `DVLP-KSeF-Users` utworzone w Entra ID
- [ ] Object ID grup skopiowane do zmiennych środowiskowych
- [ ] Groups claim dodany do Token configuration w App Registration
- [ ] Użytkownicy przypisani do odpowiednich grup
- [ ] Zmienne NEXT_PUBLIC_ADMIN_GROUP i NEXT_PUBLIC_USER_GROUP ustawione

### Test w przeglądarce

1. Otwórz Developer Tools → Application → Session Storage
2. Po zalogowaniu sprawdź czy istnieje klucz MSAL
3. Sprawdź wartość `idTokenClaims` - powinna zawierać `groups` array

### Weryfikacja grup

```javascript
// W konsoli przeglądarki
const accounts = msalInstance.getAllAccounts()
console.log('Groups:', accounts[0]?.idTokenClaims?.groups)
```

---

## Rozwiązywanie problemów

### Problem: Brak grup w tokenie

**Przyczyna:** Groups claim nie jest skonfigurowany lub użytkownik nie jest w żadnej grupie.

**Rozwiązanie:**
1. Sprawdź Token configuration w App Registration
2. Upewnij się, że użytkownik jest członkiem grupy
3. Wyloguj i zaloguj ponownie (nowy token)

### Problem: `_claim_sources` zamiast `groups`

**Przyczyna:** Użytkownik ma >200 grup (groups overage).

**Rozwiązanie:**
1. Zaimplementuj fallback do Graph API
2. Lub ogranicz liczbę grup użytkownika
3. Lub użyj App Roles zamiast grup

### Problem: Token nie zawiera custom claims

**Przyczyna:** App Registration nie ma odpowiednich uprawnień.

**Rozwiązanie:**
1. Dodaj uprawnienie `GroupMember.Read.All` do API permissions
2. Udziel admin consent

### Problem: Sesja wygasa zbyt szybko

**Przyczyna:** MSAL domyślnie używa sessionStorage.

**Rozwiązanie:**
```typescript
// W auth-config.ts zmień na localStorage
cache: {
  cacheLocation: 'localStorage', // zamiast 'sessionStorage'
  storeAuthStateInCookie: false,
}
```

---

## Hierarchia ról

| Rola | Uprawnienia | Dostęp |
|------|-------------|--------|
| **Admin** | Pełne | Wszystkie funkcje, ustawienia, synchronizacja, usuwanie |
| **User** | Odczyt | Przeglądanie faktur, raportów, eksport (bez modyfikacji) |
| **Brak grupy** | Brak | Odmowa dostępu do aplikacji |

### Mapowanie uprawnień

| Funkcja | Admin | User |
|---------|-------|------|
| Przeglądanie faktur | ✅ | ✅ |
| Eksport CSV | ✅ | ✅ |
| Raporty | ✅ | ✅ |
| Synchronizacja KSeF | ✅ | ❌ |
| Ustawienia | ✅ | ❌ |
| Usuwanie danych | ✅ | ❌ |

---

## Następne kroki

1. ✅ Dokumentacja grup przygotowana
2. → Utwórz grupy w Entra ID (krok 1-2)
3. → Skonfiguruj Token configuration (krok 3)
4. → Dodaj Object ID grup do .env.local
5. → Zaktualizuj kod auth-provider.tsx
6. → Przetestuj logowanie i role
