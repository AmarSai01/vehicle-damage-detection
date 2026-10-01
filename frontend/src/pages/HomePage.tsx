import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, ChartColumn, Cpu, Gauge, ScanSearch, ShieldCheck } from 'lucide-react'
import { fetchComparison } from '../api/client'
import { SPLIT_COUNTS } from '../data/academicFacts'

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

export function HomePage() {
  const [cnnAcc, setCnnAcc] = useState<number | null>(null)
  const [mnvAcc, setMnvAcc] = useState<number | null>(null)
  const [metricsReady, setMetricsReady] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchComparison()
        const cnn = data.models?.custom_cnn
        const mnv = data.models?.mobilenetv2
        if (
          data.status === 'evaluated' &&
          cnn?.status === 'evaluated' &&
          mnv?.status === 'evaluated'
        ) {
          setCnnAcc(cnn.accuracy ?? null)
          setMnvAcc(mnv.accuracy ?? null)
          setMetricsReady(true)
        }
      } catch {
        setMetricsReady(false)
      }
    })()
  }, [])

  return (
    <div className="page-shell">
      <section className="relative overflow-hidden pb-10 pt-4 sm:pb-12 sm:pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 15% 10%, rgba(13,115,119,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 0%, rgba(29,78,137,0.14), transparent 55%)',
          }}
        />
        <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
          Academic ML System · CarDD
        </p>
        <h1 className="font-display animate-fade-up mt-4 max-w-3xl text-5xl leading-[1.05] text-[var(--color-ink)] sm:text-6xl md:text-7xl">
          Vehicle Damage Detection
        </h1>
        <p className="animate-fade-up-delay mt-5 max-w-2xl text-base text-[var(--color-ink-muted)] sm:text-lg">
          Classify external car damage from a single photo using two real TensorFlow models — a
          Custom CNN trained from scratch and MobileNetV2 with ImageNet transfer learning —
          evaluated fairly on the same authorized CarDD split.
        </p>
        <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link to="/analyze" className="btn btn-primary no-underline">
            Analyze Vehicle
            <ArrowRight size={18} />
          </Link>
          <Link to="/results" className="btn btn-secondary no-underline">
            View Results
          </Link>
        </div>
      </section>

      <section className="panel panel-pad">
        <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Academic snapshot</h2>
        <p className="m-0 mt-2 text-sm text-[var(--color-ink-muted)]">
          Fair comparison on the official CarDD-derived classification split ({SPLIT_COUNTS.test}{' '}
          held-out test images). Accuracies below are loaded from the evaluation artifact via the API
          — not hard-coded placeholders.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--color-surface)] px-4 py-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[var(--color-cnn)]">
              Custom CNN (from scratch)
            </p>
            <p className="font-display m-0 mt-1 text-3xl tabular-nums text-[var(--color-ink)]">
              {metricsReady ? fmtPct(cnnAcc) : '—'}
            </p>
            <p className="m-0 text-xs text-[var(--color-ink-muted)]">Test accuracy</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface)] px-4 py-3">
            <p className="m-0 text-xs font-semibold uppercase tracking-wider text-[var(--color-mnv2)]">
              MobileNetV2 (transfer learning)
            </p>
            <p className="font-display m-0 mt-1 text-3xl tabular-nums text-[var(--color-ink)]">
              {metricsReady ? fmtPct(mnvAcc) : '—'}
            </p>
            <p className="m-0 text-xs text-[var(--color-ink-muted)]">Test accuracy</p>
          </div>
        </div>
        {!metricsReady && (
          <p className="m-0 mt-3 text-xs text-[var(--color-warn)]">
            Start the backend to load live evaluation metrics on this page.
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Suggested demo path</h2>
        <p className="m-0 mt-2 max-w-2xl text-sm text-[var(--color-ink-muted)]">
          For a viva walkthrough, follow these pages in order.
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/analyze', label: '1. Analyzer', icon: ScanSearch, hint: 'Live inference' },
            { to: '/results', label: '2. Results', icon: Gauge, hint: 'Test-set metrics' },
            {
              to: '/visualizations',
              label: '3. Visualizations',
              icon: ChartColumn,
              hint: 'Matrices & curves',
            },
            { to: '/about', label: '4. About', icon: BookOpen, hint: 'Method & limits' },
          ].map(({ to, label, icon: Icon, hint }) => (
            <Link
              key={to}
              to={to}
              className="panel flex items-start gap-3 p-4 no-underline transition hover:bg-white"
            >
              <Icon className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={20} />
              <span>
                <span className="block font-semibold text-[var(--color-ink)]">{label}</span>
                <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">{hint}</span>
              </span>
            </Link>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Cpu,
            title: 'Two real models',
            body: 'Custom CNN and MobileNetV2 — both trained on CarDD, no dummy outputs.',
          },
          {
            icon: Gauge,
            title: 'Measured metrics',
            body: 'Accuracy, precision, recall, F1, latency, and size from the evaluation artifacts.',
          },
          {
            icon: ShieldCheck,
            title: 'Honest AI UX',
            body: 'Missing models and API errors are shown clearly — never fabricated predictions.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <article key={title} className="panel panel-pad">
            <Icon className="text-[var(--color-accent)]" size={22} />
            <h2 className="m-0 mt-3 text-base font-semibold text-[var(--color-ink)]">{title}</h2>
            <p className="m-0 mt-2 text-sm text-[var(--color-ink-muted)]">{body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
