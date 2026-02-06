/**
 * GUS/REGON API Client
 * 
 * SOAP client for the Polish Central Statistical Office (GUS)
 * REGON registry API (BIR1 - Baza Internetowa REGON 1).
 * 
 * API Documentation: https://api.stat.gov.pl/Home/RegonApi
 */

import { GusCompanyData, GusSession, GusLookupResult, GusSearchResult, GusSearchResultItem, GUS_ERROR_CODES } from './types'

// API endpoints
const GUS_API_URL = process.env.GUS_API_URL || 'https://wyszukiwarkaregon.stat.gov.pl/wsBIR/UslugaBIRzewnPubl.svc'
const GUS_API_KEY = process.env.GUS_API_KEY || ''

// Test API endpoint (for development) - note: different hostname!
const GUS_TEST_API_URL = 'https://wyszukiwarkaregontest.stat.gov.pl/wsBIR/wsBIR.svc'
const GUS_TEST_API_KEY = 'abcde12345abcde12345'

// Use test environment if no production key is configured
const USE_TEST_ENV = !GUS_API_KEY || GUS_API_KEY === 'test'
const API_URL = USE_TEST_ENV ? GUS_TEST_API_URL : GUS_API_URL
const API_KEY = USE_TEST_ENV ? GUS_TEST_API_KEY : GUS_API_KEY

// Session cache (expires after 60 minutes)
let cachedSession: GusSession | null = null

/**
 * SOAP envelope wrapper
 */
function createSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:To>${API_URL}</wsa:To>
    <wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/${body.includes('Zaloguj') ? 'Zaloguj' : body.includes('Wyloguj') ? 'Wyloguj' : body.includes('DaneSzczegoloweRaport') ? 'DaneSzczegoloweRaport' : body.includes('GetValue') ? 'GetValue' : 'DaneSzukajPodmioty'}</wsa:Action>
  </soap:Header>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`
}

/**
 * Make SOAP request to GUS API
 */
async function soapRequest(envelope: string, sessionId?: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/soap+xml; charset=utf-8',
    'Accept': 'application/soap+xml', // Force plain SOAP response, not MTOM
  }
  
  if (sessionId) {
    headers['sid'] = sessionId
  }
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: envelope,
  })
  
  if (!response.ok) {
    throw new Error(`GUS API error: ${response.status} ${response.statusText}`)
  }
  
  const text = await response.text()
  
  // Handle MTOM/XOP multipart response - extract the SOAP part
  if (text.includes('--uuid:') || text.includes('Content-Type:')) {
    // Find the actual SOAP envelope in the multipart response
    const soapMatch = text.match(/<s:Envelope[\s\S]*?<\/s:Envelope>/i)
    if (soapMatch) {
      return soapMatch[0]
    }
  }
  
  return text
}

/**
 * Extract value from SOAP response
 */
function extractSoapValue(xml: string, tagName: string): string | null {
  // Handle both regular and namespaced tags
  const patterns = [
    new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, 'i'),
    new RegExp(`<[^:]+:${tagName}[^>]*>([^<]*)</[^:]+:${tagName}>`, 'i'),
    new RegExp(`<${tagName}Result[^>]*>([^<]*)</${tagName}Result>`, 'i'),
    // Handle namespace in tag name like <ZalogujResponse xmlns="...">
    new RegExp(`<${tagName}[^>]*>\\s*<${tagName}Result[^>]*>([^<]*)</${tagName}Result>`, 'i'),
  ]
  
  for (const pattern of patterns) {
    const match = xml.match(pattern)
    if (match && match[1]) {
      const value = match[1].trim()
      if (value) {
        console.log(`[GUS] Extracted ${tagName}: ${value}`)
        return value
      }
    }
  }
  
  console.log(`[GUS] Could not extract ${tagName} from XML. Looking for patterns...`)
  // Try to find any ZalogujResult
  const zalogujMatch = xml.match(/ZalogujResult[^>]*>([^<]+)</i)
  if (zalogujMatch) {
    console.log(`[GUS] Found ZalogujResult with regex: ${zalogujMatch[1]}`)
    return zalogujMatch[1].trim()
  }
  
  return null
}

/**
 * Parse XML data to object (simple parser for GUS responses)
 */
function parseXmlData(xml: string): Record<string, string> {
  const result: Record<string, string> = {}
  
  // Match all XML tags with content
  const tagPattern = /<([A-Za-z_][A-Za-z0-9_]*)>([^<]*)<\/\1>/g
  let match
  
  while ((match = tagPattern.exec(xml)) !== null) {
    const [, tagName, value] = match
    if (value.trim()) {
      result[tagName] = value.trim()
    }
  }
  
  return result
}

/**
 * Parse multiple data records from XML
 */
function parseXmlDataList(xml: string, recordTag: string): Record<string, string>[] {
  const results: Record<string, string>[] = []
  
  // Find all record blocks
  const recordPattern = new RegExp(`<${recordTag}>([\\s\\S]*?)</${recordTag}>`, 'g')
  let match
  
  while ((match = recordPattern.exec(xml)) !== null) {
    const recordXml = match[1]
    results.push(parseXmlData(recordXml))
  }
  
  return results
}

/**
 * Login to GUS API and get session ID
 */
async function login(): Promise<string> {
  // Check if we have a valid cached session
  if (cachedSession && cachedSession.expiresAt > new Date()) {
    return cachedSession.sessionId
  }
  
  console.log(`[GUS] Logging in to ${API_URL}`)
  console.log(`[GUS] Using ${USE_TEST_ENV ? 'TEST' : 'PRODUCTION'} environment`)
  console.log(`[GUS] API key length: ${API_KEY.length}, first 4 chars: ${API_KEY.substring(0, 4)}...`)
  
  const envelope = createSoapEnvelope(`
    <ns:Zaloguj>
      <ns:pKluczUzytkownika>${API_KEY}</ns:pKluczUzytkownika>
    </ns:Zaloguj>
  `)
  
  const response = await soapRequest(envelope)
  console.log(`[GUS] Login response: ${response}`)
  
  const sessionId = extractSoapValue(response, 'ZalogujResult')
  
  if (!sessionId) {
    // Login failed - the API returned empty ZalogujResult
    // This means the API key is invalid or wrong endpoint
    console.error('[GUS] Login failed! Empty session ID returned.')
    console.error('[GUS] Possible causes:')
    console.error('  1. Invalid API key')
    console.error('  2. Wrong endpoint (test key on production or vice versa)')
    console.error('  3. API key expired')
    console.error(`[GUS] Current config: URL=${API_URL}, KeyLen=${API_KEY.length}`)
    
    // For test environment, the key should be exactly 'abcde12345abcde12345' (20 chars)
    if (USE_TEST_ENV && API_KEY !== 'abcde12345abcde12345') {
      console.error('[GUS] WARNING: Using test URL but API key is not the standard test key!')
      console.error('[GUS] Test key should be: abcde12345abcde12345')
    }
    
    throw new Error('Failed to login to GUS API: Invalid API key or wrong endpoint')
  }
  
  console.log(`[GUS] Login successful! Session ID: ${sessionId.substring(0, 8)}...`)
  
  // Cache the session (expires in 55 minutes to be safe)
  cachedSession = {
    sessionId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 55 * 60 * 1000),
  }
  
  return sessionId
}

/**
 * Logout from GUS API
 */
async function logout(sessionId: string): Promise<void> {
  try {
    const envelope = createSoapEnvelope(`
      <ns:Wyloguj>
        <ns:pIdentyfikatorSesji>${sessionId}</ns:pIdentyfikatorSesji>
      </ns:Wyloguj>
    `)
    
    await soapRequest(envelope, sessionId)
    
    // Clear cached session if it matches
    if (cachedSession?.sessionId === sessionId) {
      cachedSession = null
    }
  } catch {
    // Ignore logout errors
  }
}

/**
 * Get last error code from API
 */
async function getLastError(sessionId: string): Promise<string> {
  const envelope = createSoapEnvelope(`
    <ns:GetValue>
      <ns:pNazwaParametru>KomunikatKod</ns:pNazwaParametru>
    </ns:GetValue>
  `)
  
  const response = await soapRequest(envelope, sessionId)
  return extractSoapValue(response, 'GetValueResult') || '0'
}

/**
 * Search for company by NIP
 */
async function searchByNip(sessionId: string, nip: string): Promise<string | null> {
  const cleanNip = nip.replace(/\D/g, '')
  
  if (cleanNip.length !== 10) {
    throw new Error('NIP musi mieć 10 cyfr')
  }
  
  const envelope = createSoapEnvelope(`
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <ns:Nip>${cleanNip}</ns:Nip>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  `)
  
  const response = await soapRequest(envelope, sessionId)
  return extractSoapValue(response, 'DaneSzukajPodmiotyResult')
}

/**
 * Search for company by name
 */
async function searchByName(sessionId: string, name: string): Promise<string | null> {
  const envelope = createSoapEnvelope(`
    <ns:DaneSzukajPodmioty>
      <ns:pParametryWyszukiwania>
        <ns:Nazwy>${name}</ns:Nazwy>
      </ns:pParametryWyszukiwania>
    </ns:DaneSzukajPodmioty>
  `)
  
  const response = await soapRequest(envelope, sessionId)
  return extractSoapValue(response, 'DaneSzukajPodmiotyResult')
}

/**
 * Get detailed company report
 */
async function getDetailedReport(sessionId: string, regon: string, reportType: string): Promise<string | null> {
  const envelope = createSoapEnvelope(`
    <ns:DaneSzczegoloweRaport>
      <ns:pRegon>${regon}</ns:pRegon>
      <ns:pNazwaRaportu>${reportType}</ns:pNazwaRaportu>
    </ns:DaneSzczegoloweRaport>
  `)
  
  const response = await soapRequest(envelope, sessionId)
  return extractSoapValue(response, 'DaneSzczegoloweRaportResult')
}

/**
 * Determine report type based on entity type and REGON length
 */
function getReportType(typ: string, regonLength: number): string {
  if (typ === 'F') {
    // Osoba fizyczna
    return regonLength === 14 
      ? 'BIR11OsFizycznaDzwordzewna'
      : 'BIR11OsFizycznaDaneOgolne'
  } else if (typ === 'LP') {
    // Jednostka lokalna
    return 'BIR11JednijstkiLokalne'
  } else {
    // Osoba prawna
    return 'BIR11OsPrawna'
  }
}

/**
 * Lookup company by NIP
 */
export async function lookupByNip(nip: string): Promise<GusLookupResult> {
  let sessionId: string | null = null
  
  try {
    sessionId = await login()
    
    // Search for the company
    const searchResult = await searchByNip(sessionId, nip)
    
    if (!searchResult || searchResult.trim() === '') {
      const errorCode = await getLastError(sessionId)
      const errorMessage = GUS_ERROR_CODES[errorCode as keyof typeof GUS_ERROR_CODES] || 'Nieznany błąd'
      
      return {
        success: false,
        error: errorCode === '4' ? 'Nie znaleziono podmiotu dla podanego NIP' : errorMessage,
        errorCode,
      }
    }
    
    // Parse search result
    const parsedData = parseXmlData(searchResult)
    
    if (!parsedData.Regon) {
      return {
        success: false,
        error: 'Nie znaleziono podmiotu dla podanego NIP',
        errorCode: '4',
      }
    }
    
    // Get detailed report
    const reportType = getReportType(parsedData.Typ || 'P', parsedData.Regon.length)
    const detailedReport = await getDetailedReport(sessionId, parsedData.Regon, reportType)
    
    // Merge basic and detailed data
    const detailedData = detailedReport ? parseXmlData(detailedReport) : {}
    
    const companyData: GusCompanyData = {
      regon: parsedData.Regon || '',
      nip: parsedData.Nip || nip.replace(/\D/g, ''),
      nazwa: parsedData.Nazwa || detailedData.praw_nazwa || detailedData.fiz_nazwa || '',
      wojewodztwo: parsedData.Wojewodztwo || detailedData.praw_adSiedzWojewodztwo_Nazwa || '',
      powiat: parsedData.Powiat || detailedData.praw_adSiedzPowiat_Nazwa || '',
      gmina: parsedData.Gmina || detailedData.praw_adSiedzGmina_Nazwa || '',
      miejscowosc: parsedData.Miejscowosc || detailedData.praw_adSiedzMiejscowosc_Nazwa || '',
      kodPocztowy: parsedData.KodPocztowy || detailedData.praw_adSiedzKodPocztowy || '',
      ulica: parsedData.Ulica || detailedData.praw_adSiedzUlica_Nazwa || '',
      nrNieruchomosci: parsedData.NrNieruchomosci || detailedData.praw_adSiedzNumerNieruchomosci || '',
      nrLokalu: parsedData.NrLokalu || detailedData.praw_adSiedzNumerLokalu || '',
      typ: (parsedData.Typ as 'F' | 'P' | 'LP') || 'P',
      silosId: parsedData.SilosID || '',
      dataZawieszenia: detailedData.praw_dataZawieszeniaDzialalnosci || undefined,
      dataZakonczenia: detailedData.praw_dataZakonczeniaDzialalnosci || undefined,
      email: detailedData.praw_adresEmail || undefined,
      telefon: detailedData.praw_numerTelefonu || undefined,
      fax: detailedData.praw_numerFaksu || undefined,
      www: detailedData.praw_adresStronyinternetowej || undefined,
      pkd: detailedData.praw_pkdKod || undefined,
      pkdNazwa: detailedData.praw_pkdNazwa || undefined,
    }
    
    // Format address
    const addressParts = []
    if (companyData.ulica) {
      addressParts.push(`ul. ${companyData.ulica}`)
      if (companyData.nrNieruchomosci) {
        addressParts[0] += ` ${companyData.nrNieruchomosci}`
        if (companyData.nrLokalu) {
          addressParts[0] += `/${companyData.nrLokalu}`
        }
      }
    }
    if (companyData.kodPocztowy && companyData.miejscowosc) {
      addressParts.push(`${companyData.kodPocztowy} ${companyData.miejscowosc}`)
    }
    
    return {
      success: true,
      data: companyData,
      address: {
        street: companyData.ulica,
        buildingNumber: companyData.nrNieruchomosci,
        apartmentNumber: companyData.nrLokalu || undefined,
        postalCode: companyData.kodPocztowy,
        city: companyData.miejscowosc,
        province: companyData.wojewodztwo,
        county: companyData.powiat,
        municipality: companyData.gmina,
        fullAddress: addressParts.join(', '),
      },
    }
  } catch (error) {
    console.error('GUS API lookup error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Błąd połączenia z API GUS',
    }
  }
}

/**
 * Search companies by name
 */
export async function searchByCompanyName(name: string): Promise<GusSearchResult> {
  let sessionId: string | null = null
  
  try {
    if (!name || name.length < 3) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        error: 'Nazwa musi mieć co najmniej 3 znaki',
      }
    }
    
    sessionId = await login()
    
    const searchResult = await searchByName(sessionId, name)
    
    if (!searchResult || searchResult.trim() === '') {
      const errorCode = await getLastError(sessionId)
      
      if (errorCode === '4') {
        return {
          success: true,
          results: [],
          totalCount: 0,
        }
      }
      
      const errorMessage = GUS_ERROR_CODES[errorCode as keyof typeof GUS_ERROR_CODES] || 'Nieznany błąd'
      return {
        success: false,
        results: [],
        totalCount: 0,
        error: errorMessage,
      }
    }
    
    // Parse multiple results
    const records = parseXmlDataList(searchResult, 'dane')
    
    const results: GusSearchResultItem[] = records.map(record => ({
      regon: record.Regon || '',
      nip: record.Nip || '',
      nazwa: record.Nazwa || '',
      miejscowosc: record.Miejscowosc || '',
      ulica: record.Ulica || '',
      typ: record.Typ || 'P',
    }))
    
    return {
      success: true,
      results,
      totalCount: results.length,
    }
  } catch (error) {
    console.error('GUS API search error:', error)
    return {
      success: false,
      results: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : 'Błąd połączenia z API GUS',
    }
  }
}

/**
 * Validate NIP checksum
 */
export function validateNip(nip: string): boolean {
  const cleanNip = nip.replace(/\D/g, '')
  
  if (cleanNip.length !== 10) {
    return false
  }
  
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  let sum = 0
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanNip[i], 10) * weights[i]
  }
  
  const checksum = sum % 11
  const lastDigit = parseInt(cleanNip[9], 10)
  
  return checksum === lastDigit
}
