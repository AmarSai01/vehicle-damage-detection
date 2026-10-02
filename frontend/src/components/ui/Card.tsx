import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  pad?: boolean
  hover?: boolean
}

export function Card({ children, className = '', pad = true, hover = false }: Props) {
  return (
    <div
      className={[
        'card min-w-0',
        pad ? 'card-pad' : '',
        hover
          ? [
              'transition duration-200',
              // Desktop: original hover lift + cyan border
              '[@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5',
              '[@media(hover:hover)_and_(pointer:fine)]:hover:border-[rgba(34,211,238,0.35)]',
              // Touch: momentary press feedback (not sticky)
              'active:-translate-y-0.5 active:border-[rgba(34,211,238,0.35)]',
              // Touch idle: soft cyan edge so cards keep the same visual identity
              '[@media(hover:none)]:border-[rgba(34,211,238,0.2)]',
            ].join(' ')
          : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
