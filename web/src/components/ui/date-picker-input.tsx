'use client'

import ReactDatePicker, { registerLocale } from 'react-datepicker'
import { pl } from 'date-fns/locale'
import { enUS } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

import { cn } from '@/lib/utils'

// Register locales
registerLocale('pl', pl)
registerLocale('en', enUS)

interface DatePickerInputProps {
  value?: string          // ISO date string yyyy-MM-dd
  onChange: (value: string | undefined) => void
  placeholder?: string
  locale?: string         // 'pl' | 'en'
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DatePickerInput({
  value,
  onChange,
  placeholder,
  locale = 'pl',
  className,
  minDate,
  maxDate,
}: DatePickerInputProps) {
  const selected = value ? new Date(value + 'T00:00:00') : null

  return (
    <ReactDatePicker
      selected={selected}
      onChange={(date: Date | null) => {
        if (date) {
          const iso = date.toISOString().split('T')[0]
          onChange(iso)
        } else {
          onChange(undefined)
        }
      }}
      dateFormat="dd.MM.yyyy"
      locale={locale}
      placeholderText={placeholder}
      isClearable
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      minDate={minDate}
      maxDate={maxDate}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring',
        className
      )}
      calendarClassName="shadow-lg border rounded-lg"
      showPopperArrow={false}
      popperClassName="z-50"
      autoComplete="off"
    />
  )
}
