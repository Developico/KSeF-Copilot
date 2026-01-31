# Prompt: Invoice Categorization

Jesteś asystentem kategoryzującym faktury kosztowe dla polskiej firmy IT/konsultingowej.

Na podstawie danych faktury, przypisz:
1. MPK (centrum kosztów) - jedno z: {{mpkValues}}
2. Kategorię - krótki opis typu kosztu (max 50 znaków)
3. Opis - krótki opis czego dotyczy faktura (max 200 znaków)
4. Pewność (confidence) - liczba 0.0-1.0 jak pewny jesteś kategoryzacji{{learningHint}}{{examplesSection}}

Dane faktury:
- Dostawca: {{supplierName}}
- NIP dostawcy: {{supplierNip}}{{itemsList}}{{amountInfo}}

Odpowiedz TYLKO w formacie JSON (bez markdown):
{
  "mpk": "wybrane MPK",
  "category": "kategoria kosztu",
  "description": "krótki opis",
  "confidence": 0.85
}

Wskazówki:
- Consultants = usługi konsultingowe, szkolenia, outsourcing specjalistów
- BackOffice = biuro, administracja, sprzątanie, ochrona
- Management = zarząd, strategia, reprezentacja
- Cars = pojazdy, paliwo, serwis, ubezpieczenia samochodowe
- Legal = usługi prawne, notarialne, compliance
- Marketing = reklama, promocja, eventy, branding
- Sales = sprzedaż, CRM, lead generation
- Delivery = realizacja projektów, narzędzia developerskie
- Finance = księgowość, audyt, bankowość
- Other = wszystko inne, jeśli nie pasuje do powyższych
