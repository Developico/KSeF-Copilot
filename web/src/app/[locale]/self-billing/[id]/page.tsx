'use client'

import { use } from 'react'
import { SbInvoiceDetailContent } from '@/components/self-billing/sb-invoice-detail-content'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function SbInvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)

  return (
    <div>
      <SbInvoiceDetailContent sbInvoiceId={resolvedParams.id} />
    </div>
  )
}
