'use client'

import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

type AnimatedKpiCardProps = {
  title: string
  value: number
  format?: 'currency' | 'number' | 'percent'
  icon?: LucideIcon
  iconColor?: string
  valueColor?: string
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
  delay?: number
  className?: string
  borderColor?: string
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function AnimatedKpiCard({
  title,
  value,
  format = 'number',
  icon: Icon,
  iconColor,
  valueColor,
  subtitle,
  trend,
  delay = 0,
  className = '',
  borderColor,
}: AnimatedKpiCardProps) {
  // Format helpers
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString()
    }
  }

  // Determine decimals for CountUp
  const decimals = format === 'percent' ? 1 : 0
  const suffix = format === 'percent' ? '%' : ''
  const prefix = ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      <Card
        className="h-full transition-all duration-200 hover:shadow-md hover:border-primary/30 border-l-4"
        style={{ borderLeftColor: borderColor }}
      >
        <CardHeader className="py-2 px-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-xs text-muted-foreground font-medium">
            {title}
          </CardTitle>
          {Icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2, type: 'spring', stiffness: 200 }}
            >
              <Icon className="h-4 w-4" style={{ color: iconColor }} />
            </motion.div>
          )}
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3">
          <div className="text-2xl font-bold" style={{ color: valueColor }}>
            {format === 'currency' ? (
              <CountUp
                start={0}
                end={value}
                duration={1.5}
                delay={delay}
                separator=" "
                decimal=","
                decimals={0}
                formattingFn={(v) => formatCurrency(v)}
              />
            ) : (
              <CountUp
                start={0}
                end={value}
                duration={1.5}
                delay={delay}
                separator=" "
                decimal=","
                decimals={decimals}
                suffix={suffix}
                prefix={prefix}
              />
            )}
          </div>
          {subtitle && (
            <motion.p
              className="text-xs text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: delay + 0.3 }}
            >
              {subtitle}
            </motion.p>
          )}
          {trend && (
            <motion.div
              className="flex items-center gap-1 mt-2"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.4 }}
            >
              <span
                className={`text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-500'
                    : trend.direction === 'down'
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
                {trend.value.toFixed(1)}%
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Animated container for staggered children
type AnimatedCardGridProps = {
  children: React.ReactNode
  className?: string
}

export function AnimatedCardGrid({ children, className = '' }: AnimatedCardGridProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

// Wrapper for any card to add animation
type AnimatedCardWrapperProps = {
  children: React.ReactNode
  delay?: number
  className?: string
}

export function AnimatedCardWrapper({
  children,
  delay = 0,
  className = '',
}: AnimatedCardWrapperProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  )
}
