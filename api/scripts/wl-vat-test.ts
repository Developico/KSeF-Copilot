/**
 * Biała Lista VAT (White List) — API Test
 * 
 * API from KAS (Krajowa Administracja Skarbowa)
 * - Production: https://wl-api.mf.gov.pl
 * - Test:       https://wl-test.mf.gov.pl
 * - No API key required, no registration needed
 * - REST/JSON (not SOAP!)
 * - Limits: 100 search queries/day (max 30 subjects each), 5000 check queries/day
 */

const PROD_URL = 'https://wl-api.mf.gov.pl';

function todayDate(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

interface WLSubject {
  name: string;
  nip: string;
  regon: string;
  pesel: string | null;
  krs: string;
  residenceAddress: string;
  workingAddress: string;
  statusVat: string;
  accountNumbers: string[];
  registrationLegalDate: string;
  registrationDenialDate: string | null;
  registrationDenialBasis: string | null;
  restorationDate: string | null;
  restorationBasis: string | null;
  removalDate: string | null;
  removalBasis: string | null;
  hasVirtualAccounts: boolean;
  representatives: Array<{ firstName: string; lastName: string; nip: string; companyName: string }>;
  authorizedClerks: Array<{ firstName: string; lastName: string; nip: string; companyName: string }>;
  partners: Array<{ firstName: string; lastName: string; nip: string; companyName: string }>;
}

interface WLSearchResponse {
  result: {
    subject: WLSubject | null;
    requestDateTime: string;
    requestId: string;
  };
}

async function searchByNip(nip: string): Promise<WLSearchResponse> {
  const date = todayDate();
  const url = `${PROD_URL}/api/search/nip/${nip}?date=${date}`;
  console.log(`GET ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function searchByRegon(regon: string): Promise<WLSearchResponse> {
  const date = todayDate();
  const url = `${PROD_URL}/api/search/regon/${regon}?date=${date}`;
  console.log(`GET ${url}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Biała Lista VAT — API Test (Production, no key needed)    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  // --- Test 1: Your company NIP ---
  console.log('=== Test 1: NIP 1181753234 (Twoja DG) ===');
  try {
    const resp = await searchByNip('1181753234');
    if (resp.result.subject) {
      const s = resp.result.subject;
      console.log(`✅ Found: ${s.name}`);
      console.log(`   NIP: ${s.nip}`);
      console.log(`   REGON: ${s.regon}`);
      console.log(`   KRS: ${s.krs || '(brak)'}`);
      console.log(`   Status VAT: ${s.statusVat}`);
      console.log(`   Adres siedziby: ${s.residenceAddress || '(brak)'}`);
      console.log(`   Adres działalności: ${s.workingAddress || '(brak)'}`);
      console.log(`   Data rejestracji VAT: ${s.registrationLegalDate || '(brak)'}`);
      console.log(`   Konta bankowe: ${s.accountNumbers?.length || 0}`);
      if (s.accountNumbers?.length) {
        s.accountNumbers.forEach((acc, i) => console.log(`     ${i + 1}. ${acc}`));
      }
      console.log(`   Rachunki wirtualne: ${s.hasVirtualAccounts}`);
      console.log(`   Reprezentanci: ${s.representatives?.length || 0}`);
      console.log(`   Prokurenci: ${s.authorizedClerks?.length || 0}`);
      console.log(`   Wspólnicy: ${s.partners?.length || 0}`);
      console.log(`   Request ID: ${resp.result.requestId}`);
      console.log(`   Request DateTime: ${resp.result.requestDateTime}`);
    } else {
      console.log('❌ Not found in White List');
    }
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  console.log();

  // --- Test 2: Known company (T-Mobile) ---
  console.log('=== Test 2: NIP 5261040567 (T-Mobile) ===');
  try {
    const resp = await searchByNip('5261040567');
    if (resp.result.subject) {
      const s = resp.result.subject;
      console.log(`✅ Found: ${s.name}`);
      console.log(`   NIP: ${s.nip}`);
      console.log(`   REGON: ${s.regon}`);
      console.log(`   Status VAT: ${s.statusVat}`);
      console.log(`   Adres: ${s.workingAddress}`);
      console.log(`   Konta bankowe: ${s.accountNumbers?.length || 0}`);
    } else {
      console.log('❌ Not found');
    }
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  console.log();

  // --- Test 3: REGON search (your REGON from GUS test) ---
  console.log('=== Test 3: REGON 140907349 ===');
  try {
    const resp = await searchByRegon('140907349');
    if (resp.result.subject) {
      const s = resp.result.subject;
      console.log(`✅ Found: ${s.name}`);
      console.log(`   NIP: ${s.nip}`);
      console.log(`   Status VAT: ${s.statusVat}`);
    } else {
      console.log('❌ Not found');
    }
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  console.log();
  console.log('=== Test Complete ===');
}

main().catch(e => console.error('FATAL:', e.message));
