import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Header } from './components/Header'
import { HomePage } from './pages/HomePage'

// Home is the landing page and ships in the main bundle; every other page
// (and heavy libraries like Recharts) loads only when it is first visited.
const AnalyzerPage = lazy(() => import('./pages/AnalyzerPage').then((m) => ({ default: m.AnalyzerPage })))
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const ComparePage = lazy(() => import('./pages/ComparePage').then((m) => ({ default: m.ComparePage })))
const VisualizationsPage = lazy(() =>
  import('./pages/VisualizationsPage').then((m) => ({ default: m.VisualizationsPage })),
)
const ClassesPage = lazy(() => import('./pages/ClassesPage').then((m) => ({ default: m.ClassesPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))

function PageFallback() {
  return (
    <div className="page-shell flex items-center justify-center gap-2 py-24 text-sm text-[var(--color-ink-muted)]">
      <Loader2 size={18} className="animate-spin" />
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Header />
        <main className="min-w-0 flex-1">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze" element={<AnalyzerPage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/visualizations" element={<VisualizationsPage />} />
              <Route path="/classes" element={<ClassesPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Suspense>
        </main>
        <footer className="mx-auto w-full max-w-6xl border-t border-[rgba(148,163,184,0.12)] px-4 py-8 text-center text-xs leading-relaxed text-[var(--color-ink-muted)] sm:px-6">
          Vehiorax · AI vehicle damage detection · Two deep-learning models trained on the CarDD
          research dataset · Real predictions, never faked
        </footer>
      </div>
    </BrowserRouter>
  )
}
