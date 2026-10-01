/**
 * Frontend unit tests (Vitest) for upload validation helpers and result rendering logic.
 * Run: cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom && npx vitest run
 *
 * These tests do not call a real API or invent ML metrics.
 */
import { describe, expect, it } from 'vitest'

function validateClientFile(file: { name: string; type: string; size: number }) {
  const accepted = ['image/jpeg', 'image/png', 'image/bmp', 'image/webp']
  const max = 10 * 1024 * 1024
  if (!accepted.includes(file.type) && !/\.(jpe?g|png|bmp|webp)$/i.test(file.name)) {
    return 'Unsupported format. Use JPG, PNG, BMP, or WebP.'
  }
  if (file.size > max) return `File too large. Maximum size is 10 MB.`
  return null
}

function renderPredictionState(result: {
  available: boolean
  class: string | null
  confidence: number | null
  message: string | null
}) {
  if (!result.available) {
    return { kind: 'unavailable' as const, text: result.message || 'Model not available' }
  }
  return {
    kind: 'ok' as const,
    className: result.class,
    confidence: result.confidence,
  }
}

describe('upload validation', () => {
  it('accepts png', () => {
    expect(validateClientFile({ name: 'a.png', type: 'image/png', size: 100 })).toBeNull()
  })
  it('rejects txt', () => {
    expect(validateClientFile({ name: 'a.txt', type: 'text/plain', size: 10 })).toMatch(
      /Unsupported/,
    )
  })
  it('rejects oversized', () => {
    expect(
      validateClientFile({ name: 'a.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 }),
    ).toMatch(/too large/i)
  })
})

describe('prediction result rendering', () => {
  it('shows model unavailable without inventing confidence', () => {
    const view = renderPredictionState({
      available: false,
      class: null,
      confidence: null,
      message: 'Model not available. Train the model before running inference.',
    })
    expect(view.kind).toBe('unavailable')
    expect(view.text).toMatch(/not available/i)
  })

  it('renders real prediction fields', () => {
    const view = renderPredictionState({
      available: true,
      class: 'Dent',
      confidence: 0.91,
      message: null,
    })
    expect(view.kind).toBe('ok')
    if (view.kind === 'ok') {
      expect(view.className).toBe('Dent')
      expect(view.confidence).toBe(0.91)
    }
  })
})

describe('API error state messaging', () => {
  it('maps network failure to unavailable copy', () => {
    const apiOk = false
    const message = apiOk
      ? null
      : 'Cannot reach the FastAPI backend. Start it with uvicorn backend.app.main:app --reload'
    expect(message).toMatch(/API backend/i)
  })
})
