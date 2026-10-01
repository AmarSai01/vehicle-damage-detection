const CLASSES = [
  {
    id: 'dent',
    title: 'Dent',
    body: 'Localized deformation of body panels where metal or surface material is pushed inward without full puncture.',
  },
  {
    id: 'scratch',
    title: 'Scratch',
    body: 'Surface abrasion or scoring of paint/clear coat, often elongated, without deep structural collapse.',
  },
  {
    id: 'crack',
    title: 'Crack',
    body: 'Linear fracture in painted surfaces, plastic trim, or coatings — typically thinner and more fracture-like than a scratch.',
  },
  {
    id: 'glass_shatter',
    title: 'Glass Shatter',
    body: 'Damaged or fragmented vehicle glass (windshield, windows) with shatter patterns or broken panes.',
  },
  {
    id: 'lamp_broken',
    title: 'Lamp Broken',
    body: 'Broken or shattered headlamp/taillamp housings and lenses with visible lamp assembly damage.',
  },
  {
    id: 'tire_flat',
    title: 'Tire Flat',
    body: 'Deflated or collapsed tire appearance relative to a normally inflated wheel.',
  },
] as const

export function ClassesPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <section className="max-w-2xl">
        <h1 className="font-display text-4xl">Damage Classes</h1>
        <p className="mt-2 text-[var(--color-ink-muted)]">
          Six CarDD categories used by both models. There is no invented “no damage” class —
          CarDD does not provide one.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CLASSES.map((c, i) => (
          <article
            key={c.id}
            className="rounded-2xl border border-[var(--color-line)] bg-white/85 p-5 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Class {i + 1}
            </p>
            <h2 className="font-display mt-2 text-2xl text-[var(--color-ink)]">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-muted)]">{c.body}</p>
            <p className="mt-3 font-mono text-xs text-[var(--color-ink-muted)]">{c.id}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
