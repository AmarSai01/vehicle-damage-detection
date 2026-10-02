interface Props {
  title: string
  classNames: string[]
  matrix: number[][]
}

function cellColor(value: number, max: number): string {
  if (max <= 0) return 'rgba(34, 211, 238, 0.06)'
  const t = Math.min(1, value / max)
  const alpha = 0.08 + t * 0.72
  return `rgba(34, 211, 238, ${alpha.toFixed(3)})`
}

export function ConfusionMatrixHeatmap({ title, classNames, matrix }: Props) {
  const max = Math.max(0, ...matrix.flat())
  const short = classNames.map((n) =>
    n.replace('Glass Shatter', 'Glass').replace('Lamp Broken', 'Lamp').replace('Tire Flat', 'Tire'),
  )

  return (
    <div className="table-scroll min-w-0">
      <p className="mb-3 text-sm font-semibold text-[var(--color-ink)]">{title}</p>
      <table className="min-w-[420px] border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="p-1.5 text-left text-[var(--color-ink-muted)]">True \\ Pred</th>
            {short.map((name) => (
              <th key={name} className="p-1.5 font-medium text-[var(--color-ink-muted)]">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={classNames[i] ?? i}>
              <th className="whitespace-nowrap p-1.5 text-left font-medium text-[var(--color-ink-muted)]">
                {short[i]}
              </th>
              {row.map((val, j) => (
                <td
                  key={`${i}-${j}`}
                  className="border border-[rgba(148,163,184,0.12)] p-2 font-semibold tabular-nums text-[var(--color-ink)]"
                  style={{
                    background: cellColor(val, max),
                    color: val / Math.max(max, 1) > 0.55 ? '#041018' : undefined,
                  }}
                  title={`True: ${classNames[i]} · Pred: ${classNames[j]} · Count: ${val}`}
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
        Darker cells = higher counts. Rows are true labels; columns are predicted labels.
      </p>
    </div>
  )
}
