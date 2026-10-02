import type { ReactNode } from 'react'

type Tone = 'accent' | 'cnn' | 'mnv2' | 'muted'

interface Props {
  children: ReactNode
  tone?: Tone
  className?: string
}

export function Badge({ children, tone = 'accent', className = '' }: Props) {
  return <span className={`badge badge-${tone} ${className}`.trim()}>{children}</span>
}
