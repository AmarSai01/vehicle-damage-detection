import {
  AlertTriangle,
  CircleDot,
  Disc3,
  Droplets,
  Lightbulb,
  Slash,
} from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { LABEL_STRATEGY, LABEL_STRATEGY_SUMMARY, CLASS_SUPPORT } from '../content/academicFacts'

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

const ICONS = {
  dent: CircleDot,
  scratch: Slash,
  crack: AlertTriangle,
  glass_shatter: Droplets,
  lamp_broken: Lightbulb,
  tire_flat: Disc3,
} as const

export function ClassesPage() {
  return (
    <div className="page-shell section-stack">
      <PageHeader
        kicker="Taxonomy"
        title="Damage Classes"
        subtitle='Six CarDD categories used by both models. There is no invented “no damage” class — CarDD does not provide one.'
      />

      <Card hover className="text-sm leading-relaxed text-[var(--color-ink-muted)]">
        <h2 className="font-display m-0 text-xl text-[var(--color-ink)]">Image-level labeling</h2>
        <p className="m-0 mt-2">{LABEL_STRATEGY_SUMMARY}</p>
        <p className="m-0 mt-2">
          Support counts from verified{' '}
          <code className="rounded bg-white/5 px-1 text-xs">split_meta.json</code> (
          <code className="rounded bg-white/5 px-1 text-xs">{LABEL_STRATEGY}</code>
          ). Rare classes—especially <strong className="text-[var(--color-ink)]">crack</strong>{' '}
          (only {CLASS_SUPPORT.crack.test} test images)—are harder to learn and evaluate reliably.
        </p>
      </Card>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASS_ORDER.map((id, i) => {
          const support = CLASS_SUPPORT[id]
          const Icon = ICONS[id]
          return (
            <Card key={id} hover className="group">
              <div className="flex items-start justify-between gap-3">
                <Badge tone="accent">Class {i + 1}</Badge>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(34,211,238,0.12)] text-cyan-300 transition [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-105 group-active:scale-105">
                  <Icon size={18} />
                </span>
              </div>
              <h2 className="font-display m-0 mt-3 text-2xl text-[var(--color-ink)]">{support.title}</h2>
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
                  <div
                    key={label}
                    className="rounded-lg border border-[rgba(148,163,184,0.12)] bg-[rgba(7,11,20,0.45)] px-2.5 py-2"
                  >
                    <dt className="m-0">{label}</dt>
                    <dd className="m-0 text-sm font-semibold tabular-nums text-[var(--color-ink)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="m-0 mt-3 font-mono text-xs text-[var(--color-ink-muted)]">{id}</p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
