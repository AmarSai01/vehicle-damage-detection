import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Car,
  ChartColumn,
  GitCompareArrows,
  Home,
  Layers,
  ScanSearch,
  BarChart3,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/analyze', label: 'Analyzer', icon: ScanSearch },
  { to: '/compare', label: 'Comparison', icon: GitCompareArrows },
  { to: '/visualizations', label: 'Visualizations', icon: ChartColumn },
  { to: '/classes', label: 'Classes', icon: Layers },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/about', label: 'About', icon: BookOpen },
]

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)]/80 bg-[var(--color-surface)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink to="/" className="group flex min-w-0 items-center gap-3 no-underline">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] text-white shadow-sm transition group-hover:bg-[var(--color-accent-dark)]">
            <Car size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-xl leading-none text-[var(--color-ink)] sm:text-2xl">
              Vehicle Damage Detection
            </p>
            <p className="mt-0.5 hidden text-xs text-[var(--color-ink-muted)] sm:block">
              Custom CNN · MobileNetV2 · CarDD
            </p>
          </div>
        </NavLink>

        <nav className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium no-underline transition sm:px-2.5',
                  isActive
                    ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-dark)]'
                    : 'text-[var(--color-ink-muted)] hover:bg-white/70 hover:text-[var(--color-ink)]',
                ].join(' ')
              }
            >
              <Icon size={16} />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
