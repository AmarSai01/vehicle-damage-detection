import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Header } from './components/Header'
import { AboutPage } from './pages/AboutPage'
import { AnalyzerPage } from './pages/AnalyzerPage'
import { ClassesPage } from './pages/ClassesPage'
import { ComparePage } from './pages/ComparePage'
import { HomePage } from './pages/HomePage'
import { ResultsPage } from './pages/ResultsPage'
import { VisualizationsPage } from './pages/VisualizationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden">
        <Header />
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analyze" element={<AnalyzerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/visualizations" element={<VisualizationsPage />} />
            <Route path="/classes" element={<ClassesPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
        <footer className="mx-auto w-full max-w-6xl border-t border-[rgba(148,163,184,0.12)] px-4 py-8 text-center text-xs leading-relaxed text-[var(--color-ink-muted)] sm:px-6">
          Vehicle Damage Detection &amp; Classification · Academic AI demonstration · Real Keras
          inference · No fabricated predictions
        </footer>
      </div>
    </BrowserRouter>
  )
}
