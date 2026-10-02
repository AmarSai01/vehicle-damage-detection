import { useCallback, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { ImageGenerationLoader } from '@/components/ui/image-generation-loader'
import { FileUpload } from '@/components/ui/file-upload'

const ACCEPTED = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp']
const ACCEPT_ATTR = '.jpg,.jpeg,.png,.bmp,.webp,image/jpeg,image/png,image/bmp,image/webp'
const MAX_MB = 10

/** Premium cyan → blue range matching the dark automotive AI UI */
const LOADER_COLORS = ['#67e8f9', '#2563eb'] as const

interface Props {
  file: File | null
  previewUrl: string | null
  onFileChange: (file: File | null, preview: string | null) => void
  disabled?: boolean
  /** True only while the real /api/predict request is in flight */
  analyzing?: boolean
}

export function ImageUpload({
  file,
  previewUrl,
  onFileChange,
  disabled,
  analyzing = false,
}: Props) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploadKey, setUploadKey] = useState(0)

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

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    handleFile(null)
    setUploadKey((k) => k + 1)
  }

  return (
    <section className="min-w-0">
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-[rgba(148,163,184,0.22)] bg-[rgba(7,11,20,0.45)]">
          <img
            src={previewUrl}
            alt="Upload preview"
            className="max-h-[min(52vh,440px)] w-full object-contain bg-[#04070f]"
          />

          {analyzing ? (
            <div
              className="absolute inset-0 overflow-hidden"
              aria-live="polite"
              aria-busy="true"
              aria-label="Analyzing vehicle"
            >
              <ImageGenerationLoader
                text="ANALYZING VEHICLE"
                effect="shimmer"
                colors={LOADER_COLORS}
                duration={3200}
                bandHeight={56}
                cellSize={5}
                gap={2}
                overlayOpacity={0.28}
              />
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 text-white">
              <p className="min-w-0 truncate text-sm">{file?.name}</p>
              <button
                type="button"
                disabled={disabled}
                onClick={clearFile}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/20 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={[
            'overflow-hidden rounded-2xl border border-dashed transition',
            'border-[rgba(148,163,184,0.28)] bg-[rgba(7,11,20,0.45)]',
          ].join(' ')}
        >
          <FileUpload
            key={uploadKey}
            accept={ACCEPT_ATTR}
            disabled={disabled || analyzing}
            title="Upload vehicle image"
            description={`Drag or drop a vehicle photo here, or click to browse · JPG, PNG, BMP, WebP · max ${MAX_MB} MB`}
            onChange={(files) => handleFile(files[0] ?? null)}
          />
        </div>
      )}
      {localError && (
        <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">
          {localError}
        </p>
      )}
    </section>
  )
}
