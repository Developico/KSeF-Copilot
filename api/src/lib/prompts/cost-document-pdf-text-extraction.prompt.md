# Prompt: Cost Document PDF Text Extraction

Przeanalizuj tekst wyodrębniony z polskiego dokumentu kosztowego i wyodrębnij dane strukturalne.

TYPY DOKUMENTÓW (określ na podstawie treści):
- Receipt (Paragon) - paragon fiskalny
- Acknowledgment (Pokwitowanie) - potwierdzenie zapłaty/odbioru
- ProForma (Faktura pro forma)
- DebitNote (Nota księgowa/obciążeniowa)
- Bill (Rachunek)
- ContractInvoice (Umowa zlecenie/o dzieło - rachunek)
- Other (Inne)

TEKST DOKUMENTU:
---
{{pdfText}}
---

Zwróć dane w formacie JSON (bez markdown):
{
  "documentType": "Receipt|Acknowledgment|ProForma|DebitNote|Bill|ContractInvoice|Other",
  "documentNumber": "numer dokumentu",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "issuerName": "nazwa wystawcy/sprzedawcy",
  "issuerNip": "NIP wystawcy (10 cyfr)",
  "issuerAddress": {
    "street": "ulica",
    "buildingNumber": "numer budynku",
    "postalCode": "kod pocztowy",
    "city": "miasto"
  },
  "issuerBankAccount": "numer konta",
  "buyerName": "nazwa nabywcy",
  "buyerNip": "NIP nabywcy",
  "netAmount": 1000.00,
  "vatAmount": 230.00,
  "grossAmount": 1230.00,
  "currency": "PLN",
  "items": [
    {
      "description": "opis pozycji",
      "quantity": 1,
      "unit": "szt.",
      "netPrice": 1000.00,
      "vatRate": 23,
      "netAmount": 1000.00,
      "grossAmount": 1230.00
    }
  ],
  "contractNumber": "numer umowy (jeśli dotyczy)",
  "contractDate": "YYYY-MM-DD",
  "serviceDescription": "opis usługi/zlecenia",
  "suggestedMpk": "jedno z: Consultants, BackOffice, Management, Cars, Legal, Marketing, Sales, Delivery, Finance, Other",
  "suggestedCategory": "krótki typ kosztu np. Usługi IT, Materiały biurowe (max 50 znaków)",
  "suggestedDescription": "Krótki opis za co jest dokument (max 100 znaków)"
}

Wskazówki:
- Najpierw określ typ dokumentu (documentType) na podstawie nagłówka i treści
- Szukaj słów kluczowych: "Paragon", "Pokwitowanie", "Pro forma", "Nota", "Rachunek", "Umowa zlecenie"
- NIP to 10 cyfr (usuń myślniki/spacje)
- Kwoty jako liczby, nie stringi
- Daty w formacie YYYY-MM-DD
- Pomiń pola których nie możesz odczytać
- Wystawca/Sprzedawca = issuer, Nabywca = buyer
- suggestedMpk: Consultants=konsulting/szkolenia, BackOffice=biuro/administracja, Management=zarząd, Cars=pojazdy/paliwo, Legal=prawne, Marketing=reklama, Sales=sprzedaż, Delivery=realizacja projektów/IT, Finance=księgowość, Other=inne

Odpowiedz TYLKO JSON-em.
