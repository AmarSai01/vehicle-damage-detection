import { PageHeader } from '../components/PageHeader'
import { LABEL_STRATEGY, LABEL_STRATEGY_SUMMARY, CLASS_SUPPORT } from '../data/academicFacts'

const CLASS_ORDER = [
  'dent',
  'scratch',
  'crack',
  'glass_shatter',
  'lamp_broken',
  'tire_flat',
] as const

const CLASS_BODIES: Record<(typeof CLASS_ORDER)[number], string> = {
  dent: 'Localized deformation of body panels where metal or surface material is pushed inward without full puncture.',
  scratch:
    'Surface abrasion or scoring of paint/clear coat, often elongated, without deep structural collapse.',
  crack:
    'Linear fracture in painted surfaces, plastic trim, or coatings — typically thinner and more fracture-like than a scratch.',
  glass_shatter:
    'Damaged or fragmented vehicle glass (windshield, windows) with shatter patterns or broken panes.',
  lamp_broken:
    'Broken or shattered headlamp/taillamp housings and lenses with visible lamp assembly damage.',
  tire_flat: 'Deflated or collapsed tire appearance relative to a normally inflated wheel.',
}

export function ClassesPage() {
  return (
    <div className="page-shell section-stack">
      <PageHeader
        title="Damage Classes"
        subtitle='Six CarDD categories used by both models. There is no invented “no damage” class — CarDD does not provide one.'
      />

      <section className="panel panel-pad text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display m-0 text-xl text-[var(--color-ink)]">Image-level labeling</h2>
        <p className="m-0 mt-2">{LABEL_STRATEGY_SUMMARY}</p>
        <p className="m-0 mt-2">
          Support counts below come from this project’s verified{' '}
          <code className="rounded bg-white/70 px-1 text-xs">split_meta.json</code> (
          <code className="rounded bg-white/70 px-1 text-xs">{LABEL_STRATEGY}</code>
          ). Rare classes—especially <strong className="text-[var(--color-ink)]">crack</strong>{' '}
          (only {CLASS_SUPPORT.crack.test} test images)—are harder to learn and evaluate reliably.
        </p>
      </section>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASS_ORDER.map((id, i) => {
          const support = CLASS_SUPPORT[id]
          return (
            <article key={id} className="panel panel-pad min-w-0">
              <p className="section-label m-0 text-[var(--color-accent)]">Class {i + 1}</p>
              <h2 className="font-display m-0 mt-2 text-2xl text-[var(--color-ink)]">
                {support.title}
              </h2>
              <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">
                {CLASS_BODIES[id]}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--color-ink-muted)]">
                {(
                  [
                    ['All', support.all],
                    ['Train', support.train],
                    ['Val', support.val],
                    ['Test', support.test],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-[var(--color-surface)] px-2.5 py-2">
                    <dt className="m-0">{label}</dt>
                    <dd className="m-0 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 font-mono text-xs text-[var(--color-ink-muted)]">{id}</p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
