/**
 * Test data templates for cost document generation
 * Contains realistic Polish counterparty data grouped by document type,
 * amount ranges, categories, AI description templates, and tag pools.
 */

import { CostDocumentType } from '../../types/cost-document'

// ── Types ───────────────────────────────────────────────────

export interface CostCounterparty {
  name: string
  nip?: string
  address: string
  city: string
  postalCode: string
  country: string
  /** Typical category of expenses from this counterparty */
  category: string
  /** MPK key matching MpkValues in entities.ts */
  mpk: string
  /** Which cost document types this counterparty typically issues */
  documentTypes: CostDocumentType[]
}

export interface AmountRange {
  min: number
  max: number
}

export interface AiDescriptionTemplate {
  /** Pattern with {issuer} and {category} placeholders */
  pattern: string
  /** Confidence range [min, max] for this kind of AI extraction */
  confidence: [number, number]
}

// ── Counterparties (grouped by primary document type) ───────

/**
 * Receipt issuers — shops, gas stations, restaurants, taxis, small services
 */
const RECEIPT_ISSUERS: CostCounterparty[] = [
  {
    name: 'ORLEN S.A.',
    nip: '5272524787',
    address: 'ul. Chemików 7',
    city: 'Płock',
    postalCode: '09-411',
    country: 'PL',
    category: 'Paliwo',
    mpk: 'Cars',
    documentTypes: ['Receipt'],
  },
  {
    name: 'BP Europa SE Oddział w Polsce',
    nip: '5260300791',
    address: 'ul. Jasnogórska 1',
    city: 'Kraków',
    postalCode: '31-358',
    country: 'PL',
    category: 'Paliwo',
    mpk: 'Cars',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Circle K Polska Sp. z o.o.',
    nip: '6570000810',
    address: 'ul. Puławska 86',
    city: 'Warszawa',
    postalCode: '02-603',
    country: 'PL',
    category: 'Paliwo',
    mpk: 'Cars',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Żabka Polska S.A.',
    nip: '7811767421',
    address: 'ul. Stanisława Matyi 8',
    city: 'Poznań',
    postalCode: '61-586',
    country: 'PL',
    category: 'Materiały biurowe',
    mpk: 'BackOffice',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Biedronka (Jeronimo Martins)',
    nip: '7791011327',
    address: 'ul. Żniwna 5',
    city: 'Kostrzyn',
    postalCode: '62-025',
    country: 'PL',
    category: 'Materiały biurowe',
    mpk: 'BackOffice',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Media Expert (TERG S.A.)',
    nip: '5862145029',
    address: 'ul. Za Dworcem 1D',
    city: 'Złotów',
    postalCode: '77-400',
    country: 'PL',
    category: 'Elektronika',
    mpk: 'BackOffice',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Uber Poland Sp. z o.o.',
    nip: '5252687053',
    address: 'ul. Marszałkowska 76',
    city: 'Warszawa',
    postalCode: '00-517',
    country: 'PL',
    category: 'Transport',
    mpk: 'Cars',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Bolt Poland Sp. z o.o.',
    nip: '5252772460',
    address: 'ul. Chmielna 73',
    city: 'Warszawa',
    postalCode: '00-801',
    country: 'PL',
    category: 'Transport',
    mpk: 'Cars',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Starbucks (AmRest Sp. z o.o.)',
    nip: '8960004752',
    address: 'pl. Grunwaldzki 25-27',
    city: 'Wrocław',
    postalCode: '50-365',
    country: 'PL',
    category: 'Gastronomia',
    mpk: 'BackOffice',
    documentTypes: ['Receipt'],
  },
  {
    name: 'Costa Coffee (Lagardere Travel Retail)',
    nip: '5260207427',
    address: 'ul. Żwirki i Wigury 1',
    city: 'Warszawa',
    postalCode: '00-906',
    country: 'PL',
    category: 'Gastronomia',
    mpk: 'BackOffice',
    documentTypes: ['Receipt'],
  },
]

/**
 * Acknowledgment issuers — individuals, fees, couriers
 */
const ACKNOWLEDGMENT_ISSUERS: CostCounterparty[] = [
  {
    name: 'Urząd Miasta Stołecznego Warszawy',
    address: 'pl. Bankowy 3/5',
    city: 'Warszawa',
    postalCode: '00-950',
    country: 'PL',
    category: 'Opłaty urzędowe',
    mpk: 'BackOffice',
    documentTypes: ['Acknowledgment'],
  },
  {
    name: 'Sąd Rejonowy dla m.st. Warszawy',
    address: 'ul. Marszałkowska 82',
    city: 'Warszawa',
    postalCode: '00-517',
    country: 'PL',
    category: 'Opłaty sądowe',
    mpk: 'Legal',
    documentTypes: ['Acknowledgment'],
  },
  {
    name: 'Krajowy Rejestr Sądowy',
    address: 'ul. Czerniakowska 100',
    city: 'Warszawa',
    postalCode: '00-454',
    country: 'PL',
    category: 'Opłaty rejestrowe',
    mpk: 'Legal',
    documentTypes: ['Acknowledgment'],
  },
  {
    name: 'Urząd Skarbowy Warszawa-Mokotów',
    address: 'ul. Rakowiecka 25',
    city: 'Warszawa',
    postalCode: '02-517',
    country: 'PL',
    category: 'Opłaty skarbowe',
    mpk: 'Finance',
    documentTypes: ['Acknowledgment'],
  },
  {
    name: 'InPost Sp. z o.o.',
    nip: '6793087624',
    address: 'ul. Wielicka 28',
    city: 'Kraków',
    postalCode: '30-552',
    country: 'PL',
    category: 'Przesyłki',
    mpk: 'Delivery',
    documentTypes: ['Acknowledgment'],
  },
  {
    name: 'Poczta Polska S.A.',
    nip: '5260200350',
    address: 'ul. Rodziny Hiszpańskich 8',
    city: 'Warszawa',
    postalCode: '00-940',
    country: 'PL',
    category: 'Usługi pocztowe',
    mpk: 'Delivery',
    documentTypes: ['Acknowledgment'],
  },
]

/**
 * Pro forma issuers — IT vendors, training, events, pre-payments
 */
const PROFORMA_ISSUERS: CostCounterparty[] = [
  {
    name: 'Atlassian Pty Ltd',
    address: '341 George Street',
    city: 'Sydney',
    postalCode: 'NSW 2000',
    country: 'AU',
    category: 'Licencje IT',
    mpk: 'Consultants',
    documentTypes: ['ProForma'],
  },
  {
    name: 'JetBrains s.r.o.',
    address: 'Na Hřebenech II 1718/10',
    city: 'Praha',
    postalCode: '140 00',
    country: 'CZ',
    category: 'Licencje IT',
    mpk: 'Consultants',
    documentTypes: ['ProForma'],
  },
  {
    name: 'Vercel Inc.',
    address: '340 S Lemon Ave #4133',
    city: 'Walnut',
    postalCode: 'CA 91789',
    country: 'US',
    category: 'Cloud Services',
    mpk: 'Consultants',
    documentTypes: ['ProForma'],
  },
  {
    name: 'Centrum Konferencyjne WEST GATE',
    nip: '5252487325',
    address: 'Al. Jerozolimskie 92',
    city: 'Warszawa',
    postalCode: '00-807',
    country: 'PL',
    category: 'Szkolenia',
    mpk: 'Management',
    documentTypes: ['ProForma'],
  },
  {
    name: 'Altkom Akademia S.A.',
    nip: '5213105600',
    address: 'ul. Chłodna 51',
    city: 'Warszawa',
    postalCode: '00-867',
    country: 'PL',
    category: 'Szkolenia',
    mpk: 'Management',
    documentTypes: ['ProForma'],
  },
  {
    name: 'GitHub Inc.',
    address: '88 Colin P Kelly Jr St',
    city: 'San Francisco',
    postalCode: 'CA 94107',
    country: 'US',
    category: 'Licencje IT',
    mpk: 'Consultants',
    documentTypes: ['ProForma'],
  },
]

/**
 * Debit note issuers — interest, penalties, compensations
 */
const DEBIT_NOTE_ISSUERS: CostCounterparty[] = [
  {
    name: 'PKO Bank Polski S.A.',
    nip: '5250007738',
    address: 'ul. Puławska 15',
    city: 'Warszawa',
    postalCode: '02-515',
    country: 'PL',
    category: 'Odsetki bankowe',
    mpk: 'Finance',
    documentTypes: ['DebitNote'],
  },
  {
    name: 'mBank S.A.',
    nip: '5260215088',
    address: 'ul. Prosta 18',
    city: 'Warszawa',
    postalCode: '00-850',
    country: 'PL',
    category: 'Opłaty bankowe',
    mpk: 'Finance',
    documentTypes: ['DebitNote'],
  },
  {
    name: 'Santander Bank Polska S.A.',
    nip: '8960003354',
    address: 'al. Jana Pawła II 17',
    city: 'Warszawa',
    postalCode: '00-854',
    country: 'PL',
    category: 'Odsetki bankowe',
    mpk: 'Finance',
    documentTypes: ['DebitNote'],
  },
  {
    name: 'Zarząd Dróg Miejskich',
    nip: '5252312803',
    address: 'ul. Chmielna 120',
    city: 'Warszawa',
    postalCode: '00-801',
    country: 'PL',
    category: 'Kary umowne',
    mpk: 'Cars',
    documentTypes: ['DebitNote'],
  },
  {
    name: 'ZUS I Oddział w Warszawie',
    nip: '5210037682',
    address: 'ul. Senatorska 6/8',
    city: 'Warszawa',
    postalCode: '00-917',
    country: 'PL',
    category: 'Składki',
    mpk: 'Finance',
    documentTypes: ['DebitNote'],
  },
]

/**
 * Bill issuers — freelancers, translators, repair shops
 */
const BILL_ISSUERS: CostCounterparty[] = [
  {
    name: 'Jan Kowalski — Tłumacz przysięgły',
    nip: '7261234567',
    address: 'ul. Mokotowska 14/3',
    city: 'Warszawa',
    postalCode: '00-561',
    country: 'PL',
    category: 'Tłumaczenia',
    mpk: 'BackOffice',
    documentTypes: ['Bill'],
  },
  {
    name: 'Anna Nowak — Biuro Rachunkowe',
    nip: '5311234567',
    address: 'ul. Złota 59',
    city: 'Warszawa',
    postalCode: '00-120',
    country: 'PL',
    category: 'Usługi księgowe',
    mpk: 'Finance',
    documentTypes: ['Bill'],
  },
  {
    name: 'Auto-Serwis Makowski',
    nip: '5242345678',
    address: 'ul. Modlińska 310',
    city: 'Warszawa',
    postalCode: '03-152',
    country: 'PL',
    category: 'Naprawy pojazdów',
    mpk: 'Cars',
    documentTypes: ['Bill'],
  },
  {
    name: 'BHP Partner Sp. z o.o.',
    nip: '6311234567',
    address: 'ul. Przemysłowa 8',
    city: 'Katowice',
    postalCode: '40-020',
    country: 'PL',
    category: 'Szkolenia BHP',
    mpk: 'BackOffice',
    documentTypes: ['Bill'],
  },
  {
    name: 'Klimat-Service S.C.',
    nip: '6791234567',
    address: 'ul. Zakrzówek 2',
    city: 'Kraków',
    postalCode: '30-001',
    country: 'PL',
    category: 'Serwis klimatyzacji',
    mpk: 'BackOffice',
    documentTypes: ['Bill'],
  },
  {
    name: 'Tomasz Wiśniewski — Fotograf',
    nip: '8431234567',
    address: 'ul. Chmielna 10',
    city: 'Warszawa',
    postalCode: '00-020',
    country: 'PL',
    category: 'Usługi fotograficzne',
    mpk: 'Marketing',
    documentTypes: ['Bill'],
  },
]

/**
 * Contract/work order issuers — designers, developers, consultants
 */
const CONTRACT_ISSUERS: CostCounterparty[] = [
  {
    name: 'Piotr Zieliński — UX Design',
    nip: '7321234567',
    address: 'ul. Nowogrodzka 50',
    city: 'Warszawa',
    postalCode: '00-695',
    country: 'PL',
    category: 'Usługi graficzne',
    mpk: 'Marketing',
    documentTypes: ['ContractInvoice'],
  },
  {
    name: 'Marta Kamińska — Frontend Dev',
    nip: '5421234567',
    address: 'ul. Piłsudskiego 44',
    city: 'Wrocław',
    postalCode: '50-032',
    country: 'PL',
    category: 'Usługi programistyczne',
    mpk: 'Consultants',
    documentTypes: ['ContractInvoice'],
  },
  {
    name: 'Kancelaria Doradcza Strategia Sp.j.',
    nip: '5262345678',
    address: 'ul. Wspólna 47/49',
    city: 'Warszawa',
    postalCode: '00-684',
    country: 'PL',
    category: 'Doradztwo biznesowe',
    mpk: 'Management',
    documentTypes: ['ContractInvoice'],
  },
  {
    name: 'Adam Wójcik — Data Analyst',
    nip: '6572345678',
    address: 'ul. Grodzka 42',
    city: 'Kraków',
    postalCode: '31-044',
    country: 'PL',
    category: 'Analiza danych',
    mpk: 'Consultants',
    documentTypes: ['ContractInvoice'],
  },
  {
    name: 'Ewa Lewandowska — Content Writer',
    nip: '7281234567',
    address: 'ul. Piotrkowska 80',
    city: 'Łódź',
    postalCode: '90-102',
    country: 'PL',
    category: 'Copywriting',
    mpk: 'Marketing',
    documentTypes: ['ContractInvoice'],
  },
]

/**
 * Other document issuers — bank fees, memberships, licenses, subscriptions
 */
const OTHER_ISSUERS: CostCounterparty[] = [
  {
    name: 'ING Bank Śląski S.A.',
    nip: '6340135475',
    address: 'ul. Sokolska 34',
    city: 'Katowice',
    postalCode: '40-086',
    country: 'PL',
    category: 'Opłaty bankowe',
    mpk: 'Finance',
    documentTypes: ['Other'],
  },
  {
    name: 'Polska Izba Informatyki i Telekomunikacji',
    nip: '5260003891',
    address: 'ul. Koszykowa 54',
    city: 'Warszawa',
    postalCode: '00-675',
    country: 'PL',
    category: 'Składki członkowskie',
    mpk: 'Management',
    documentTypes: ['Other'],
  },
  {
    name: 'PFRON',
    nip: '0120000026',
    address: 'al. Jana Pawła II 13',
    city: 'Warszawa',
    postalCode: '00-828',
    country: 'PL',
    category: 'Wpłaty obowiązkowe',
    mpk: 'Finance',
    documentTypes: ['Other'],
  },
  {
    name: 'Asseco Poland S.A.',
    nip: '5220002846',
    address: 'ul. Olchowa 14',
    city: 'Rzeszów',
    postalCode: '35-322',
    country: 'PL',
    category: 'Licencje oprogramowania',
    mpk: 'Consultants',
    documentTypes: ['Other'],
  },
  {
    name: 'PKP Intercity S.A.',
    nip: '5260003332',
    address: 'ul. Żelazna 59A',
    city: 'Warszawa',
    postalCode: '00-848',
    country: 'PL',
    category: 'Podróże służbowe',
    mpk: 'BackOffice',
    documentTypes: ['Other'],
  },
  {
    name: 'LOT Polish Airlines',
    nip: '5220003556',
    address: 'ul. Komitetu Obrony Robotników 43',
    city: 'Warszawa',
    postalCode: '02-146',
    country: 'PL',
    category: 'Podróże służbowe',
    mpk: 'Management',
    documentTypes: ['Other'],
  },
]

// ── Merged counterparty pool ────────────────────────────────

/**
 * All counterparties grouped by document type for easy lookup
 */
export const COUNTERPARTIES_BY_TYPE: Record<CostDocumentType, readonly CostCounterparty[]> = {
  Receipt: RECEIPT_ISSUERS,
  Acknowledgment: ACKNOWLEDGMENT_ISSUERS,
  ProForma: PROFORMA_ISSUERS,
  DebitNote: DEBIT_NOTE_ISSUERS,
  Bill: BILL_ISSUERS,
  ContractInvoice: CONTRACT_ISSUERS,
  Other: OTHER_ISSUERS,
} as const

/**
 * Flat array of all counterparties
 */
export const ALL_COUNTERPARTIES: readonly CostCounterparty[] = [
  ...RECEIPT_ISSUERS,
  ...ACKNOWLEDGMENT_ISSUERS,
  ...PROFORMA_ISSUERS,
  ...DEBIT_NOTE_ISSUERS,
  ...BILL_ISSUERS,
  ...CONTRACT_ISSUERS,
  ...OTHER_ISSUERS,
] as const

// ── Amount ranges by document type ──────────────────────────

export const COST_AMOUNT_RANGES: Record<CostDocumentType, AmountRange> = {
  Receipt: { min: 5, max: 500 },
  Acknowledgment: { min: 10, max: 2000 },
  ProForma: { min: 500, max: 50000 },
  DebitNote: { min: 100, max: 20000 },
  Bill: { min: 200, max: 15000 },
  ContractInvoice: { min: 1000, max: 30000 },
  Other: { min: 50, max: 10000 },
} as const

// ── Document type distribution weights ──────────────────────

/**
 * Weights reflecting realistic frequency of each document type.
 * Receipts and bills are much more common than contract invoices.
 */
export const DOCUMENT_TYPE_WEIGHTS: Record<CostDocumentType, number> = {
  Receipt: 35,
  Acknowledgment: 10,
  ProForma: 10,
  DebitNote: 8,
  Bill: 20,
  ContractInvoice: 10,
  Other: 7,
} as const

// ── Categories per document type ────────────────────────────

export const CATEGORIES_BY_TYPE: Record<CostDocumentType, readonly string[]> = {
  Receipt: ['Paliwo', 'Materiały biurowe', 'Elektronika', 'Transport', 'Gastronomia', 'Parking', 'Artykuły spożywcze'],
  Acknowledgment: ['Opłaty urzędowe', 'Opłaty sądowe', 'Opłaty rejestrowe', 'Opłaty skarbowe', 'Przesyłki', 'Usługi pocztowe'],
  ProForma: ['Licencje IT', 'Cloud Services', 'Szkolenia', 'Konferencje', 'Hosting'],
  DebitNote: ['Odsetki bankowe', 'Opłaty bankowe', 'Kary umowne', 'Kompensaty', 'Składki'],
  Bill: ['Tłumaczenia', 'Usługi księgowe', 'Naprawy pojazdów', 'Szkolenia BHP', 'Serwis klimatyzacji', 'Usługi fotograficzne'],
  ContractInvoice: ['Usługi graficzne', 'Usługi programistyczne', 'Doradztwo biznesowe', 'Analiza danych', 'Copywriting'],
  Other: ['Opłaty bankowe', 'Składki członkowskie', 'Wpłaty obowiązkowe', 'Licencje oprogramowania', 'Podróże służbowe'],
} as const

// ── Tags pool ───────────────────────────────────────────────

export const TAG_POOL = [
  'pilne', 'do-rozliczenia', 'Q1', 'Q2', 'Q3', 'Q4',
  'projekt-A', 'projekt-B', 'projekt-ksef', 'biuro',
  'samochód', 'delegacja', 'marketing', 'szkolenie',
  'infrastruktura', 'księgowość', 'IT', 'HR',
  'powtarzalny', 'jednorazowy', 'do-zwrotu',
] as const

// ── AI description templates ────────────────────────────────

export const AI_DESCRIPTION_TEMPLATES: Record<CostDocumentType, readonly AiDescriptionTemplate[]> = {
  Receipt: [
    { pattern: 'Tankowanie paliwa ON, stacja {issuer}', confidence: [0.85, 0.97] },
    { pattern: 'Zakup materiałów biurowych — {issuer}', confidence: [0.80, 0.95] },
    { pattern: 'Kurs taksówką {issuer} — przejazd służbowy', confidence: [0.75, 0.92] },
    { pattern: 'Zakup artykułów spożywczych na spotkanie firmowe', confidence: [0.70, 0.88] },
    { pattern: 'Opłata parkingowa — {category}', confidence: [0.82, 0.94] },
    { pattern: 'Kawa i catering — spotkanie z klientem, {issuer}', confidence: [0.78, 0.93] },
  ],
  Acknowledgment: [
    { pattern: 'Opłata skarbowa za pełnomocnictwo — {issuer}', confidence: [0.88, 0.97] },
    { pattern: 'Opłata sądowa — wpis KRS', confidence: [0.85, 0.96] },
    { pattern: 'Pokwitowanie nadania przesyłki poleconej — {issuer}', confidence: [0.80, 0.93] },
    { pattern: 'Opłata za odpis z rejestru — {issuer}', confidence: [0.82, 0.95] },
  ],
  ProForma: [
    { pattern: 'Przedpłata za licencję {issuer} — plan roczny', confidence: [0.90, 0.98] },
    { pattern: 'Rezerwacja szkolenia „{category}" — {issuer}', confidence: [0.85, 0.95] },
    { pattern: 'Pre-payment za hosting {issuer} — {category}', confidence: [0.88, 0.96] },
    { pattern: 'Zaliczka na konferencję — {issuer}', confidence: [0.83, 0.94] },
  ],
  DebitNote: [
    { pattern: 'Nota odsetkowa za opóźnienie w płatności — {issuer}', confidence: [0.92, 0.98] },
    { pattern: 'Opłata za prowadzenie rachunku — {issuer}', confidence: [0.90, 0.97] },
    { pattern: 'Kara umowna za nieterminowe wykonanie — {issuer}', confidence: [0.88, 0.96] },
    { pattern: 'Nota obciążeniowa — kompensata należności', confidence: [0.85, 0.95] },
  ],
  Bill: [
    { pattern: 'Tłumaczenie dokumentacji technicznej — {issuer}', confidence: [0.87, 0.96] },
    { pattern: 'Usługa księgowa za miesiąc — {issuer}', confidence: [0.90, 0.97] },
    { pattern: 'Naprawa i przegląd samochodu służbowego — {issuer}', confidence: [0.85, 0.95] },
    { pattern: 'Szkolenie BHP pracowników — {issuer}', confidence: [0.88, 0.96] },
    { pattern: 'Sesja fotograficzna produktów — {issuer}', confidence: [0.82, 0.94] },
  ],
  ContractInvoice: [
    { pattern: 'Realizacja projektu graficznego — materiały marketingowe', confidence: [0.85, 0.95] },
    { pattern: 'Rozwój aplikacji — sprint {category}, {issuer}', confidence: [0.88, 0.96] },
    { pattern: 'Doradztwo strategiczne — raport kwartalny, {issuer}', confidence: [0.86, 0.95] },
    { pattern: 'Analiza danych sprzedażowych — {issuer}', confidence: [0.84, 0.94] },
    { pattern: 'Przygotowanie treści marketingowych — blog + social media', confidence: [0.82, 0.93] },
  ],
  Other: [
    { pattern: 'Opłata za przelew zagraniczny — {issuer}', confidence: [0.80, 0.93] },
    { pattern: 'Składka członkowska — {issuer}', confidence: [0.85, 0.95] },
    { pattern: 'Bilet lotniczy — podróż służbowa do {category}', confidence: [0.75, 0.90] },
    { pattern: 'Bilet kolejowy — delegacja Warszawa–Kraków', confidence: [0.78, 0.92] },
    { pattern: 'Roczna licencja oprogramowania — {issuer}', confidence: [0.88, 0.96] },
  ],
} as const

// ── AI MPK Suggestions ──────────────────────────────────────

/**
 * Maps category to suggested MPK — used for AI suggestion simulation
 */
export const AI_MPK_SUGGESTIONS: Record<string, string> = {
  'Paliwo': 'Cars',
  'Transport': 'Cars',
  'Naprawy pojazdów': 'Cars',
  'Serwis klimatyzacji': 'BackOffice',
  'Parking': 'Cars',
  'Materiały biurowe': 'BackOffice',
  'Elektronika': 'BackOffice',
  'Artykuły spożywcze': 'BackOffice',
  'Gastronomia': 'BackOffice',
  'Opłaty urzędowe': 'BackOffice',
  'Opłaty sądowe': 'Legal',
  'Opłaty rejestrowe': 'Legal',
  'Opłaty skarbowe': 'Finance',
  'Przesyłki': 'Delivery',
  'Usługi pocztowe': 'Delivery',
  'Licencje IT': 'Consultants',
  'Cloud Services': 'Consultants',
  'Hosting': 'Consultants',
  'Szkolenia': 'Management',
  'Konferencje': 'Management',
  'Odsetki bankowe': 'Finance',
  'Opłaty bankowe': 'Finance',
  'Kary umowne': 'Finance',
  'Kompensaty': 'Finance',
  'Składki': 'Finance',
  'Tłumaczenia': 'BackOffice',
  'Usługi księgowe': 'Finance',
  'Szkolenia BHP': 'BackOffice',
  'Usługi fotograficzne': 'Marketing',
  'Usługi graficzne': 'Marketing',
  'Usługi programistyczne': 'Consultants',
  'Doradztwo biznesowe': 'Management',
  'Analiza danych': 'Consultants',
  'Copywriting': 'Marketing',
  'Składki członkowskie': 'Management',
  'Wpłaty obowiązkowe': 'Finance',
  'Licencje oprogramowania': 'Consultants',
  'Podróże służbowe': 'Management',
}

// ── Currency distribution ───────────────────────────────────

export interface CurrencyWeight {
  currency: 'PLN' | 'EUR' | 'USD'
  weight: number
}

export const DEFAULT_CURRENCY_WEIGHTS: readonly CurrencyWeight[] = [
  { currency: 'PLN', weight: 85 },
  { currency: 'EUR', weight: 10 },
  { currency: 'USD', weight: 5 },
] as const

/**
 * Approximate exchange rates for generating grossAmountPln
 */
export const EXCHANGE_RATES: Record<string, { min: number; max: number }> = {
  EUR: { min: 4.25, max: 4.55 },
  USD: { min: 3.90, max: 4.20 },
  PLN: { min: 1, max: 1 },
}

// ── Document number prefixes by type ────────────────────────

export const DOCUMENT_NUMBER_PREFIXES: Record<CostDocumentType, readonly string[]> = {
  Receipt: ['PAR', 'P'],
  Acknowledgment: ['POK', 'PKW'],
  ProForma: ['PF', 'PRO'],
  DebitNote: ['NK', 'NOT'],
  Bill: ['R', 'RACH'],
  ContractInvoice: ['UZ', 'UD', 'UM'],
  Other: ['DOK', 'INNE'],
} as const

// ── Presets ──────────────────────────────────────────────────

export interface CostDocumentPreset {
  name: string
  description: string
  count: number
  documentTypes?: CostDocumentType[]
  paidPercentage: number
  approvedPercentage: number
  currencies?: readonly CurrencyWeight[]
  includeAiData: boolean
  hasDocumentPercentage: number
  amountMultiplier: number
  /** Months back from today for fromDate */
  monthsBack: number
}

export const PRESETS: Record<string, CostDocumentPreset> = {
  quick: {
    name: 'Quick',
    description: '10 mixed documents, current month — fast UI test',
    count: 10,
    paidPercentage: 50,
    approvedPercentage: 70,
    includeAiData: true,
    hasDocumentPercentage: 60,
    amountMultiplier: 1.0,
    monthsBack: 1,
  },
  realistic: {
    name: 'Realistic',
    description: '80 documents, 6 months, mixed statuses — demo data',
    count: 80,
    paidPercentage: 45,
    approvedPercentage: 65,
    includeAiData: true,
    hasDocumentPercentage: 70,
    amountMultiplier: 1.0,
    monthsBack: 6,
  },
  stress: {
    name: 'Stress',
    description: '500 documents, 12 months — performance test',
    count: 500,
    paidPercentage: 40,
    approvedPercentage: 60,
    includeAiData: true,
    hasDocumentPercentage: 75,
    amountMultiplier: 1.0,
    monthsBack: 12,
  },
  'approval-flow': {
    name: 'Approval Flow',
    description: '20 documents in various approval states — workflow test',
    count: 20,
    paidPercentage: 30,
    approvedPercentage: 0, // handled specially in generator
    includeAiData: false,
    hasDocumentPercentage: 80,
    amountMultiplier: 1.0,
    monthsBack: 3,
  },
  'budget-test': {
    name: 'Budget Test',
    description: '30 documents assigned to 2-3 MPK centers with high amounts — budget limit test',
    count: 30,
    paidPercentage: 60,
    approvedPercentage: 80,
    includeAiData: true,
    hasDocumentPercentage: 70,
    amountMultiplier: 2.5,
    monthsBack: 3,
  },
  'multi-currency': {
    name: 'Multi-Currency',
    description: '25 documents in PLN/EUR/USD with exchange rates — currency test',
    count: 25,
    paidPercentage: 50,
    approvedPercentage: 70,
    currencies: [
      { currency: 'PLN', weight: 40 },
      { currency: 'EUR', weight: 35 },
      { currency: 'USD', weight: 25 },
    ],
    includeAiData: true,
    hasDocumentPercentage: 65,
    amountMultiplier: 1.0,
    monthsBack: 4,
  },
  overdue: {
    name: 'Overdue',
    description: '20 documents with overdue payment dates — notification test',
    count: 20,
    paidPercentage: 10,
    approvedPercentage: 90,
    includeAiData: false,
    hasDocumentPercentage: 80,
    amountMultiplier: 1.0,
    monthsBack: 4,
  },
} as const
