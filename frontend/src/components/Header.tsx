import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  Car,
  ChartColumn,
  GitCompareArrows,
  Home,
  Layers,
  Menu,
  ScanSearch,
  BarChart3,
  X,
  Sparkles,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/analyze', label: 'Analyzer', icon: ScanSearch },
  { to: '/results', label: 'Results', icon: BarChart3 },
  { to: '/compare', label: 'Comparison', icon: GitCompareArrows },
  { to: '/visualizations', label: 'Visualizations', icon: ChartColumn },
  { to: '/classes', label: 'Classes', icon: Layers },
  { to: '/about', label: 'About', icon: BookOpen },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(148,163,184,0.12)] bg-[rgba(7,11,20,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <NavLink
          to="/"
          className="group flex min-w-0 items-center gap-3 no-underline"
          onClick={() => setOpen(false)}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 text-[#041018] shadow-[0_8px_24px_rgba(34,211,238,0.25)]">
            <Car size={20} strokeWidth={2.2} />
            <Sparkles size={10} className="absolute -right-1 -top-1 text-cyan-200" />
          </span>
          <div className="min-w-0">
            <p className="font-display truncate text-base leading-none text-[var(--color-ink)] sm:text-lg md:text-xl">
              Vehicle Damage Detection
            </p>
            <p className="mt-1 hidden truncate text-[11px] tracking-wide text-[var(--color-ink-muted)] sm:block">
              AI Automotive · Custom CNN · MobileNetV2
            </p>
          </div>
        </NavLink>

        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {/* Desktop nav stays visible from lg up */}
          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium no-underline transition',
                    isActive
                      ? 'bg-[rgba(34,211,238,0.12)] text-cyan-200 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]'
                      : 'text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-[var(--color-ink)]',
                  ].join(' ')
                }
              >
                <Icon size={15} className="shrink-0 opacity-80" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Menu button: always visible, far right */}
          <button
            type="button"
            className="inline-flex shrink-0 items-center justify-center rounded-[0.85rem] border border-[rgba(148,163,184,0.22)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[var(--color-ink)] transition hover:bg-[rgba(255,255,255,0.08)]"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
            aria-expanded={open}
            aria-controls="site-nav-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open ? (
        <div>
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            id="site-nav-menu"
            ref={panelRef}
            className="relative z-50 border-t border-[rgba(148,163,184,0.12)] bg-[rgba(7,11,20,0.98)]"
          >
            <nav aria-label="Menu" className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-6">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold no-underline transition',
                      isActive
                        ? 'bg-[rgba(34,211,238,0.12)] text-cyan-200'
                        : 'text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-[var(--color-ink)]',
                    ].join(' ')
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  )
}
