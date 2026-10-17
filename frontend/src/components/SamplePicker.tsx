import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { SAMPLE_IMAGES, type SampleImage } from '../content/samples'

interface Props {
  /** Receives the sample as a real File, exactly like a user upload */
  onPick: (file: File, previewUrl: string) => void
  disabled?: boolean
}

export function SamplePicker({ onPick, disabled }: Props) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pick = async (sample: SampleImage) => {
    setPending(sample.id)
    setError(null)
    try {
      const res = await fetch(sample.src)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const file = new File([blob], `sample-${sample.id}.jpg`, { type: blob.type || 'image/jpeg' })
      onPick(file, URL.createObjectURL(file))
    } catch {
      setError('Could not load that sample image. Please try another one.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="min-w-0">
      <p className="m-0 text-sm font-semibold text-[var(--color-ink)]">No photo handy? Try a sample</p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SAMPLE_IMAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={disabled || pending !== null}
            onClick={() => void pick(s)}
            className="group relative overflow-hidden rounded-xl border border-[rgba(148,163,184,0.2)] bg-[rgba(7,11,20,0.45)] text-left transition hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Use sample photo: ${s.label}`}
          >
            <img
              src={s.thumb}
              alt={s.alt}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover transition group-hover:scale-105"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-xs font-semibold text-white">
              {s.label}
            </span>
            {pending === s.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 size={18} className="animate-spin text-cyan-200" />
              </span>
            )}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      <p className="m-0 mt-2 text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
        Sample photos from Wikimedia Commons:{' '}
        {SAMPLE_IMAGES.map((s, i) => (
          <span key={s.id}>
            <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {s.label}
            </a>{' '}
            by {s.author} (
            {s.licenseUrl ? (
              <a href={s.licenseUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                {s.license}
              </a>
            ) : (
              s.license
            )}
            ){i < SAMPLE_IMAGES.length - 1 ? ' · ' : '.'}
          </span>
        ))}{' '}
        Not part of the training data.
      </p>
    </div>
  )
}
