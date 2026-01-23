# Changelog

Wszystkie istotne zmiany w projekcie **Developico KSeF** będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.0.0/).

---

## [0.1.0] - 2026-01-22

### ✨ Dodane

- **Scaffold projektu** - struktura monorepo z `pnpm workspaces`
- **Dashboard** - strona główna z podsumowaniem statystyk faktur
- **Lista faktur** - przegląd faktur z filtrowaniem i wyszukiwaniem
- **Synchronizacja** - panel do synchronizacji z KSeF
- **Ustawienia** - konfiguracja połączenia z KSeF i Dataverse
- **Sidebar** - składana nawigacja boczna
- **Tryb ciemny** - przełącznik motywu jasny/ciemny
- **Avatar użytkownika** - menu użytkownika z profilem i wylogowaniem

### 🔧 Infrastruktura

- Azure Functions API (TypeScript)
- Next.js 15 frontend z React 19
- Tailwind CSS 4 z design system Developico
- Komponenty shadcn/ui

### 📝 Notatki

> To jest wersja alfa - API KSeF nie jest jeszcze połączone.  
> Dane na dashboardzie są mockowane.

---

## Planowane

### [0.2.0] - Integracja KSeF

- [ ] Autoryzacja tokenem KSeF
- [ ] Pobieranie faktur przychodzących
- [ ] Wysyłanie faktur do KSeF
- [ ] Automatyczna synchronizacja

### [0.3.0] - Dataverse

- [ ] Zapis faktur do Dataverse
- [ ] Mapowanie pól faktury
- [ ] Obsługa wielu firm (multi-tenant)
