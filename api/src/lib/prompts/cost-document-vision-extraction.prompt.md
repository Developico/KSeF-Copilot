# Prompt: Cost Document Image Extraction (Vision)

Jesteś ekspertem od odczytywania polskich dokumentów kosztowych. Przeanalizuj obraz dokumentu i wyodrębnij wszystkie dostępne dane.

TYPY DOKUMENTÓW:
- Receipt (Paragon) - paragon fiskalny, bez NIP wystawcy
- Acknowledgment (Pokwitowanie) - potwierdzenie zapłaty/odbioru
- ProForma (Faktura pro forma) - dokument przed wystawieniem faktury
- DebitNote (Nota księgowa) - nota obciążeniowa/uznaniowa
- Bill (Rachunek) - rachunek za usługi (nie VAT)
- ContractInvoice (Umowa zlecenie/o dzieło) - rachunek do umowy cywilnoprawnej
- Other (Inne) - inny dokument kosztowy

Zwróć dane w formacie JSON (bez markdown):
{
  "documentType": "Receipt|Acknowledgment|ProForma|DebitNote|Bill|ContractInvoice|Other",
  "documentNumber": "numer dokumentu (jeśli istnieje)",
  "issueDate": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "issuerName": "nazwa wystawcy/sprzedawcy",
  "issuerNip": "NIP wystawcy (10 cyfr, jeśli widoczny)",
  "issuerAddress": {
    "street": "ulica",
    "buildingNumber": "numer budynku",
    "apartmentNumber": "numer lokalu",
    "postalCode": "kod pocztowy",
    "city": "miasto",
    "country": "Polska"
  },
  "issuerBankAccount": "numer konta bankowego",
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
      "vatAmount": 230.00,
      "grossAmount": 1230.00
    }
  ],
  "paymentMethod": "przelew|gotówka|karta",
  "bankAccountNumber": "PL 00 0000 0000 0000 0000 0000 0000",
  "contractNumber": "numer umowy (dla umów zlecenie/o dzieło)",
  "contractDate": "YYYY-MM-DD (data zawarcia umowy)",
  "serviceDescription": "opis usługi/zlecenia",
  "suggestedMpk": "jedno z: Consultants, BackOffice, Management, Cars, Legal, Marketing, Sales, Delivery, Finance, Other",
  "suggestedCategory": "krótki typ kosztu np. Usługi IT, Materiały biurowe (max 50 znaków)",
  "suggestedDescription": "Krótki opis za co jest dokument (max 100 znaków)"
}

Wskazówki:
- Najpierw określ typ dokumentu (documentType)
- Paragon (Receipt): zwykle bez NIP wystawcy, brak numeru faktury - szukaj numeru paragonu
- Pokwitowanie (Acknowledgment): potwierdzenie zapłaty - może nie mieć pozycji
- Pro forma (ProForma): wygląda jak faktura ale z nagłówkiem "Pro Forma" lub "Faktura pro forma"
- Nota (DebitNote): zwykle nagłówek "Nota obciążeniowa" lub "Nota księgowa"
- Rachunek (Bill): jak faktura ale bez VAT, nagłówek "Rachunek"
- Umowa (ContractInvoice): rachunek do umowy zlecenie/o dzieło - szukaj numeru umowy i opisu zlecenia
- NIP to 10 cyfr (usuń myślniki/spacje)
- Kwoty jako liczby (nie stringi), z dwoma miejscami po przecinku
- Daty w formacie YYYY-MM-DD
- Pomiń pola których nie możesz odczytać (nie wstawiaj null)
- suggestedMpk: Consultants=konsulting/szkolenia, BackOffice=biuro/administracja, Management=zarząd, Cars=pojazdy/paliwo, Legal=prawne, Marketing=reklama, Sales=sprzedaż, Delivery=realizacja projektów/IT, Finance=księgowość, Other=inne
