import { describe, it, expect } from 'vitest'
import {
  InvoiceEntity,
  TenantEntity,
  PaymentStatusValues,
  MpkValues,
  getPaymentStatusKey,
  getMpkKey,
} from '../src/lib/dataverse/entities'

describe('Dataverse Entities', () => {
  describe('InvoiceEntity', () => {
    it('should have correct entity set name', () => {
      expect(InvoiceEntity.entitySet).toBe('ksef_invoices')
    })

    it('should have all required fields', () => {
      const { fields } = InvoiceEntity

      expect(fields.id).toBe('ksef_invoiceid')
      expect(fields.tenantNip).toBe('ksef_tenantnip')
      expect(fields.referenceNumber).toBe('ksef_referencenumber')
      expect(fields.invoiceNumber).toBe('ksef_invoicenumber')
      expect(fields.supplierNip).toBe('ksef_suppliernip')
      expect(fields.supplierName).toBe('ksef_suppliername')
      expect(fields.invoiceDate).toBe('ksef_invoicedate')
      expect(fields.grossAmount).toBe('ksef_grossamount')
      expect(fields.paymentStatus).toBe('ksef_paymentstatus')
    })

    it('should have AI fields for Extended scope', () => {
      const { fields } = InvoiceEntity

      expect(fields.aiMpkSuggestion).toBe('ksef_aimpksuggestion')
      expect(fields.aiCategorySuggestion).toBe('ksef_aicategorysuggestion')
      expect(fields.aiConfidence).toBe('ksef_aiconfidence')
    })
  })

  describe('TenantEntity', () => {
    it('should have correct entity set name', () => {
      expect(TenantEntity.entitySet).toBe('ksef_tenants')
    })

    it('should have all required fields', () => {
      const { fields } = TenantEntity

      expect(fields.id).toBe('ksef_tenantid')
      expect(fields.nip).toBe('ksef_nip')
      expect(fields.name).toBe('ksef_name')
      expect(fields.tokenSecretName).toBe('ksef_tokensecretname')
      expect(fields.isActive).toBe('ksef_isactive')
    })
  })

  describe('PaymentStatusValues', () => {
    it('should have correct option values', () => {
      expect(PaymentStatusValues.pending).toBe(100000000)
      expect(PaymentStatusValues.paid).toBe(100000001)
    })
  })

  describe('MpkValues', () => {
    it('should have all cost centers', () => {
      expect(MpkValues.Consultants).toBe(100000000)
      expect(MpkValues.BackOffice).toBe(100000001)
      expect(MpkValues.Management).toBe(100000002)
      expect(MpkValues.Cars).toBe(100000003)
      expect(MpkValues.Legal).toBe(100000004)
      expect(MpkValues.Marketing).toBe(100000005)
      expect(MpkValues.Sales).toBe(100000006)
      expect(MpkValues.Delivery).toBe(100000007)
      expect(MpkValues.Finance).toBe(100000008)
      expect(MpkValues.Other).toBe(100000009)
    })
  })

  describe('getPaymentStatusKey', () => {
    it('should return correct key for pending', () => {
      expect(getPaymentStatusKey(100000000)).toBe('pending')
    })

    it('should return correct key for paid', () => {
      expect(getPaymentStatusKey(100000001)).toBe('paid')
    })

    it('should default to pending for unknown value', () => {
      expect(getPaymentStatusKey(999)).toBe('pending')
    })
  })

  describe('getMpkKey', () => {
    it('should return correct key for Consultants', () => {
      expect(getMpkKey(100000000)).toBe('Consultants')
    })

    it('should return correct key for Finance', () => {
      expect(getMpkKey(100000008)).toBe('Finance')
    })

    it('should default to Other for unknown value', () => {
      expect(getMpkKey(999)).toBe('Other')
    })
  })
})
