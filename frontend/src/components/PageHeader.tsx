interface Props {
  title: string
  subtitle?: React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, className = '' }: Props) {
  return (
    <header className={`page-header animate-fade-up ${className}`.trim()}>
      <h1 className="page-title">{title}</h1>
      {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
    </header>
  )
}
