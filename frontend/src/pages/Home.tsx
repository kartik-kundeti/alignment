import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Container, Eyebrow, Logo } from '@/components/Layout'
import { api, type AreaResult } from '@/lib/api'
import { useApi } from '@/lib/useApi'

const DEMO_TEAM = 'SYNTHETIC_Engineering_Platform'

export default function Home() {
  const team = useApi(() => api.team(DEMO_TEAM), [])
  const overview = useApi(api.overview, [])
  const research = useApi(api.research, [])
  const respondents = overview.data?.teams.reduce((s, t) => s + t.respondents, 0)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy pt-40 pb-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_10%,rgba(233,180,76,0.18),transparent_60%),radial-gradient(50%_50%_at_0%_100%,rgba(25,135,84,0.12),transparent_60%)]" />
        <Logo className="pointer-events-none absolute -right-24 bottom-[-120px] h-[520px] w-[680px] text-white opacity-[0.04]" />
        <Container className="relative grid items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <Eyebrow onDark>Communication analytics for managers</Eyebrow>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.035em] md:text-7xl">
              From survey scores to <span className="text-brand-gold">better conversations.</span>
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/70">
              CommsAlign reads a team's engagement results, shows which communication habits need attention, and helps managers write the next message well. Every recommendation traces to published workplace research.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/team-diagnostic" className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 font-medium text-navy transition-colors hover:bg-white">
                Explore a team <ArrowRight className="size-4" />
              </Link>
              <Link to="/message-coach" className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-medium text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                Try the Message Coach
              </Link>
            </div>
          </div>

          {/* Live glimpse of Tool 2 */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand-gold/20 to-transparent blur-2xl" />
            <div className="relative rounded-3xl bg-white/[0.06] p-8 ring-1 ring-white/15 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">Live example</div>
              <div className="mt-2 text-2xl font-semibold">{team.data?.name ?? 'Engineering Platform'}</div>
              <div className="text-sm text-white/55">should focus on</div>
              <ol className="mt-6 space-y-5">
                {(team.data?.themes ?? []).map((t) => (
                  <li key={t.item_id} className="flex items-center gap-5">
                    <span className="text-3xl font-light tabular-nums text-brand-gold">{String(t.rank).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <div className="font-medium">{t.label}</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-red to-brand-gold" style={{ width: `${(t.mean / 5) * 100}%` }} />
                      </div>
                    </div>
                    <span className="w-12 text-right tabular-nums text-white/80">{t.mean.toFixed(2)}</span>
                  </li>
                ))}
              </ol>
              <Link to={`/team-diagnostic?view=team&team=${DEMO_TEAM}`} className="mt-8 inline-flex items-center gap-1.5 text-sm text-brand-gold hover:text-white">
                See the full diagnosis <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* Numbers */}
      <section className="border-b border-navy/10">
        <Container className="grid grid-cols-2 divide-navy/10 md:grid-cols-4 md:divide-x">
          {[
            [overview.data ? String(overview.data.areas.length) : '6', 'survey areas backed by research'],
            [research.data ? String(research.data.sources.length) : '17', 'published studies behind the advice'],
            [overview.data ? String(overview.data.teams.length) : '27', 'teams in the demonstration company'],
            [respondents ? String(respondents) : '614', 'simulated survey respondents'],
          ].map(([n, l]) => (
            <div key={l} className="px-2 py-10 md:px-8">
              <div className="text-4xl font-semibold tracking-tight text-navy md:text-5xl">{n}</div>
              <div className="mt-2 text-sm text-navy/55">{l}</div>
            </div>
          ))}
        </Container>
      </section>

      {/* Two products */}
      <section className="py-28">
        <Container>
          <Eyebrow>The product</Eyebrow>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-navy md:text-5xl">Two tools. One body of research.</h2>

          <div className="mt-20 space-y-28">
            <Feature
              n="01" title="Team Diagnostic" to="/team-diagnostic" cta="Open the Team Diagnostic"
              text="Reads Q12 engagement results for a team, a department or the whole company and names up to three communication areas to work on, each with habits to practice and a question to open the conversation."
              points={['Compares each team with the company, the way Gallup compares with its global database', 'Separates clear gaps from possible noise', 'Shows whether a gap belongs to one team or a whole department']}
              visual={<DiagnosticVisual areas={(team.data?.areas ?? []).map((a) => ({ ...a, rank: team.data?.themes.find((t) => t.item_id === a.item_id)?.rank ?? null, status: team.data?.themes.find((t) => t.item_id === a.item_id)?.status ?? a.status }))} name={team.data?.name} />}
            />
            <Feature
              n="02" title="Message Coach" to="/message-coach" cta="Try the Message Coach" flip
              text="Scores a task instruction or a piece of feedback before it is sent, quotes the evidence from the draft, and proposes a revision that explains every change."
              points={['Scored on dimensions drawn from goal-setting and feedback research', 'Leaves placeholders for details only the writer knows', 'Rescored after revision, so improvement is measured, not assumed']}
              visual={<CoachVisual />}
            />
          </div>
        </Container>
      </section>

      {/* How it works */}
      <section className="relative overflow-hidden bg-navy py-28 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_0%_100%,rgba(233,180,76,0.14),transparent_60%)]" />
        <Container className="relative">
          <Eyebrow onDark>How it works</Eyebrow>
          <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-[-0.03em] text-white md:text-5xl">Evidence first, then action.</h2>
          <div className="relative mt-16 grid gap-12 md:grid-cols-3">
            <div className="absolute top-6 right-0 left-0 hidden h-px bg-white/15 md:block" />
            {[
              ['Measure', 'Team survey results are compared with the company. An area is flagged only when it scores under 4 and below the company average.'],
              ['Explain', 'Each flagged area links to findings from published workplace studies that passed our four-point evidence check.'],
              ['Act', 'Managers get habits to practice and a question for the team, then use the Message Coach on the messages they send.'],
            ].map(([t, d], i) => (
              <div key={t} className="relative">
                <div className="flex size-12 items-center justify-center rounded-full bg-brand-gold text-sm font-semibold text-navy ring-8 ring-navy">{i + 1}</div>
                <h3 className="mt-6 text-xl font-semibold text-white">{t}</h3>
                <p className="mt-3 leading-relaxed text-white/65">{d}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Research strip */}
      <section className="py-24">
        <Container className="grid gap-10 md:grid-cols-[1fr_2fr]">
          <div>
            <Eyebrow>Built on research</Eyebrow>
            <p className="text-2xl font-semibold leading-snug tracking-tight text-navy">Every recommendation cites the study behind it.</p>
            <Link to="/research" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-brand-accent">Our evidence standard <ArrowRight className="size-4" /></Link>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-4 self-center text-lg text-navy/40">
            {(research.data?.sources ?? []).map((s) => <span key={s.citation} className="whitespace-nowrap">{s.citation}</span>)}
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="pb-28">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-navy px-10 py-16 text-white md:px-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_100%_0%,rgba(233,180,76,0.25),transparent_60%)]" />
            <div className="relative flex flex-wrap items-end justify-between gap-8">
              <h2 className="max-w-xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">See where your teams' communication stands.</h2>
              <Link to="/team-diagnostic?view=company" className="inline-flex items-center gap-2 rounded-full bg-brand-gold px-7 py-3.5 font-medium text-navy hover:bg-white">View the company <ArrowRight className="size-4" /></Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  )
}

function Feature({ n, title, text, points, to, cta, visual, flip }: { n: string; title: string; text: string; points: string[]; to: string; cta: string; visual: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-14 lg:grid-cols-2">
      <div className={flip ? 'lg:order-2' : ''}>
        <div className="text-sm font-semibold tabular-nums text-brand-accent">{n}</div>
        <h3 className="mt-3 text-3xl font-semibold tracking-tight text-navy">{title}</h3>
        <p className="mt-5 text-lg leading-relaxed text-navy/65">{text}</p>
        <ul className="mt-8 space-y-3">
          {points.map((p) => <li key={p} className="flex gap-4 text-navy/80"><span className="mt-3 h-px w-5 shrink-0 bg-brand-accent" />{p}</li>)}
        </ul>
        <Link to={to} className="mt-10 inline-flex items-center gap-2 font-medium text-navy hover:text-brand-accent">{cta} <ArrowRight className="size-4" /></Link>
      </div>
      <div className={flip ? 'lg:order-1' : ''}>{visual}</div>
    </div>
  )
}

function DiagnosticVisual({ areas, name }: { areas: AreaResult[]; name?: string }) {
  const rows = [...areas].sort((a, b) => b.gap - a.gap)
  return (
    <div className="rounded-[2rem] bg-[#FBF5E6] p-10 ring-1 ring-brand-gold/20">
      <div className="text-sm text-navy/50">{name ?? 'Team'} · difference from company average</div>
      <div className="mt-6 space-y-4">
        {rows.map((a) => {
          const v = -a.gap
          const tone = a.rank ? (a.status === 'Clear gap' ? 'bg-brand-red' : 'bg-brand-gold') : v < 0 ? 'bg-navy/25' : 'bg-brand-green'
          return (
            <div key={a.item_id} className="grid grid-cols-[13rem_1fr] items-center gap-4 text-sm">
              <span className="truncate text-navy/70">{a.label}</span>
              <div className="relative h-3">
                <div className="absolute top-0 left-1/2 h-full w-px bg-navy/25" />
                <div className={`absolute top-0 h-full rounded-full ${tone}`}
                  style={v < 0 ? { right: '50%', width: `${Math.min(Math.abs(v), 1) * 50}%` } : { left: '50%', width: `${Math.min(v, 1) * 50}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CoachVisual() {
  const dims = [['Outcome specificity', 2, 5], ['Time frame', 1, 5], ['Rationale', 1, 4], ['Progress check', 1, 4]] as const
  return (
    <div className="rounded-[2rem] bg-navy p-10 text-white">
      <div className="mb-6 text-xs uppercase tracking-[0.18em] text-white/40">Illustration</div>
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded-full bg-brand-red/20 px-3 py-1 text-[#ff9b9b]">Needs work</span>
        <ArrowRight className="size-4 text-white/40" />
        <span className="rounded-full bg-brand-green/25 px-3 py-1 text-[#7ee0ae]">Good</span>
      </div>
      <div className="mt-8 space-y-5">
        {dims.map(([l, a, b]) => (
          <div key={l}>
            <div className="flex justify-between text-sm"><span className="text-white/75">{l}</span><span className="tabular-nums text-white/50">{a} → {b}</span></div>
            <div className="mt-2 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= b ? (i <= a ? 'bg-white/70' : 'bg-brand-gold') : 'bg-white/10'}`} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
