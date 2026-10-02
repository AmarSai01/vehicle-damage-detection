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
        hover ? 'transition duration-200 hover:-translate-y-0.5 hover:border-[rgba(34,211,238,0.35)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
