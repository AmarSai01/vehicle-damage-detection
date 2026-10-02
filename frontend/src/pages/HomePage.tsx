import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChartColumn,
  Cpu,
  Gauge,
  Layers,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { fetchComparison } from '../api/client'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { BackgroundBeams } from '../components/ui/background-beams'
import { CardBody, CardContainer, CardItem } from '../components/ui/3d-card'
import { Spotlight } from '../components/ui/spotlight-new'
import { MetricCard } from '../components/PageHeader'
import { CLASS_SUPPORT, SPLIT_COUNTS } from '../content/academicFacts'

function fmtPct(v: number | null | undefined) {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

const CLASS_LIST = Object.values(CLASS_SUPPORT).map((c) => c.title)

export function HomePage() {
  const [cnnAcc, setCnnAcc] = useState<number | null>(null)
  const [mnvAcc, setMnvAcc] = useState<number | null>(null)
  const [metricsReady, setMetricsReady] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchComparison()
        const cnn = data.models?.custom_cnn
        const mnv = data.models?.mobilenetv2
        if (
          data.status === 'evaluated' &&
          cnn?.status === 'evaluated' &&
          mnv?.status === 'evaluated'
        ) {
          setCnnAcc(cnn.accuracy ?? null)
          setMnvAcc(mnv.accuracy ?? null)
          setMetricsReady(true)
        }
      } catch {
        setMetricsReady(false)
      }
    })()
  }, [])

  return (
    <div className="page-shell">
      <section className="relative isolate overflow-hidden rounded-[1.6rem] border border-[rgba(148,163,184,0.14)] bg-[rgba(13,21,38,0.72)] px-5 py-10 sm:px-8 sm:py-14">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <BackgroundBeams />
          <Spotlight
            gradientFirst="radial-gradient(68.54% 68.72% at 55.02% 31.46%, hsla(187, 94%, 72%, .42) 0, hsla(199, 89%, 48%, .12) 50%, hsla(210, 100%, 45%, 0) 80%)"
            gradientSecond="radial-gradient(50% 50% at 50% 50%, hsla(187, 90%, 68%, .28) 0, hsla(199, 89%, 48%, .08) 80%, transparent 100%)"
            gradientThird="radial-gradient(50% 50% at 50% 50%, hsla(210, 100%, 78%, .2) 0, hsla(199, 80%, 48%, .06) 80%, transparent 100%)"
            translateY={-160}
          />
        </div>
        <div className="hero-grid" aria-hidden />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl"
        />

        <div className="relative z-10 max-w-3xl">
          <Badge tone="accent">
            <Sparkles size={12} /> Academic AI System · CarDD
          </Badge>
          <h1 className="font-display animate-fade-up mt-5 text-4xl leading-[1.05] text-[var(--color-ink)] sm:text-5xl md:text-6xl">
            AI-Powered Vehicle Damage Detection
          </h1>
          <p className="animate-fade-up-delay mt-5 max-w-2xl text-base text-[var(--color-ink-muted)] sm:text-lg">
            Classify exterior car damage from a single photo with two real TensorFlow models — a
            Custom CNN trained from scratch and MobileNetV2 with ImageNet transfer learning —
            evaluated fairly on the same authorized CarDD split.
          </p>
          <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
            <Button to="/analyze" variant="primary">
              Analyze Vehicle
              <ArrowRight size={18} />
            </Button>
            <Button to="/results" variant="secondary">
              Explore Results
            </Button>
          </div>
        </div>

        <div className="relative z-10 mt-10 grid gap-3 md:grid-cols-3">
          <MetricCard
            label="Custom CNN"
            value={metricsReady ? fmtPct(cnnAcc) : '—'}
            hint="Test accuracy · from-scratch baseline"
            tone="cnn"
          />
          <MetricCard
            label="MobileNetV2"
            value={metricsReady ? fmtPct(mnvAcc) : '—'}
            hint="Test accuracy · transfer learning"
            tone="mnv2"
          />
          <MetricCard
            label="Held-out test"
            value={SPLIT_COUNTS.test}
            hint={`Train ${SPLIT_COUNTS.train} · Val ${SPLIT_COUNTS.val}`}
            tone="accent"
          />
        </div>
        {!metricsReady && (
          <p className="relative z-10 m-0 mt-3 text-xs text-[var(--color-warn)]">
            Start the backend to load live evaluation metrics on this page.
          </p>
        )}
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <CardContainer containerClassName="h-full w-full py-0" className="h-full w-full">
          <CardBody className="h-full w-full">
            <CardItem translateZ={14} className="h-full w-full">
              <Card className="h-full w-full">
                <Badge tone="cnn">Baseline</Badge>
                <h2 className="font-display m-0 mt-3 text-2xl text-[var(--color-ink)]">Custom CNN</h2>
                <p className="m-0 mt-2 text-sm text-[var(--color-ink-muted)]">
                  Scratch TensorFlow/Keras architecture with progressive conv blocks (32→256), trained
                  without ImageNet weights — the academic from-scratch baseline.
                </p>
                <div className="mt-4 flex items-center gap-2 text-cyan-200/90">
                  <Cpu size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Random init</span>
                </div>
              </Card>
            </CardItem>
          </CardBody>
        </CardContainer>
        <CardContainer containerClassName="h-full w-full py-0" className="h-full w-full">
          <CardBody className="h-full w-full">
            <CardItem translateZ={14} className="h-full w-full">
              <Card className="h-full w-full">
                <Badge tone="mnv2">Transfer learning</Badge>
                <h2 className="font-display m-0 mt-3 text-2xl text-[var(--color-ink)]">MobileNetV2</h2>
                <p className="m-0 mt-2 text-sm text-[var(--color-ink-muted)]">
                  ImageNet-pretrained backbone with a custom 6-class head, freeze-then-fine-tune training —
                  stronger features with a much smaller artifact in this experiment.
                </p>
                <div className="mt-4 flex items-center gap-2 text-teal-200/90">
                  <BrainCircuit size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">ImageNet + fine-tune</span>
                </div>
              </Card>
            </CardItem>
          </CardBody>
        </CardContainer>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="section-label mb-2">Demo path</p>
            <h2 className="font-display m-0 text-2xl text-[var(--color-ink)]">Walk the platform</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/analyze', label: '1. Analyzer', icon: ScanSearch, hint: 'Live inference' },
            { to: '/results', label: '2. Results', icon: Gauge, hint: 'Test-set metrics' },
            { to: '/visualizations', label: '3. Visualizations', icon: ChartColumn, hint: 'Matrices & curves' },
            { to: '/about', label: '4. About', icon: BookOpen, hint: 'Method & limits' },
          ].map(({ to, label, icon: Icon, hint }) => (
            <Button
              key={to}
              to={to}
              variant="secondary"
              className="!justify-start h-auto !items-start gap-3 !px-4 !py-4 text-left"
            >
              <Icon className="mt-0.5 shrink-0 text-[var(--color-accent)]" size={20} />
              <span>
                <span className="block font-semibold text-[var(--color-ink)]">{label}</span>
                <span className="mt-0.5 block text-xs font-normal text-[var(--color-ink-muted)]">
                  {hint}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card hover>
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[var(--color-accent)]" />
            <h2 className="font-display m-0 text-xl text-[var(--color-ink)]">Six CarDD classes</h2>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {CLASS_LIST.map((name) => (
              <Badge key={name} tone="muted">
                {name}
              </Badge>
            ))}
          </div>
          <p className="m-0 mt-4 text-sm text-[var(--color-ink-muted)]">
            No invented “no damage” class — CarDD does not provide one. Support counts and labeling
            details are on the Classes page.
          </p>
        </Card>
        <Card hover>
          <h2 className="font-display m-0 text-xl text-[var(--color-ink)]">Technology stack</h2>
          <ul className="m-0 mt-3 list-disc space-y-1.5 pl-5 text-sm text-[var(--color-ink-muted)]">
            <li>Frontend: React, Vite, TypeScript, Tailwind, Recharts</li>
            <li>Backend: FastAPI, Uvicorn, Pydantic</li>
            <li>ML: TensorFlow / Keras, scikit-learn, Pillow</li>
          </ul>
        </Card>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            icon: Cpu,
            title: 'Two real models',
            body: 'Custom CNN and MobileNetV2 — both trained on CarDD, no dummy outputs.',
          },
          {
            icon: Gauge,
            title: 'Measured metrics',
            body: 'Accuracy, precision, recall, F1, latency, and size from evaluation artifacts.',
          },
          {
            icon: ShieldCheck,
            title: 'Honest AI UX',
            body: 'Missing models and API errors are shown clearly — never fabricated predictions.',
          },
        ].map(({ icon: Icon, title, body }) => (
          <Card key={title} hover>
            <Icon className="text-[var(--color-accent)]" size={22} />
            <h2 className="m-0 mt-3 text-base font-semibold text-[var(--color-ink)]">{title}</h2>
            <p className="m-0 mt-2 text-sm text-[var(--color-ink-muted)]">{body}</p>
          </Card>
        ))}
      </section>
    </div>
  )
}
