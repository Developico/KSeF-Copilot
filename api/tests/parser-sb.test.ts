import { describe, it, expect } from 'vitest'
import { parseInvoiceXml, buildInvoiceXml } from '../src/lib/ksef/parser'
import type { KsefInvoice } from '../src/lib/ksef/types'

// Self-billing FA(2) invoice XML with Podmiot3 and P_17=1
const selfBillingXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>2025-01-15</DataWytworzeniaFa>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>1111111111</NIP>
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
      <NIP>2222222222</NIP>
      <Nazwa>Nabywca S.A.</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <Ulica>Kupiecka</Ulica>
      <NrDomu>10</NrDomu>
      <KodPocztowy>00-002</KodPocztowy>
      <Miejscowosc>Kraków</Miejscowosc>
    </Adres>
  </Podmiot2>
  <Podmiot3>
    <DaneIdentyfikacyjne>
      <NIP>2222222222</NIP>
      <Nazwa>Nabywca S.A.</Nazwa>
    </DaneIdentyfikacyjne>
    <Rola>1</Rola>
  </Podmiot3>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>2025-01-15</P_1>
    <P_2>SB/2025/001</P_2>
    <P_13_1>5000.00</P_13_1>
    <P_14_1>1150.00</P_14_1>
    <P_15>6150.00</P_15>
    <TerminPlatnosci>
      <Termin>2025-02-14</Termin>
    </TerminPlatnosci>
    <Adnotacje>
      <P_16>2</P_16>
      <P_17>1</P_17>
      <P_18>2</P_18>
      <P_18A>2</P_18A>
      <P_19>2</P_19>
      <P_22>2</P_22>
      <P_23>2</P_23>
      <P_PMarzy>2</P_PMarzy>
    </Adnotacje>
    <FaWiersz>
      <NrWierszaFa>1</NrWierszaFa>
      <P_7>Monthly consulting service</P_7>
      <P_8A>50</P_8A>
      <P_8B>godz.</P_8B>
      <P_9A>100.00</P_9A>
      <P_11>5000.00</P_11>
      <P_12>23</P_12>
    </FaWiersz>
  </Fa>
</Faktura>`

// Regular invoice XML (P_17=2, no Podmiot3)
const regularInvoiceXml = `<?xml version="1.0" encoding="UTF-8"?>
<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/">
  <Naglowek>
    <KodFormularza kodSystemowy="FA (2)" wersjaSchemy="1-0E">FA</KodFormularza>
    <WariantFormularza>2</WariantFormularza>
    <DataWytworzeniaFa>2025-01-15</DataWytworzeniaFa>
  </Naglowek>
  <Podmiot1>
    <DaneIdentyfikacyjne>
      <NIP>1111111111</NIP>
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
      <NIP>2222222222</NIP>
      <Nazwa>Nabywca S.A.</Nazwa>
    </DaneIdentyfikacyjne>
    <Adres>
      <KodKraju>PL</KodKraju>
      <Ulica>Kupiecka</Ulica>
      <NrDomu>10</NrDomu>
      <KodPocztowy>00-002</KodPocztowy>
      <Miejscowosc>Kraków</Miejscowosc>
    </Adres>
  </Podmiot2>
  <Fa>
    <KodWaluty>PLN</KodWaluty>
    <P_1>2025-01-15</P_1>
    <P_2>FV/2025/001</P_2>
    <P_13_1>10000.00</P_13_1>
    <P_14_1>2300.00</P_14_1>
    <P_15>12300.00</P_15>
    <Adnotacje>
      <P_16>2</P_16>
      <P_17>2</P_17>
      <P_18>2</P_18>
    </Adnotacje>
    <FaWiersz>
      <NrWierszaFa>1</NrWierszaFa>
      <P_7>IT Consulting</P_7>
      <P_8A>100</P_8A>
      <P_8B>godz.</P_8B>
      <P_9A>100.00</P_9A>
      <P_11>10000.00</P_11>
      <P_12>23</P_12>
    </FaWiersz>
  </Fa>
</Faktura>`

describe('Parser – self-billing', () => {
  describe('parseInvoiceXml – self-billing detection', () => {
    it('should detect self-billing from P_17=1', () => {
      const parsed = parseInvoiceXml(selfBillingXml)
      expect(parsed.isSelfBilling).toBe(true)
    })

    it('should parse Podmiot3 issuer data', () => {
      const parsed = parseInvoiceXml(selfBillingXml)
      expect(parsed.issuer).toBeDefined()
      expect(parsed.issuer!.nip).toBe('2222222222')
      expect(parsed.issuer!.name).toBe('Nabywca S.A.')
    })

    it('should not flag regular invoice as self-billing', () => {
      const parsed = parseInvoiceXml(regularInvoiceXml)
      expect(parsed.isSelfBilling).toBeUndefined()
      expect(parsed.issuer).toBeUndefined()
    })

    it('should still parse supplier and buyer correctly for self-billing invoice', () => {
      const parsed = parseInvoiceXml(selfBillingXml)
      expect(parsed.supplier.nip).toBe('1111111111')
      expect(parsed.supplier.name).toBe('Dostawca Sp. z o.o.')
      expect(parsed.buyer.nip).toBe('2222222222')
      expect(parsed.buyer.name).toBe('Nabywca S.A.')
    })

    it('should parse amounts correctly from self-billing invoice', () => {
      const parsed = parseInvoiceXml(selfBillingXml)
      expect(parsed.invoiceNumber).toBe('SB/2025/001')
      expect(parsed.netAmount).toBe(5000)
      expect(parsed.grossAmount).toBe(6150)
    })
  })

  describe('buildInvoiceXml – self-billing output', () => {
    const baseInvoice: KsefInvoice = {
      seller: {
        nip: '1111111111',
        name: 'Dostawca Sp. z o.o.',
        address: { street: 'Testowa 1', city: 'Warszawa', postalCode: '00-001', country: 'PL' },
      },
      buyer: {
        nip: '2222222222',
        name: 'Nabywca S.A.',
        address: { street: 'Kupiecka 10', city: 'Kraków', postalCode: '00-002', country: 'PL' },
      },
      invoiceNumber: 'SB/2025/001',
      invoiceDate: '2025-01-15',
      currency: 'PLN',
      items: [
        {
          description: 'Monthly consulting service',
          quantity: 50,
          unit: 'godz.',
          unitPrice: 100,
          netAmount: 5000,
          vatRate: 23,
          vatAmount: 1150,
          grossAmount: 6150,
        },
      ],
    }

    it('should set P_17=1 for self-billing invoice', () => {
      const xml = buildInvoiceXml({ ...baseInvoice, isSelfBilling: true })
      expect(xml).toContain('<P_17>1</P_17>')
    })

    it('should set P_17=2 for regular invoice', () => {
      const xml = buildInvoiceXml({ ...baseInvoice, isSelfBilling: false })
      expect(xml).toContain('<P_17>2</P_17>')
    })

    it('should include Podmiot3 when issuer is provided', () => {
      const xml = buildInvoiceXml({
        ...baseInvoice,
        isSelfBilling: true,
        issuer: { nip: '2222222222', name: 'Nabywca S.A.' },
      })
      expect(xml).toContain('<Podmiot3>')
      expect(xml).toContain('<NIP>2222222222</NIP>')
      expect(xml).toContain('<Rola>1</Rola>')
    })

    it('should not include Podmiot3 when no issuer', () => {
      const xml = buildInvoiceXml(baseInvoice)
      expect(xml).not.toContain('<Podmiot3>')
    })

    it('should produce XML that round-trips correctly for self-billing', () => {
      const xml = buildInvoiceXml({
        ...baseInvoice,
        isSelfBilling: true,
        issuer: { nip: '2222222222', name: 'Nabywca S.A.' },
      })
      const parsed = parseInvoiceXml(xml)
      expect(parsed.isSelfBilling).toBe(true)
      expect(parsed.issuer?.nip).toBe('2222222222')
      expect(parsed.issuer?.name).toBe('Nabywca S.A.')
    })
  })

  describe('buildInvoiceXml – DodatkowyOpis (additionalDescriptions)', () => {
    const baseInvoice: KsefInvoice = {
      seller: {
        nip: '1111111111',
        name: 'Dostawca Sp. z o.o.',
        address: { street: 'Testowa 1', buildingNumber: '1', city: 'Warszawa', postalCode: '00-001', country: 'PL' },
      },
      buyer: {
        nip: '2222222222',
        name: 'Nabywca S.A.',
        address: { street: 'Kupiecka 10', buildingNumber: '10', city: 'Kraków', postalCode: '00-002', country: 'PL' },
      },
      invoiceNumber: 'SB/2025/002',
      invoiceDate: '2025-02-15',
      currency: 'PLN',
      isSelfBilling: true,
      items: [
        {
          lineNumber: 1,
          description: 'Consulting',
          quantity: 10,
          unit: 'godz.',
          unitPrice: 200,
          netAmount: 2000,
          vatRate: 23,
          vatAmount: 460,
          grossAmount: 2460,
        },
      ],
    }

    it('should include DodatkowyOpis elements when additionalDescriptions provided', () => {
      const xml = buildInvoiceXml({
        ...baseInvoice,
        additionalDescriptions: [
          { key: 'Data zatwierdzenia', value: '2025-02-15T10:30:00Z' },
          { key: 'Zatwierdzono przez', value: 'Jan Kowalski (jan@test.com)' },
          { key: 'System zatwierdzenia', value: 'KSeF Copilot by Developico' },
        ],
      })

      expect(xml).toContain('<DodatkowyOpis>')
      expect(xml).toContain('<Klucz>Data zatwierdzenia</Klucz>')
      expect(xml).toContain('<Wartosc>2025-02-15T10:30:00Z</Wartosc>')
      expect(xml).toContain('<Klucz>Zatwierdzono przez</Klucz>')
      expect(xml).toContain('<Wartosc>Jan Kowalski (jan@test.com)</Wartosc>')
      expect(xml).toContain('<Klucz>System zatwierdzenia</Klucz>')
      expect(xml).toContain('<Wartosc>KSeF Copilot by Developico</Wartosc>')
    })

    it('should not include DodatkowyOpis when additionalDescriptions is empty', () => {
      const xml = buildInvoiceXml({
        ...baseInvoice,
        additionalDescriptions: [],
      })

      expect(xml).not.toContain('<DodatkowyOpis>')
    })

    it('should not include DodatkowyOpis when additionalDescriptions is undefined', () => {
      const xml = buildInvoiceXml(baseInvoice)

      expect(xml).not.toContain('<DodatkowyOpis>')
    })
  })

  describe('buildInvoiceXml – SystemInfo branding', () => {
    const baseInvoice: KsefInvoice = {
      seller: {
        nip: '1111111111',
        name: 'Test Seller',
        address: { street: 'Test 1', buildingNumber: '1', city: 'Warszawa', postalCode: '00-001', country: 'PL' },
      },
      buyer: {
        nip: '2222222222',
        name: 'Test Buyer',
        address: { street: 'Test 2', buildingNumber: '2', city: 'Kraków', postalCode: '00-002', country: 'PL' },
      },
      invoiceNumber: 'FV/2025/001',
      invoiceDate: '2025-01-01',
      currency: 'PLN',
      items: [
        {
          lineNumber: 1,
          description: 'Service',
          quantity: 1,
          unit: 'szt.',
          unitPrice: 100,
          netAmount: 100,
          vatRate: 23,
          vatAmount: 23,
          grossAmount: 123,
        },
      ],
    }

    it('should use KSeF Copilot by Developico as SystemInfo', () => {
      const xml = buildInvoiceXml(baseInvoice)
      expect(xml).toContain('<SystemInfo>KSeF Copilot by Developico</SystemInfo>')
    })
  })
})
