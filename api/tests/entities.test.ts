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
      expect(InvoiceEntity.entitySet).toBe('dvlp_ksefinvoices')
    })

    it('should have all required fields', () => {
      const { fields } = InvoiceEntity

      expect(fields.id).toBe('dvlp_ksefinvoiceid')
      expect(fields.tenantNip).toBe('dvlp_sellernip')
      expect(fields.referenceNumber).toBe('dvlp_ksefreferencenumber')
      expect(fields.invoiceNumber).toBe('dvlp_name')
      expect(fields.supplierNip).toBe('dvlp_buyernip')
      expect(fields.supplierName).toBe('dvlp_buyername')
      expect(fields.invoiceDate).toBe('dvlp_invoicedate')
      expect(fields.grossAmount).toBe('dvlp_grossamount')
      expect(fields.paymentStatus).toBe('dvlp_paymentstatus')
    })

    it('should have AI fields for Extended scope', () => {
      const { fields } = InvoiceEntity

      expect(fields.aiMpkSuggestion).toBe('dvlp_aimpksuggestion')
      expect(fields.aiCategorySuggestion).toBe('dvlp_aicategorysuggestion')
      expect(fields.aiConfidence).toBe('dvlp_aiconfidence')
    })
  })

  describe('TenantEntity', () => {
    it('should have correct entity set name', () => {
      expect(TenantEntity.entitySet).toBe('dvlp_ksefsettings')
    })

    it('should have all required fields', () => {
      const { fields } = TenantEntity

      expect(fields.id).toBe('dvlp_ksefsettingid')
      expect(fields.nip).toBe('dvlp_nip')
      expect(fields.name).toBe('dvlp_name')
      expect(fields.tokenSecretName).toBe('dvlp_tokensecretname')
      expect(fields.isActive).toBe('dvlp_isactive')
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
      expect(MpkValues.Legal).toBe(100000100)
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

    it('should return undefined for unknown value', () => {
      expect(getMpkKey(999)).toBeUndefined()
    })

    it('should return undefined for null', () => {
      expect(getMpkKey(null)).toBeUndefined()
    })

    it('should return undefined for undefined', () => {
      expect(getMpkKey(undefined)).toBeUndefined()
    })
  })
})
