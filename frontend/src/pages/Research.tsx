import { Check, Minus } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Container, Eyebrow, PageHero } from '@/components/Layout'
import { Skeleton } from '@/components/ui/skeleton'
import { api, type Tool1Rubric } from '@/lib/api'
import { useApi } from '@/lib/useApi'
import { cn } from '@/lib/utils'

const CHECK_TITLES: Record<string, string> = { A: 'Match', B: 'Setting', C: 'Outcome', D: 'Consistency' }
const PARTS = [
  { id: 'message-coach', label: 'Message Coach research' },
  { id: 'team-diagnostic', label: 'Team Diagnostic research' },
  { id: 'sources', label: 'Sources' },
]

/** Sticky switch that jumps between the parts of the page and underlines the one in view. */
function PartSwitch() {
  const [active, setActive] = useState(PARTS[0].id)
  useEffect(() => {
    const onScroll = () => {
      const current = [...PARTS].reverse().find((p) => (document.getElementById(p.id)?.getBoundingClientRect().top ?? 1e9) < 180)
      setActive(current?.id ?? PARTS[0].id)
    }
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className="sticky top-18 z-40 border-b border-navy/10 bg-white/90 backdrop-blur-xl">
      <Container className="flex gap-8 overflow-x-auto [scrollbar-width:none]">
        {PARTS.map((p) => (
          <a key={p.id} href={`#${p.id}`}
            onClick={(e) => { e.preventDefault(); document.getElementById(p.id)?.scrollIntoView({ behavior: 'smooth' }) }}
            className={cn('relative shrink-0 py-4 text-sm font-medium', active === p.id ? 'text-navy' : 'text-navy/45 hover:text-navy')}>
            {p.label}
            {active === p.id && <span className="absolute -bottom-px left-0 h-0.5 w-full bg-brand-accent" />}
          </a>
        ))}
      </Container>
    </div>
  )
}

function RubricList({ rubric }: { rubric: Tool1Rubric }) {
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_2.2fr]">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-navy">{rubric.label}</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-navy/55">
          {rubric.message_type === 'task_instruction' ? 'A manager assigns a piece of work to a person or a small team.' : 'A manager comments on work that has been done.'}
        </p>
      </div>
      <ol className="divide-y divide-navy/10 border-y border-navy/10">
        {rubric.dimensions.map((d) => (
          <li key={d.code} className="grid gap-4 py-6 sm:grid-cols-[3.5rem_1fr]">
            <span className="text-2xl font-light tabular-nums text-brand-accent">{d.code}</span>
            <div>
              <div className="text-lg font-semibold text-navy">{d.name}</div>
              <p className="mt-1.5 leading-relaxed text-navy/65">{d.definition}</p>
              <p className="mt-2 text-sm text-navy/45">{d.sources.join('; ')}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function Research() {
  const { data } = useApi(api.research, [])
  const context = data?.tool1.flatMap((r) => r.context) ?? []

  return (
    <>
      <PageHero eyebrow="Research" title="Advice is only as good as its evidence.">
        Both tools draw on one set of published workplace studies. Message Coach scores a draft on dimensions taken from that research, and Team Diagnostic flags a survey area only when the research behind it passes our evidence standard.
      </PageHero>
      <PartSwitch />

      <section id="message-coach" className="scroll-mt-36 py-24">
        <Container>
          <Eyebrow>Message Coach</Eyebrow>
          <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-navy">What a well-written message does.</h2>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-navy/60">
            Each draft is scored from 1 to 5 on the five dimensions for its message type, and each dimension rests on the studies listed under it. The 1 to 5 scale and the rule that turns scores into Good, Borderline or Needs work are our team's judgment.
          </p>
          {!data ? <Skeleton className="mt-12 h-96 w-full" /> : (
            <div className="mt-16 space-y-20">
              {data.tool1.map((r) => <RubricList key={r.message_type} rubric={r} />)}
              {context.length > 0 && (
                <div className="grid gap-10 md:grid-cols-[1fr_2.2fr]">
                  <h3 className="text-2xl font-semibold tracking-tight text-navy">Why feedback matters</h3>
                  <ul className="space-y-4">
                    {context.map((c) => (
                      <li key={c.finding} className="border-l-2 border-brand-accent pl-5 text-lg leading-relaxed text-navy">
                        {c.finding} <span className="text-base text-navy/45">({c.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Container>
      </section>

      <section id="team-diagnostic" className="scroll-mt-36 border-t border-navy/10 bg-white py-24">
        <Container>
          <Eyebrow>Team Diagnostic</Eyebrow>
          <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-navy">Four questions for every survey area.</h2>
          <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data?.checks ?? {}).map(([k, v]) => {
              const [, ...rest] = v.split(': ')
              return (
                <div key={k}>
                  <div className="text-6xl font-light text-brand-accent">{k}</div>
                  <h3 className="mt-4 text-lg font-semibold text-navy">{CHECK_TITLES[k]}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-navy/65">{rest.join(': ') || v}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-14 max-w-3xl text-navy/60">
            All four make an area <b className="text-navy">Stronger</b>. Workplace evidence with a performance or behaviour outcome, but a partial match or a contrary study, makes it <b className="text-navy">Moderate</b>. Only Stronger and Moderate areas can be flagged. Counting the four checks equally is our team's judgment.
          </p>

          <h3 className="mt-24 text-2xl font-semibold tracking-tight text-navy">How each survey area scores</h3>
          {!data ? <Skeleton className="mt-10 h-80 w-full" /> : (
            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-navy/15 text-xs uppercase tracking-[0.14em] text-navy/45">
                    <th className="py-4 font-semibold">Survey area</th>
                    {Object.keys(CHECK_TITLES).map((k) => <th key={k} className="py-4 text-center font-semibold">{CHECK_TITLES[k]}</th>)}
                    <th className="py-4 text-right font-semibold">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy/10">
                  {data.areas.map((a) => (
                    <tr key={a.item_id} className={cn(!a.in_scope && 'text-navy/40')}>
                      <td className="py-5"><div className="font-semibold text-navy">{a.label}</div><div className="text-xs text-navy/40">{a.item_id}</div></td>
                      {Object.keys(CHECK_TITLES).map((k) => {
                        const c = a.checks[k]
                        return (
                          <td key={k} className="py-5 text-center" title={c?.why}>
                            {c?.pass ? <Check className="mx-auto size-5 text-brand-green" /> : <Minus className="mx-auto size-5 text-navy/25" />}
                          </td>
                        )
                      })}
                      <td className="py-5 text-right">
                        <span className={cn('font-medium', a.strength === 'Stronger' ? 'text-brand-green' : a.strength === 'Moderate' ? 'text-[#9a6c0e]' : 'text-navy/40')}>{a.strength}</span>
                        <div className="text-xs text-navy/40">{a.in_scope ? 'Can be flagged' : 'Not flagged'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-6 text-sm text-navy/50">Hover a mark to see the reason. Links between survey areas and research are our team's judgment, since no study names the Q12 items.</p>
            </div>
          )}
        </Container>
      </section>

      <section id="sources" className="scroll-mt-36 py-24">
        <Container className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <Eyebrow>Sources</Eyebrow>
            <h2 className="text-4xl font-semibold tracking-[-0.03em] text-navy">The studies behind the tools.</h2>
            <p className="mt-4 text-navy/55">Each study is marked with the tool that uses it.</p>
          </div>
          <ul className="divide-y divide-navy/10 border-y border-navy/10">
            {(data?.sources ?? []).map((s) => (
              <li key={s.citation} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                <span className="text-lg text-navy">{s.citation}</span>
                <span className="text-sm text-navy/45">{s.tools.join(' · ')}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  )
}
