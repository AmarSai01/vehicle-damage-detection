import type { ComparisonData } from '../types'

interface Props {
  comparison: ComparisonData | null
  loading?: boolean
  error?: string | null
}

function fmt(value: number | null | undefined, suffix = '') {
  if (value == null || Number.isNaN(value)) return '—'
  if (suffix === '%') return `${(value * 100).toFixed(2)}%`
  if (suffix === 'ms') return `${value.toFixed(2)} ms`
  if (suffix === 'MB') return `${value.toFixed(2)} MB`
  if (suffix === 'params') return value.toLocaleString()
  return value.toFixed(4)
}

const ROWS: { key: keyof NonNullable<ComparisonData['models']['custom_cnn']>; label: string; kind: string }[] = [
  { key: 'accuracy', label: 'Accuracy', kind: '%' },
  { key: 'precision', label: 'Precision (macro)', kind: '%' },
  { key: 'recall', label: 'Recall (macro)', kind: '%' },
  { key: 'f1', label: 'F1 Score (macro)', kind: '%' },
  { key: 'inference_time_ms', label: 'Inference Time', kind: 'ms' },
  { key: 'model_size_mb', label: 'Model Size', kind: 'MB' },
  { key: 'parameters', label: 'Parameters', kind: 'params' },
]

export function ComparisonTable({ comparison, loading, error }: Props) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-6 text-sm text-[var(--color-ink-muted)]">
        Loading evaluation results…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--color-line)] bg-white/80 p-6 text-sm text-[var(--color-danger)]">
        {error}
      </div>
    )
  }

  const notReady =
    !comparison ||
    comparison.status === 'not_trained' ||
    (comparison.models?.custom_cnn?.status === 'not_trained' &&
      comparison.models?.mobilenetv2?.status === 'not_trained')

  if (notReady) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-line)] bg-white/70 p-6">
        <h3 className="font-display text-2xl text-[var(--color-ink)]">Model Comparison</h3>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          {comparison?.message ||
            'Evaluation results will appear after training.'}
        </p>
        <p className="mt-3 text-sm text-[var(--color-warn)]">Not trained yet.</p>
      </div>
    )
  }

  const cnn = comparison.models.custom_cnn
  const mnv = comparison.models.mobilenetv2

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white/90 shadow-sm">
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <h3 className="font-display text-2xl">Model Comparison</h3>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Metrics measured on the held-out test split — no fabricated values.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Metric</th>
              <th className="px-5 py-3 font-medium text-[var(--color-cnn)]">Custom CNN</th>
              <th className="px-5 py-3 font-medium text-[var(--color-mnv2)]">MobileNetV2</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const cnnVal = cnn.status === 'evaluated' ? (cnn[row.key] as number | null | undefined) : null
              const mnvVal = mnv.status === 'evaluated' ? (mnv[row.key] as number | null | undefined) : null
              return (
                <tr key={row.key} className="border-t border-[var(--color-line)]">
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{row.label}</td>
                  <td className="px-5 py-3">
                    {cnn.status === 'evaluated' ? fmt(cnnVal, row.kind) : 'Not trained yet.'}
                  </td>
                  <td className="px-5 py-3">
                    {mnv.status === 'evaluated' ? fmt(mnvVal, row.kind) : 'Not trained yet.'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
