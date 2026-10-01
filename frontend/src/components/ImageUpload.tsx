import { useCallback, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp']
const MAX_MB = 10

interface Props {
  file: File | null
  previewUrl: string | null
  onFileChange: (file: File | null, preview: string | null) => void
  disabled?: boolean
}

export function ImageUpload({ file, previewUrl, onFileChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleFile = useCallback(
    (f: File | null) => {
      setLocalError(null)
      if (!f) {
        onFileChange(null, null)
        return
      }
      if (!ACCEPTED.includes(f.type) && !/\.(jpe?g|png|bmp|webp)$/i.test(f.name)) {
        setLocalError('Unsupported format. Use JPG, PNG, BMP, or WebP.')
        return
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setLocalError(`File too large. Maximum size is ${MAX_MB} MB.`)
        return
      }
      const url = URL.createObjectURL(f)
      onFileChange(f, url)
    },
    [onFileChange],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const f = e.dataTransfer.files?.[0] ?? null
    handleFile(f)
  }

  return (
    <section className="min-w-0">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={[
          'relative overflow-hidden rounded-2xl border-2 border-dashed transition',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-[0_0_0_4px_rgba(13,115,119,0.08)]'
            : 'border-[var(--color-line)] bg-white/80',
        ].join(' ')}
      >
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Upload preview"
              className="max-h-[min(52vh,440px)] w-full object-contain bg-[#0c1222]/[0.03]"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-[var(--color-ink)]/75 to-transparent px-4 py-3 text-white">
              <p className="min-w-0 truncate text-sm">{file?.name}</p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (previewUrl) URL.revokeObjectURL(previewUrl)
                  handleFile(null)
                  if (inputRef.current) inputRef.current.value = ''
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/25 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 px-6 py-16 text-center disabled:opacity-60"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <Upload size={26} />
            </span>
            <div>
              <p className="text-base font-semibold text-[var(--color-ink)]">
                Drag & drop a vehicle image
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                or click to browse · JPG, PNG, BMP, WebP · max {MAX_MB} MB
              </p>
            </div>
            <span className="btn btn-primary mt-1">
              <ImagePlus size={16} />
              Browse files
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.bmp,.webp,image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {localError && (
        <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">
          {localError}
        </p>
      )}
    </section>
  )
}
