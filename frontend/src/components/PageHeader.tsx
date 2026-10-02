import type { ReactNode } from 'react'
import { Badge } from './ui/Badge'

interface Props {
  title: string
  subtitle?: ReactNode
  kicker?: string
  className?: string
}

export function PageHeader({ title, subtitle, kicker = 'Vehicle Damage Detection', className = '' }: Props) {
  return (
    <header className={`page-header animate-fade-up ${className}`.trim()}>
      {kicker ? <p className="page-kicker">{kicker}</p> : null}
      <h1 className="page-title">{title}</h1>
      {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
    </header>
  )
}

interface SectionProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeader({ eyebrow, title, description, action, className = '' }: SectionProps) {
  return (
    <div className={`mb-4 flex min-w-0 flex-wrap items-end justify-between gap-3 ${className}`.trim()}>
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="section-label mb-2">{eyebrow}</p> : null}
        <h2 className="font-display m-0 text-2xl text-[var(--color-ink)] sm:text-[1.65rem]">{title}</h2>
        {description ? (
          <div className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink-muted)]">{description}</div>
        ) : null}
      </div>
      {action}
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'cnn' | 'mnv2' | 'accent'
  badge?: string
}

export function MetricCard({ label, value, hint, tone = 'default', badge }: MetricCardProps) {
  const accent =
    tone === 'cnn'
      ? 'var(--color-cnn)'
      : tone === 'mnv2'
        ? 'var(--color-mnv2)'
        : tone === 'accent'
          ? 'var(--color-accent)'
          : undefined

  return (
    <article className="card card-pad kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="section-label m-0" style={accent ? { color: accent } : undefined}>
          {label}
        </p>
        {badge ? <Badge tone={tone === 'cnn' ? 'cnn' : tone === 'mnv2' ? 'mnv2' : 'muted'}>{badge}</Badge> : null}
      </div>
      <p className="kpi-value mt-3 tabular-nums">{value}</p>
      {hint ? <p className="m-0 mt-2 text-xs text-[var(--color-ink-muted)]">{hint}</p> : null}
    </article>
  )
}

interface ModelCardProps {
  title: string
  tone: 'cnn' | 'mnv2'
  children: ReactNode
  badge?: string
}

export function ModelCard({ title, tone, children, badge }: ModelCardProps) {
  return (
    <article className="card card-pad min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label m-0" style={{ color: tone === 'cnn' ? 'var(--color-cnn)' : 'var(--color-mnv2)' }}>
          {title}
        </p>
        {badge ? <Badge tone={tone}>{badge}</Badge> : null}
      </div>
      <div className="mt-3">{children}</div>
    </article>
  )
}
