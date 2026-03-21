'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
] as const

interface MonthPickerProps {
  /** Value in "YYYY-MM" format */
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MonthPicker({ value, onChange, className }: MonthPickerProps) {
  const t = useTranslations('common.monthPicker')
  const [open, setOpen] = React.useState(false)

  const [selectedYear, selectedMonth] = React.useMemo(() => {
    const [y, m] = value.split('-').map(Number)
    return [y || new Date().getFullYear(), m || 1]
  }, [value])

  const [viewYear, setViewYear] = React.useState(selectedYear)

  React.useEffect(() => {
    if (open) setViewYear(selectedYear)
  }, [open, selectedYear])

  function handleSelect(month: number) {
    onChange(`${viewYear}-${String(month).padStart(2, '0')}`)
    setOpen(false)
  }

  function handleThisMonth() {
    const now = new Date()
    onChange(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  const displayLabel = t(`monthsFull.${selectedMonth}`) + ' ' + selectedYear

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {/* Year navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{viewYear}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewYear((y) => y + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-4 gap-1">
          {MONTH_KEYS.map((key, i) => {
            const month = i + 1
            const isSelected = viewYear === selectedYear && month === selectedMonth
            const now = new Date()
            const isCurrent = viewYear === now.getFullYear() && month === now.getMonth() + 1
            return (
              <Button
                key={key}
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-8 text-xs',
                  isCurrent && !isSelected && 'border border-primary',
                )}
                onClick={() => handleSelect(month)}
              >
                {t(`months.${key}`)}
              </Button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-3 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleThisMonth}
          >
            {t('thisMonth')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
