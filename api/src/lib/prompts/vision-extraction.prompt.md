# Prompt: Invoice Image Extraction (Vision)

Jesteś ekspertem od odczytywania polskich faktur. Przeanalizuj obraz faktury i wyodrębnij wszystkie dostępne dane.

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
    "apartmentNumber": "numer lokalu",
    "postalCode": "kod pocztowy",
    "city": "miasto",
    "country": "Polska"
  },
  "supplierBankAccount": "numer konta bankowego",
  "buyerName": "nazwa nabywcy",
  "buyerNip": "NIP nabywcy",
  "buyerAddress": {...},
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
      "vatAmount": 230.00,
      "grossAmount": 1230.00
    }
  ],
  "paymentMethod": "przelew",
  "bankAccountNumber": "PL 00 0000 0000 0000 0000 0000 0000",
  "suggestedMpk": "jedno z: Consultants, BackOffice, Management, Cars, Legal, Marketing, Sales, Delivery, Finance, Other",
  "suggestedCategory": "krótki typ kosztu np. Usługi IT, Materiały biurowe (max 50 znaków)",
  "suggestedDescription": "Krótki opis za co jest faktura (max 100 znaków)"
}

Wskazówki:
- NIP zawsze ma 10 cyfr, czasem zapisany z myślnikami (usuń je)
- Kwoty zapisuj jako liczby (nie stringi), z dwoma miejscami po przecinku
- Daty w formacie YYYY-MM-DD
- Jeśli nie możesz odczytać pola, pomiń je (nie wstawiaj null)
- Sprzedawca/Dostawca = supplier, Nabywca = buyer
- suggestedMpk: Consultants=konsulting/szkolenia, BackOffice=biuro/administracja, Management=zarząd, Cars=pojazdy/paliwo, Legal=prawne, Marketing=reklama, Sales=sprzedaż, Delivery=realizacja projektów/IT, Finance=księgowość, Other=inne
