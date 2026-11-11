import { Plus } from 'lucide-react'
import { useState } from 'react'

import type { AreaResult } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Status written as text with a coloured dot; colour is never the only signal. */
export function Status({ status, className }: { status: string; className?: string }) {
  const clear = status === 'Clear gap'
  return (
    <span className={cn('inline-flex items-center gap-2 text-sm font-medium', clear ? 'text-brand-red' : 'text-[#9a6c0e]', className)}>
      <span className={cn('size-2 rounded-full', clear ? 'bg-brand-red' : 'bg-brand-gold')} />
      {status}
    </span>
  )
}

/** Short citation list: "Su & Jiang (2023); Kluger & DeNisi (1996)". */
export function Citations({ sources }: { sources: string[] }) {
  const unique = [...new Set(sources)]
  return <span>{unique.join('; ')}</span>
}

/** The focus areas: what to work on, what to do, what to ask. Research opens on request. */
export function ThemeList({ themes }: { themes: AreaResult[] }) {
  return (
    <ol className="divide-y divide-navy/10 border-y border-navy/10">
      {themes.map((t) => <ThemeRow key={t.item_id} t={t} />)}
    </ol>
  )
}

function ThemeRow({ t }: { t: AreaResult }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="grid gap-x-10 gap-y-6 py-9 md:grid-cols-[4.5rem_1fr_10rem]">
      <div className="text-5xl font-light tabular-nums tracking-tight text-navy md:text-6xl">{String(t.rank).padStart(2, '0')}</div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="text-2xl font-semibold tracking-tight text-navy md:text-[28px]">{t.label}</h3>
          <Status status={t.status} />
        </div>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">What to practice</div>
            <ul className="mt-3 space-y-2">
              {t.practice.map((p) => (
                <li key={p} className="flex gap-3 text-[15px] leading-snug text-navy"><span className="mt-2 h-px w-4 shrink-0 bg-navy/40" />{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">Ask the team</div>
            <p className="mt-3 text-[15px] leading-snug text-navy italic">“{t.question}”</p>
          </div>
        </div>

        {t.teams && t.teams.length > 0 && (
          <p className="mt-6 text-sm text-navy/60">Shared by {t.teams.length} teams: {t.teams.map((x) => x.name.split(' ').slice(-1)[0]).join(', ')}.</p>
        )}

        <div className="mt-6">
          <button onClick={() => setOpen(!open)} className="group inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy">
            <Plus className={cn('size-4 transition-transform', open && 'rotate-45')} />
            <span>Research: <Citations sources={t.evidence.map((e) => e.source)} /></span>
          </button>
          {open && (
            <div className="mt-4 overflow-hidden rounded-xl border-l-4 border-navy bg-white shadow-sm ring-1 ring-navy/10">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-navy">What the research says</span>
                {t.strength && <span className="rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">Evidence strength: {t.strength}</span>}
              </div>
              <ul className="divide-y divide-navy/10">
                {t.evidence.map((e, i) => (
                  <li key={i} className="flex flex-col gap-2 px-5 py-4 md:flex-row md:items-start md:gap-5">
                    <span className="w-fit shrink-0 rounded-md bg-navy/10 px-2 py-1 text-center text-xs font-semibold whitespace-nowrap text-navy md:w-40">{e.source}</span>
                    <p className="text-[15px] leading-relaxed text-navy">{e.finding}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="md:text-right">
        <div className="text-4xl font-semibold tabular-nums tracking-tight text-navy">{t.mean.toFixed(2)}</div>
        <div className="mt-1 text-sm text-navy/50">company {t.company.toFixed(2)}</div>
        <div className="mt-3 inline-flex rounded-full bg-brand-red/10 px-2.5 py-1 text-sm font-semibold tabular-nums text-brand-red">−{t.gap.toFixed(2)}</div>
      </div>
    </li>
  )
}
