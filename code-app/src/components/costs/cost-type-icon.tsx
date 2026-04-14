import {
  Receipt,
  FileText,
  ClipboardCheck,
  FileClock,
  FileWarning,
  FileSignature,
  File,
} from 'lucide-react'
import type { CostDocumentType } from '@/lib/types'

const ICON_MAP: Record<CostDocumentType, { icon: typeof Receipt; color: string }> = {
  Receipt: { icon: Receipt, color: 'text-green-600' },
  Bill: { icon: FileText, color: 'text-blue-600' },
  Acknowledgment: { icon: ClipboardCheck, color: 'text-teal-600' },
  ProForma: { icon: FileClock, color: 'text-amber-600' },
  DebitNote: { icon: FileWarning, color: 'text-orange-600' },
  ContractInvoice: { icon: FileSignature, color: 'text-violet-600' },
  Other: { icon: File, color: 'text-gray-500' },
}

interface CostTypeIconProps {
  type: CostDocumentType
  className?: string
}

export function CostTypeIcon({ type, className = 'h-4 w-4' }: CostTypeIconProps) {
  const config = ICON_MAP[type] ?? ICON_MAP.Other
  const Icon = config.icon
  return <Icon className={`${className} ${config.color}`} />
}
