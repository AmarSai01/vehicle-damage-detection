import type { ComparisonData } from '../types'
import { UiState } from './UiState'

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

const ROWS: {
  key: keyof NonNullable<ComparisonData['models']['custom_cnn']>
  label: string
  kind: string
}[] = [
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
    return <UiState kind="loading" title="Loading comparison">Fetching evaluation metrics…</UiState>
  }

  if (error) {
    return <UiState kind="error" title="Could not load comparison">{error}</UiState>
  }

  const notReady =
    !comparison ||
    comparison.status === 'not_trained' ||
    (comparison.models?.custom_cnn?.status === 'not_trained' &&
      comparison.models?.mobilenetv2?.status === 'not_trained')

  if (notReady) {
    return (
      <UiState kind="empty" title="Not trained yet">
        {comparison?.message || 'Evaluation results will appear after training.'}
      </UiState>
    )
  }

  const cnn = comparison.models.custom_cnn
  const mnv = comparison.models.mobilenetv2

  return (
    <div className="panel animate-fade-up overflow-hidden">
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <h3 className="font-display m-0 text-2xl text-[var(--color-ink)]">Side-by-side metrics</h3>
        <p className="m-0 mt-1 text-sm text-[var(--color-ink-muted)]">
          Held-out test split — values from the evaluation artifact only.
        </p>
      </div>
      <div className="table-scroll">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--color-surface)] text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-5 py-3 font-medium">Metric</th>
              <th className="px-5 py-3 font-medium text-[var(--color-cnn)]">Custom CNN</th>
              <th className="px-5 py-3 font-medium text-[var(--color-mnv2)]">MobileNetV2</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, idx) => {
              const cnnVal =
                cnn.status === 'evaluated' ? (cnn[row.key] as number | null | undefined) : null
              const mnvVal =
                mnv.status === 'evaluated' ? (mnv[row.key] as number | null | undefined) : null
              return (
                <tr
                  key={row.key}
                  className={[
                    'border-t border-[var(--color-line)]',
                    idx % 2 === 1 ? 'bg-white/40' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3 font-medium text-[var(--color-ink)]">{row.label}</td>
                  <td className="px-5 py-3 tabular-nums">
                    {cnn.status === 'evaluated' ? fmt(cnnVal, row.kind) : 'Not trained yet.'}
                  </td>
                  <td className="px-5 py-3 tabular-nums">
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
