import { describe, it, expect } from 'vitest'
import { parseInvoiceXml, validateParsedInvoice } from '../src/lib/ksef/parser'

// Sample FA(2) invoice XML for testing
const sampleInvoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>2024-01-15</DataWytworzeniaFa>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>1234567890</NIP>
      <Nazwa>Dostawca Sp. z o.o.</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <Ulica>Testowa</Ulica>
      <NrDomu>1</NrDomu>
      <KodPocztowy>00-001</KodPocztowy>
      <Miejscowosc>Warszawa</Miejscowosc>
    </Adres>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>
      <NIP>0987654321</NIP>
      <Nazwa>Nabywca S.A.</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <Ulica>Kupiecka</Ulica>
      <NrDomu>10</NrDomu>
      <NrLokalu>5</NrLokalu>
      <KodPocztowy>00-002</KodPocztowy>
      <Miejscowosc>Kraków</Miejscowosc>
    </Adres>
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>2024-01-15</P_1>
    <P_2>FV/2024/001</P_2>
    <P_13_1>10000.00</P_13_1>
    <P_14_1>2300.00</P_14_1>
    <P_15>12300.00</P_15>
    <TerminPlatnosci>
      <Termin>2024-02-14</Termin>
    </TerminPlatnosci>
    <FaWiersz>
      <NrWierszaFa>1</NrWierszaFa>
      <P_7>Usługi konsultingowe IT</P_7>
      <P_8A>100</P_8A>
      <P_8B>godz.</P_8B>
      <P_9A>100.00</P_9A>
      <P_11>10000.00</P_11>
      <P_12>23</P_12>
    </FaWiersz>
  </Fa>
</Faktura>`

describe('KSeF Parser', () => {
  describe('parseInvoiceXml', () => {
    it('should parse valid FA(2) XML', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.invoiceNumber).toBe('FV/2024/001')
      expect(result.invoiceDate).toBe('2024-01-15')
      expect(result.dueDate).toBe('2024-02-14')
    })

    it('should parse supplier information', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.supplier.nip).toBe('1234567890')
      expect(result.supplier.name).toBe('Dostawca Sp. z o.o.')
    })

    it('should parse buyer information', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.buyer.nip).toBe('0987654321')
      expect(result.buyer.name).toBe('Nabywca S.A.')
    })

    it('should parse amounts correctly', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.netAmount).toBe(10000)
      expect(result.grossAmount).toBe(12300)
      expect(result.vatAmount).toBe(2300)
    })

    it('should parse line items', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.items).toHaveLength(1)
      expect(result.items[0].description).toBe('Usługi konsultingowe IT')
      expect(result.items[0].quantity).toBe(100)
      expect(result.items[0].unit).toBe('godz.')
      expect(result.items[0].unitPrice).toBe(100)
      expect(result.items[0].netAmount).toBe(10000)
    })

    it('should store raw XML', () => {
      const result = parseInvoiceXml(sampleInvoiceXml)

      expect(result.rawXml).toBe(sampleInvoiceXml)
    })
  })

  describe('validateParsedInvoice', () => {
    it('should return no errors for valid invoice', () => {
      const parsed = parseInvoiceXml(sampleInvoiceXml)
      const errors = validateParsedInvoice(parsed)

      expect(errors).toHaveLength(0)
    })

    it('should detect missing invoice number', () => {
      const errors = validateParsedInvoice({
        invoiceNumber: '',
        invoiceDate: '2024-01-15',
        supplier: { nip: '1234567890', name: 'Test' },
        buyer: { nip: '0987654321', name: 'Buyer' },
        netAmount: 1000,
        vatAmount: 230,
        grossAmount: 1230,
        items: [],
        rawXml: '',
      })

      expect(errors).toContain('Missing invoice number')
    })

    it('should detect missing supplier NIP', () => {
      const errors = validateParsedInvoice({
        invoiceNumber: 'FV/2024/001',
        invoiceDate: '2024-01-15',
        supplier: { nip: '', name: 'Test' },
        buyer: { nip: '0987654321', name: 'Buyer' },
        netAmount: 1000,
        vatAmount: 230,
        grossAmount: 1230,
        items: [],
        rawXml: '',
      })

      expect(errors).toContain('Missing supplier NIP')
    })

    it('should detect invalid gross amount', () => {
      const errors = validateParsedInvoice({
        invoiceNumber: 'FV/2024/001',
        invoiceDate: '2024-01-15',
        supplier: { nip: '1234567890', name: 'Test' },
        buyer: { nip: '0987654321', name: 'Buyer' },
        netAmount: 1000,
        vatAmount: 230,
        grossAmount: 0,
        items: [],
        rawXml: '',
      })

      expect(errors).toContain('Invalid gross amount')
    })
  })
})

describe('Multiple line items', () => {
  const multiItemXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>1111111111</NIP>
      <Nazwa>Multi Supplier</Nazwa>
    </DaneIdentyfikacyjne>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne>
      <NIP>2222222222</NIP>
      <Nazwa>Multi Buyer</Nazwa>
    </DaneIdentyfikacyjne>
  </Podmiot2>
  <Fa>
    <P_1>2024-02-01</P_1>
    <P_2>FV/MULTI/001</P_2>
    <P_13_1>3000.00</P_13_1>
    <P_15>3690.00</P_15>
    <FaWiersz>
      <NrWierszaFa>1</NrWierszaFa>
      <P_7>Produkt A</P_7>
      <P_8A>10</P_8A>
      <P_8B>szt.</P_8B>
      <P_9A>100.00</P_9A>
      <P_11>1000.00</P_11>
      <P_12>23</P_12>
    </FaWiersz>
    <FaWiersz>
      <NrWierszaFa>2</NrWierszaFa>
      <P_7>Usługa B</P_7>
      <P_8A>20</P_8A>
      <P_8B>godz.</P_8B>
      <P_9A>100.00</P_9A>
      <P_11>2000.00</P_11>
      <P_12>23</P_12>
    </FaWiersz>
  </Fa>
</Faktura>`

  it('should parse multiple line items', () => {
    const result = parseInvoiceXml(multiItemXml)

    expect(result.items).toHaveLength(2)
    expect(result.items[0].description).toBe('Produkt A')
    expect(result.items[1].description).toBe('Usługa B')
  })

  it('should parse namespaced XML (FA(3) / KSeF API 2.0)', () => {
    const namespacedXml = `<?xml version="1.0" encoding="UTF-8"?>
<tns:Faktura xmlns:tns="http://crd.gov.pl/wzor/2025/06/25/1377">
  <tns:Naglowek>
    <tns:KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</tns:KodFormularza>
    <tns:WariantFormularza>3</tns:WariantFormularza>
  </tns:Naglowek>
  <tns:Podmiot1>
    <tns:DaneIdentyfikacyjne>
      <tns:NIP>1132737324</tns:NIP>
      <tns:Nazwa>BeInteractive.pl Arkadiusz Zwierzyński</tns:Nazwa>
    </tns:DaneIdentyfikacyjne>
  </tns:Podmiot1>
  <tns:Podmiot2>
    <tns:DaneIdentyfikacyjne>
      <tns:NIP>0000000000</tns:NIP>
      <tns:Nazwa>Developico sp. z o.o.</tns:Nazwa>
    </tns:DaneIdentyfikacyjne>
  </tns:Podmiot2>
  <tns:Fa>
    <tns:KodWaluty>PLN</tns:KodWaluty>
    <tns:P_1>2026-02-03</tns:P_1>
    <tns:P_2>2026/02/3</tns:P_2>
    <tns:P_13_1>649.19</tns:P_13_1>
    <tns:P_14_1>149.31</tns:P_14_1>
    <tns:P_15>799.50</tns:P_15>
    <tns:FaWiersz>
      <tns:NrWierszaFa>1</tns:NrWierszaFa>
      <tns:P_7>Usługi programistyczne</tns:P_7>
      <tns:P_8A>1</tns:P_8A>
      <tns:P_8B>szt.</tns:P_8B>
      <tns:P_9A>649.19</tns:P_9A>
      <tns:P_11>649.19</tns:P_11>
      <tns:P_12>23</tns:P_12>
    </tns:FaWiersz>
  </tns:Fa>
</tns:Faktura>`

    const result = parseInvoiceXml(namespacedXml)

    expect(result.invoiceNumber).toBe('2026/02/3')
    expect(result.invoiceDate).toBe('2026-02-03')
    expect(result.supplier.nip).toBe('1132737324')
    expect(result.supplier.name).toBe('BeInteractive.pl Arkadiusz Zwierzyński')
    expect(result.buyer.nip).toBe('0000000000')
    expect(result.buyer.name).toBe('Developico sp. z o.o.')
    expect(result.netAmount).toBe(649.19)
    expect(result.grossAmount).toBe(799.5)
    expect(result.vatAmount).toBeCloseTo(150.31, 2)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].description).toBe('Usługi programistyczne')
  })

  it('should parse FA(3) address (AdresL1/AdresL2 format)', () => {
    // Represents the new FA(3) schema used since 2025 (e.g. Cyber_Folks invoices)
    const fa3WithAddressXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/">
  <Naglowek><KodFormularza kodSystemowy="FA (3)" wersjaSchemy="1-0E">FA</KodFormularza></Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne><NIP>7792467259</NIP><Nazwa>CYBER_FOLKS SPÓŁKA AKCYJNA</Nazwa></DaneIdentyfikacyjne>
    <Adres><KodKraju>PL</KodKraju><AdresL1>ul. Wierzbięcice 1B</AdresL1><AdresL2>61-569 Poznań</AdresL2></Adres>
  </Podmiot1>
  <Podmiot2>
    <DaneIdentyfikacyjne><NIP>5272926984</NIP><Nazwa>Akademia Aplikacji Sp z o.o.</Nazwa></DaneIdentyfikacyjne>
    <Adres><KodKraju>PL</KodKraju><AdresL1>Hajoty 53/1</AdresL1><AdresL2>01-821 Warszawa</AdresL2></Adres>
  </Podmiot2>
  <Fa><P_1>2026-02-25</P_1><P_2>EQV/FV/2026/02/0029878</P_2><P_13_1>447.00</P_13_1><P_15>549.81</P_15>
    <FaWiersz><NrWierszaFa>1</NrWierszaFa><P_7>Usługa</P_7><P_8A>1</P_8A><P_8B>szt.</P_8B><P_9A>447.00</P_9A><P_11>447.00</P_11><P_12>23</P_12></FaWiersz>
  </Fa>
</Faktura>`

    const result = parseInvoiceXml(fa3WithAddressXml)

    // Supplier address: AdresL1 + AdresL2 joined with ", "
    expect(result.supplier.address).toBe('ul. Wierzbięcice 1B, 61-569 Poznań')
    expect(result.supplier.country).toBe('PL')

    // Buyer address
    expect(result.buyer.address).toBe('Hajoty 53/1, 01-821 Warszawa')
    expect(result.buyer.country).toBe('PL')
  })

  it('should parse FA(2) address (structured fields) with correct spacing', () => {
    const result = parseInvoiceXml(sampleInvoiceXml)

    // FA(2): "Ulica NrDomu, KodPocztowy Miejscowosc" — space between street and number
    expect(result.supplier.address).toBe('Testowa 1, 00-001 Warszawa')
    expect(result.supplier.country).toBe('PL')

    // Buyer has NrLokalu: "Ulica NrDomu/NrLokalu, KodPocztowy Miejscowosc"
    expect(result.buyer.address).toBe('Kupiecka 10/5, 00-002 Kraków')
    expect(result.buyer.country).toBe('PL')
  })

  it('should return empty string for missing address in FA(3)', () => {
    const noAddressXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2025/06/25/13775/">
  <Naglowek><KodFormularza>FA</KodFormularza></Naglowek>
  <Podmiot1><DaneIdentyfikacyjne><NIP>1234567890</NIP><Nazwa>Test</Nazwa></DaneIdentyfikacyjne></Podmiot1>
  <Podmiot2><DaneIdentyfikacyjne><NIP>0987654321</NIP><Nazwa>Buyer</Nazwa></DaneIdentyfikacyjne></Podmiot2>
  <Fa><P_1>2026-01-01</P_1><P_2>FV/001</P_2><P_13_1>100</P_13_1><P_15>123</P_15>
    <FaWiersz><NrWierszaFa>1</NrWierszaFa><P_7>Test</P_7><P_8A>1</P_8A><P_8B>szt.</P_8B><P_9A>100</P_9A><P_11>100</P_11><P_12>23</P_12></FaWiersz>
  </Fa>
</Faktura>`

    const result = parseInvoiceXml(noAddressXml)
    expect(result.supplier.address).toBe('')
    expect(result.supplier.country).toBeUndefined()
  })
})
