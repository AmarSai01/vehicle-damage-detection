interface Props {
  value: number
  color?: string
  className?: string
  label?: string
}

export function ProgressBar({ value, color = 'var(--color-accent)', className = '', label }: Props) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={className} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}
