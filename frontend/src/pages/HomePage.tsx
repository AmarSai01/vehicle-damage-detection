import { Link } from 'react-router-dom'
import { ArrowRight, Cpu, Gauge, ShieldCheck } from 'lucide-react'

export function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="relative overflow-hidden pb-16 pt-12 sm:pb-24 sm:pt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-90"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 15% 10%, rgba(13,115,119,0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 90% 0%, rgba(29,78,137,0.14), transparent 55%)',
          }}
        />
        <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
          Academic ML System · CarDD
        </p>
        <h1 className="font-display animate-fade-up mt-4 max-w-3xl text-5xl leading-[1.05] text-[var(--color-ink)] sm:text-6xl md:text-7xl">
          Vehicle Damage Detection
        </h1>
        <p className="animate-fade-up-delay mt-5 max-w-2xl text-base text-[var(--color-ink-muted)] sm:text-lg">
          Classify external car damage from a single photo using two real TensorFlow models —
          a Custom CNN trained from scratch and MobileNetV2 with ImageNet transfer learning —
          evaluated on the authorized CarDD dataset.
        </p>
        <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white no-underline shadow-sm transition hover:bg-[var(--color-accent-dark)]"
          >
            Analyze Vehicle
            <ArrowRight size={18} />
          </Link>
          <Link
            to="/results"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-white/80 px-6 py-3.5 text-sm font-semibold text-[var(--color-ink)] no-underline transition hover:bg-white"
          >
            View Results
          </Link>
        </div>
      </section>

      <section className="grid gap-4 border-t border-[var(--color-line)] py-12 sm:grid-cols-3">
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
          <article key={title} className="rounded-2xl border border-[var(--color-line)] bg-white/70 p-5">
            <Icon className="text-[var(--color-accent)]" size={22} />
            <h2 className="mt-3 font-semibold text-[var(--color-ink)]">{title}</h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{body}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
