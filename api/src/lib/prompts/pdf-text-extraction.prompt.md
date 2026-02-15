# Prompt: PDF Text Extraction

Przeanalizuj tekst wyodrębniony z polskiej faktury PDF i wyodrębnij dane strukturalne.

TEKST FAKTURY:
---
{{pdfText}}
---

Zwróć dane w formacie JSON (bez markdown):
{
  "invoiceNumber": "numer faktury",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "supplierName": "nazwa sprzedawcy",
  "supplierNip": "NIP sprzedawcy (10 cyfr)",
  "supplierAddress": {
    "street": "ulica",
    "buildingNumber": "numer budynku",
    "postalCode": "kod pocztowy",
    "city": "miasto"
  },
  "supplierBankAccount": "numer konta",
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
  "suggestedMpk": "jedno z: Consultants, BackOffice, Management, Cars, Legal, Marketing, Sales, Delivery, Finance, Other",
  "suggestedCategory": "krótki typ kosztu np. Usługi IT, Materiały biurowe (max 50 znaków)",
  "suggestedDescription": "Krótki opis za co jest faktura (max 100 znaków)"
}

Wskazówki:
- NIP to 10 cyfr (usuń myślniki/spacje)
- Kwoty jako liczby, nie stringi
- Daty w formacie YYYY-MM-DD
- Pomiń pola których nie możesz odczytać
- Sprzedawca/Dostawca = supplier, Nabywca = buyer
- suggestedMpk: Consultants=konsulting/szkolenia, BackOffice=biuro/administracja, Management=zarząd, Cars=pojazdy/paliwo, Legal=prawne, Marketing=reklama, Sales=sprzedaż, Delivery=realizacja projektów/IT, Finance=księgowość, Other=inne

Odpowiedz TYLKO JSON-em.
