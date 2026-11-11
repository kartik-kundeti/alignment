import { ArrowRight, Check, Download, Plus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { Container, Eyebrow, PageHero } from '@/components/Layout'
import { CompanyRange, Grid, Scorecard, SHORT } from '@/components/tool2/Charts'
import { Citations, ThemeList } from '@/components/tool2/ThemeList'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type GroupResult, type Overview } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/utils'

type View = 'team' | 'department' | 'company'
const VIEWS: { id: View; label: string }[] = [
  { id: 'team', label: 'Team' },
  { id: 'department', label: 'Department' },
  { id: 'company', label: 'Whole company' },
]

export default function TeamDiagnostic() {
  const [params, setParams] = useSearchParams()
  const view = (params.get('view') as View) || 'team'
  const overview = useApi(api.overview, [])
  const o = overview.data
  const team = params.get('team') || 'SYNTHETIC_Engineering_Platform'
  const dept = params.get('dept') || o?.departments[0]?.id || ''
  const set = (patch: Record<string, string>) => setParams({ view, team, dept, ...patch }, { replace: true })

  return (
    <>
      <PageHero eyebrow="Team Diagnostic" title="Where should a team focus its communication?">
        Pick a team, a department or the whole company. Up to three areas are flagged, each with habits to practice and a question to open the conversation.
      </PageHero>

      {/* Sticky view bar */}
      <div className="sticky top-[72px] z-40 border-b border-navy/10 bg-white/90 backdrop-blur-xl">
        <Container className="flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          <div className="flex gap-7">
            {VIEWS.map((v) => (
              <button key={v.id} onClick={() => set({ view: v.id })}
                className={cn('relative py-1 text-sm font-medium transition-colors', view === v.id ? 'text-navy' : 'text-navy/50 hover:text-navy')}>
                {v.label}
                {view === v.id && <span className="absolute -bottom-[17px] left-0 h-0.5 w-full bg-brand-accent" />}
              </button>
            ))}
          </div>
          {o && view === 'team' && <TeamPicker o={o} value={team} onChange={(v) => set({ team: v })} />}
          {o && view === 'department' && (
            <Select value={dept} onValueChange={(v) => v && set({ dept: v })} items={o.departments.map((d) => ({ value: d.id, label: d.name }))}>
              <SelectTrigger className="w-60 rounded-full border-navy/15" aria-label="Department"><SelectValue /></SelectTrigger>
              <SelectContent>{o.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <span className="ml-auto hidden text-xs uppercase tracking-[0.16em] text-navy/40 lg:inline">Simulated data</span>
          {o && (
            <a href={`/api/tool2/report/${view}?id=${encodeURIComponent(view === 'team' ? team : view === 'department' ? dept : '')}`} download
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-green/90 lg:ml-0">
              <Download className="size-4" /> Download brief (PDF)
            </a>
          )}
        </Container>
      </div>

      <Container className="py-16">
        {overview.error && <ErrorNote message={overview.error} />}
        {!o ? <Loading /> : view === 'company' ? <CompanyView o={o} /> : (
          <GroupView key={view + (view === 'team' ? team : dept)} kind={view} id={view === 'team' ? team : dept} o={o} />
        )}
      </Container>

      <section className="border-t border-navy/10 bg-white py-16">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Method</Eyebrow>
              <h2 className="text-3xl font-semibold tracking-tight text-navy">How an area is flagged</h2>
            </div>
            <Link to="/research" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:text-brand-accent">Evidence standard and sources <ArrowRight className="size-4" /></Link>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <MethodPoint n="01">Under {o?.rules.floor ?? 4} and below the company average for that area.</MethodPoint>
            <MethodPoint n="02">The company average stands in for Gallup's benchmark database.</MethodPoint>
            <MethodPoint n="03">A clear gap holds across 2,000 resamples. A possible gap may be noise.</MethodPoint>
            <MethodPoint n="04">Only six research-backed areas. Groups under {o?.rules.minimum ?? 4} people are hidden.</MethodPoint>
          </div>
        </Container>
      </section>
    </>
  )
}

function MethodPoint({ n, children }: { n: string; children: ReactNode }) {
  return (
    <div className="border-t border-navy/15 pt-4">
      <div className="text-sm font-semibold tabular-nums text-brand-accent">{n}</div>
      <p className="mt-2 text-[15px] leading-relaxed text-navy/75">{children}</p>
    </div>
  )
}

function TeamPicker({ o, value, onChange }: { o: Overview; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)} items={o.teams.map((t) => ({ value: t.id, label: t.name }))}>
      <SelectTrigger className="w-72 rounded-full border-navy/15" aria-label="Team"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-96">
        {o.departments.map((d) => (
          <SelectGroup key={d.id}>
            <SelectLabel>{d.name}</SelectLabel>
            {o.teams.filter((t) => t.department === d.id).map((t) => <SelectItem key={t.id} value={t.id}>{t.name.replace(`${d.name} `, '')}</SelectItem>)}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}

function GroupView({ kind, id, o }: { kind: 'team' | 'department'; id: string; o: Overview }) {
  const { data, error } = useApi<GroupResult>(() => (kind === 'team' ? api.team(id) : api.department(id)), [kind, id])
  if (error) return <ErrorNote message={error} />
  if (!data) return <Loading />
  if (data.suppressed) return <p className="text-lg text-navy/70">{data.name} has fewer than {o.rules.minimum} respondents, so its results are not shown.</p>

  const n = data.themes.length
  const clear = data.themes.filter((t) => t.status === 'Clear gap').length
  const areas = data.areas.map((a) => {
    const t = data.themes.find((x) => x.item_id === a.item_id)
    return { ...a, rank: t?.rank ?? null, status: t?.status ?? a.status }
  })
  const best = [...areas].sort((a, b) => (b.mean - b.company) - (a.mean - a.company))[0]
  const bestDiff = best.mean - best.company
  const who = kind === 'team' ? 'team' : 'department'

  return (
    <div>
      <div className="text-sm text-navy/50">{kind === 'team' ? `${data.department} department` : 'Department'}</div>
      <h2 className="mt-1 text-4xl font-semibold tracking-[-0.03em] text-navy md:text-5xl">{data.name}</h2>

      <Kpis items={[
        { label: 'Respondents', value: String(data.respondents) },
        { label: 'Focus areas', value: String(n), sub: `of ${o.areas.length} areas`, tone: n ? 'red' : 'green' },
        { label: 'Clear gaps', value: String(clear), sub: n - clear ? `${n - clear} possible` : undefined },
        { label: 'Strongest area', value: SHORT[best.item_id] ?? best.label, sub: `${bestDiff >= 0 ? '+' : ''}${bestDiff.toFixed(2)} vs company`, small: true, tone: bestDiff > 0 ? 'green' : undefined },
      ]} />

      <Section title={`How the ${who} scores in each area`} sub={`The filled dot is the ${who}, the open circle is the company average, and the dashed line marks ${o.rules.floor}.`}>
        <Scorecard areas={areas} order={o.areas} floor={o.rules.floor} />
        <DotKey who={who} />
      </Section>

      <Section title="Focus areas" sub={`Areas under ${o.rules.floor} and below the company average, largest gap first.`}>
        {n > 0 ? <ThemeList themes={data.themes} />
          : (
            <div className="flex items-center gap-5 rounded-2xl bg-brand-green/10 px-7 py-6">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"><Check className="size-5" /></span>
              <p className="text-lg text-navy"><b className="text-brand-green">No area to focus on.</b> Every area scores {o.rules.floor} or more, or at or above the company average.</p>
            </div>
          )}
      </Section>

      {kind === 'department' && data.team_list && (
        <Section title={`Teams in ${data.name}`} sub="A gap shared by most teams is a department matter. A gap in one team is local. Select a team to open it.">
          <Grid areas={o.areas} rows={data.team_list.filter((t) => !t.suppressed).map((t) => ({
            key: t.id, label: t.name.replace(`${data.name} `, ''), sub: `${t.respondents} people`, to: `?view=team&team=${t.id}`, cells: t.cells,
          }))} />
        </Section>
      )}
    </div>
  )
}

function CompanyView({ o }: { o: Overview }) {
  const { data, error } = useApi(api.company, [])
  const [allTeams, setAllTeams] = useState(false)
  if (error) return <ErrorNote message={error} />
  if (!data) return <Loading />
  const focus = data.areas.filter((a) => data.focus.includes(a.item_id))
  const people = o.teams.reduce((s, t) => s + t.respondents, 0)
  const under = data.scorecard.filter((a) => a.company < o.rules.floor).length
  const withClear = data.heatmap.filter((r) => Object.values(r.cells).some((c) => c.theme === 'Clear gap')).length

  return (
    <div>
      <div className="text-sm text-navy/50">{o.departments.length} departments</div>
      <h2 className="mt-1 text-4xl font-semibold tracking-[-0.03em] text-navy md:text-5xl">Whole company</h2>

      <Kpis items={[
        { label: 'Respondents', value: String(people) },
        { label: 'Teams reported', value: String(data.reported), sub: data.suppressed ? `${data.suppressed} hidden` : undefined },
        { label: `Areas under ${o.rules.floor}`, value: String(under), sub: `of ${data.scorecard.length}, company average`, tone: under ? 'red' : 'green' },
        { label: 'Teams with a clear gap', value: String(withClear), sub: `of ${data.reported}` },
      ]} />

      <Section title="Company scorecard" sub={`The dark dot is the company average. The bar runs from the lowest team (red) to the highest (green), and the dashed line marks ${o.rules.floor}.`}>
        <CompanyRange data={data.scorecard} floor={o.rules.floor} />
      </Section>

      <Section title="Departments by area" sub="Each cell is the department's average, coloured by how far it sits from the company average. Select a department to open it.">
        <Grid areas={o.areas} rows={data.departments.map((d) => ({
          key: d.name, label: d.name, sub: `${d.respondents} people`, to: `?view=department&dept=${encodeURIComponent(d.name)}`, cells: d.cells,
        }))} />
      </Section>

      <Section title="Company-wide focus areas" sub="Areas that are a clear gap in two or more teams.">
        {focus.length === 0 ? <p className="text-lg text-navy/70">No area is a clear gap in more than one team.</p> : (
          <div className="grid gap-12 md:grid-cols-2">
            {focus.map((f, i) => (
              <div key={f.item_id} className="border-t-2 border-navy pt-6">
                <h3 className="text-2xl font-semibold tracking-tight text-navy"><span className="mr-3 font-light tabular-nums text-navy">{String(i + 1).padStart(2, '0')}</span>{f.label}</h3>
                <p className="mt-2 text-sm font-medium text-brand-red">Clear gap in {f.teams_clear.length} teams</p>
                <ul className="mt-5 space-y-2">
                  {f.practice.map((p) => <li key={p} className="flex gap-3 text-[15px] leading-snug text-navy"><span className="mt-2 h-px w-4 shrink-0 bg-navy/40" />{p}</li>)}
                </ul>
                <p className="mt-5 text-[15px] italic text-navy">“{f.question}”</p>
                <p className="mt-4 text-sm text-navy/45"><Citations sources={f.evidence.map((e) => e.source)} /></p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="every-team" title="Every team" sub="The same grid for all teams, grouped by department.">
        <button onClick={() => setAllTeams(!allTeams)} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-navy ring-1 ring-navy/15 hover:bg-navy/5">
          <Plus className={cn('size-4 transition-transform', allTeams && 'rotate-45')} /> {allTeams ? 'Hide teams' : `Show all ${data.reported} teams`}
        </button>
        {allTeams && (
          <div className="mt-6">
            <Grid areas={o.areas} rows={data.heatmap.map((r) => ({
              key: r.team_id, label: r.team.replace(`${r.department} `, ''), group: r.department, to: `?view=team&team=${r.team_id}`, cells: r.cells,
            }))} />
            <button onClick={() => { setAllTeams(false); document.getElementById('every-team')?.scrollIntoView({ behavior: 'smooth' }) }}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-navy ring-1 ring-navy/15 hover:bg-navy/5">
              <Plus className="size-4 rotate-45" /> Hide teams
            </button>
          </div>
        )}
      </Section>
    </div>
  )
}

type Kpi = { label: string; value: string; sub?: string; tone?: 'red' | 'green'; small?: boolean }

function Kpis({ items }: { items: Kpi[] }) {
  return (
    <div className="mt-10 grid grid-cols-2 overflow-hidden rounded-2xl bg-navy text-white lg:grid-cols-4">
      {items.map((k, i) => (
        <div key={k.label} className={cn('px-6 py-6', i % 2 === 1 && 'border-l border-white/10', i > 1 && 'border-t border-white/10 lg:border-t-0', i === 2 && 'lg:border-l')}>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">{k.label}</div>
          <div className={cn('mt-2 font-semibold tabular-nums tracking-tight', k.small ? 'text-2xl' : 'text-4xl', k.tone === 'red' ? 'text-[#FF8A80]' : k.tone === 'green' ? 'text-[#7FD8A8]' : 'text-white')}>{k.value}</div>
          {k.sub && <div className="mt-1 text-sm text-white/55">{k.sub}</div>}
        </div>
      ))}
    </div>
  )
}

function Section({ id, title, sub, children }: { id?: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-20 scroll-mt-40">
      <div className="flex items-center gap-4">
        <span className="h-6 w-1 rounded-full bg-brand-accent" />
        <h3 className="text-2xl font-semibold tracking-tight text-brand-accent md:text-[28px]">{title}</h3>
      </div>
      {sub && <p className="mt-2 max-w-3xl pl-5 text-navy/85">{sub}</p>}
      <div className="mt-8">{children}</div>
    </section>
  )
}

function DotKey({ who }: { who: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy/60">
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full border-2 border-navy bg-white" />Company average</span>
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-brand-red" />Clear gap</span>
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-brand-gold" />Possible gap</span>
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-[#8A94A6]" />Below company, not flagged</span>
      <span className="inline-flex items-center gap-2"><span className="size-3 rounded-full bg-brand-green" />{who === 'team' ? 'Team' : 'Department'} at or above company</span>
    </div>
  )
}

function Loading() {
  return <div className="space-y-6"><Skeleton className="h-12 w-96" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-56 w-full" /></div>
}

function ErrorNote({ message }: { message: string }) {
  return <p className="text-brand-red">Could not load results: {message}. Is the backend running on port 8000?</p>
}
