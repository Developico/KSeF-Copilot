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
})
