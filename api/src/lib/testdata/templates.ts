/**
 * Test data templates for invoice generation
 * Contains realistic Polish company data for testing
 */

import { MPK } from '../../types/invoice'

/**
 * Sample suppliers with realistic Polish company data
 */
export const SAMPLE_SUPPLIERS = [
  {
    nip: '5252248481',
    name: 'Allegro.pl Sp. z o.o.',
    category: 'IT Services',
    mpk: MPK.BackOffice,
  },
  {
    nip: '7792348141',
    name: 'Comarch S.A.',
    category: 'Software',
    mpk: MPK.Consultants,
  },
  {
    nip: '5260250995',
    name: 'Microsoft Sp. z o.o.',
    category: 'Software Licenses',
    mpk: MPK.Consultants,
  },
  {
    nip: '1132853869',
    name: 'Amazon Web Services Poland Sp. z o.o.',
    category: 'Cloud Services',
    mpk: MPK.Consultants,
  },
  {
    nip: '5272524787',
    name: 'ORLEN S.A.',
    category: 'Fuel',
    mpk: MPK.Cars,
  },
  {
    nip: '6342661584',
    name: 'Carrefour Polska Sp. z o.o.',
    category: 'Office Supplies',
    mpk: MPK.BackOffice,
  },
  {
    nip: '5272525272',
    name: 'PZU S.A.',
    category: 'Insurance',
    mpk: MPK.Finance,
  },
  {
    nip: '7811767421',
    name: 'Enea S.A.',
    category: 'Utilities',
    mpk: MPK.BackOffice,
  },
  {
    nip: '5260300291',
    name: 'Orange Polska S.A.',
    category: 'Telecom',
    mpk: MPK.BackOffice,
  },
  {
    nip: '5272407375',
    name: 'Play (P4 Sp. z o.o.)',
    category: 'Telecom',
    mpk: MPK.BackOffice,
  },
  {
    nip: '7743213319',
    name: 'Kancelaria Prawna Wardyński i Wspólnicy',
    category: 'Legal Services',
    mpk: MPK.Legal,
  },
  {
    nip: '1080000028',
    name: 'Deloitte Polska Sp. z o.o.',
    category: 'Consulting',
    mpk: MPK.Consultants,
  },
  {
    nip: '5262718202',
    name: 'KPMG Sp. z o.o.',
    category: 'Audit',
    mpk: MPK.Finance,
  },
  {
    nip: '5213008812',
    name: 'DHL Express (Poland) Sp. z o.o.',
    category: 'Courier',
    mpk: MPK.Delivery,
  },
  {
    nip: '5260200350',
    name: 'Poczta Polska S.A.',
    category: 'Postal Services',
    mpk: MPK.Delivery,
  },
  {
    nip: '5272830016',
    name: 'Google Poland Sp. z o.o.',
    category: 'Advertising',
    mpk: MPK.Marketing,
  },
  {
    nip: '1070037905',
    name: 'Meta Platforms Ireland Ltd.',
    category: 'Advertising',
    mpk: MPK.Marketing,
  },
  {
    nip: '5272525272',
    name: 'Avis Polska Sp. z o.o.',
    category: 'Car Rental',
    mpk: MPK.Cars,
  },
  {
    nip: '5252231308',
    name: 'Leroy Merlin Polska Sp. z o.o.',
    category: 'Office Equipment',
    mpk: MPK.BackOffice,
  },
  {
    nip: '5270103391',
    name: 'Sodexo Polska Sp. z o.o.',
    category: 'Catering',
    mpk: MPK.BackOffice,
  },
] as const

/**
 * Invoice amount ranges by category (net amounts in PLN)
 */
export const AMOUNT_RANGES: Record<string, { min: number; max: number }> = {
  'Software': { min: 500, max: 50000 },
  'Software Licenses': { min: 1000, max: 100000 },
  'Cloud Services': { min: 500, max: 20000 },
  'IT Services': { min: 1000, max: 30000 },
  'Fuel': { min: 100, max: 2000 },
  'Office Supplies': { min: 50, max: 1000 },
  'Insurance': { min: 500, max: 10000 },
  'Utilities': { min: 200, max: 5000 },
  'Telecom': { min: 100, max: 3000 },
  'Legal Services': { min: 2000, max: 50000 },
  'Consulting': { min: 5000, max: 100000 },
  'Audit': { min: 5000, max: 50000 },
  'Courier': { min: 50, max: 500 },
  'Postal Services': { min: 20, max: 200 },
  'Advertising': { min: 1000, max: 50000 },
  'Car Rental': { min: 500, max: 5000 },
  'Office Equipment': { min: 200, max: 10000 },
  'Catering': { min: 500, max: 5000 },
  'default': { min: 100, max: 5000 },
}

/**
 * VAT rates in Poland
 */
export const VAT_RATES = [
  { rate: 0.23, weight: 70 },   // 23% - most common
  { rate: 0.08, weight: 15 },   // 8% - reduced
  { rate: 0.05, weight: 10 },   // 5% - reduced
  { rate: 0.00, weight: 5 },    // 0% - exempt
] as const

/**
 * Payment terms in days
 */
export const PAYMENT_TERMS = [7, 14, 21, 30, 45, 60] as const

/**
 * Invoice number prefixes by supplier type
 */
export const INVOICE_PREFIXES = [
  'FV', 'FA', 'FAK', 'FVS', 'FS', 'R', 'RK',
] as const

/**
 * Get random element from array
 */
export function randomElement<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Get random number in range
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Get random amount with decimal precision
 */
export function randomAmount(min: number, max: number): number {
  const amount = min + Math.random() * (max - min)
  return Math.round(amount * 100) / 100
}

/**
 * Get weighted random VAT rate
 */
export function randomVatRate(): number {
  const totalWeight = VAT_RATES.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight
  
  for (const { rate, weight } of VAT_RATES) {
    random -= weight
    if (random <= 0) return rate
  }
  
  return 0.23 // fallback
}

/**
 * Generate random date between two dates
 */
export function randomDate(from: Date, to: Date): Date {
  const fromTime = from.getTime()
  const toTime = to.getTime()
  return new Date(fromTime + Math.random() * (toTime - fromTime))
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(date: Date, index: number): string {
  const prefix = randomElement(INVOICE_PREFIXES)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const seq = String(index).padStart(4, '0')
  
  // Random format
  const formats = [
    `${prefix}/${year}/${month}/${seq}`,
    `${prefix}-${seq}/${month}/${year}`,
    `${prefix}/${seq}/${year}`,
    `${year}/${month}/${prefix}/${seq}`,
  ]
  
  return randomElement(formats)
}
