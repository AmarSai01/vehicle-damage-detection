import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

type Kind = 'loading' | 'empty' | 'error' | 'warn'

interface Props {
  kind: Kind
  title?: string
  children: ReactNode
}

const icons = {
  loading: Loader2,
  empty: Inbox,
  error: AlertCircle,
  warn: AlertCircle,
}

export function UiState({ kind, title, children }: Props) {
  const Icon = icons[kind]
  return (
    <div
      className={[
        'state-box',
        kind === 'loading' && 'state-box--loading',
        kind === 'empty' && 'state-box--empty',
        kind === 'error' && 'state-box--error',
        kind === 'warn' && 'state-box--warn',
      ]
        .filter(Boolean)
        .join(' ')}
      role={kind === 'error' ? 'alert' : undefined}
    >
      <div className="flex items-start gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${kind === 'loading' ? 'animate-spin' : ''}`} />
        <div className="min-w-0">
          {title ? <p className="m-0 font-semibold text-[inherit]">{title}</p> : null}
          <div className={title ? 'mt-1 opacity-95' : undefined}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function LoadingState({ children = 'Loading…' }: { children?: ReactNode }) {
  return (
    <UiState kind="loading" title="Loading">
      {children}
    </UiState>
  )
}

export function EmptyState({ title = 'Nothing to show yet', children }: { title?: string; children: ReactNode }) {
  return (
    <UiState kind="empty" title={title}>
      {children}
    </UiState>
  )
}

export function ErrorState({ title = 'Something went wrong', children }: { title?: string; children: ReactNode }) {
  return (
    <UiState kind="error" title={title}>
      {children}
    </UiState>
  )
}
