import { ArrowRight, Check, Copy, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Container, Eyebrow, PageHero } from '@/components/Layout'
import { Textarea } from '@/components/ui/textarea'
import { api, type Dimension, type Judge, type Review } from '@/lib/api'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'task_instruction', label: 'Task instruction' },
  { value: 'performance_feedback', label: 'Performance feedback' },
]

const LABELS: Record<string, { text: string; tone: string }> = {
  good: { text: 'Good', tone: 'text-brand-green' },
  borderline: { text: 'Borderline', tone: 'text-[#9a6c0e]' },
  needs_work: { text: 'Needs work', tone: 'text-brand-red' },
  pending: { text: 'Pending your details', tone: 'text-navy/50' },
}

const dimName = (key: string) => {
  const [code, ...rest] = key.split('_')
  const words = rest.join(' ')
  return { code, name: words.charAt(0).toUpperCase() + words.slice(1) }
}

export default function MessageCoach() {
  const [draft, setDraft] = useState('')
  const [type, setType] = useState('task_instruction')
  const [result, setResult] = useState<Review | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true); setError(null); setResult(null)
    try { setResult(await api.review(draft, type)) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHero eyebrow="Message Coach" title="Write the message once. Write it well.">
        Paste a task instruction or a piece of feedback before you send it. It is scored on research-based dimensions, revised, and scored again.
      </PageHero>

      <Container className="py-16">
        <div className="grid gap-14 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex gap-7 border-b border-navy/10">
              {TYPES.map((t) => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={cn('relative pb-3 text-sm font-medium', type === t.value ? 'text-navy' : 'text-navy/45 hover:text-navy')}>
                  {t.label}
                  {type === t.value && <span className="absolute -bottom-px left-0 h-0.5 w-full bg-brand-accent" />}
                </button>
              ))}
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={type === 'task_instruction' ? 'Paste the instruction you are about to send…' : 'Paste the feedback you are about to give…'}
              className="mt-6 min-h-56 resize-y rounded-2xl border-navy/15 bg-[#FAFBFC] p-6 text-[17px] leading-relaxed shadow-none focus-visible:ring-brand-accent/30"
            />
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <button onClick={submit} disabled={busy || draft.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-40">
                {busy && <Loader2 className="size-4 animate-spin" />}{busy ? 'Reviewing…' : 'Review message'}{!busy && <ArrowRight className="size-4" />}
              </button>
              <span className="text-sm text-navy/45">Sent to the GW-provided model. Do not paste regulated or restricted data.</span>
            </div>
          </div>

          <aside className="space-y-8 lg:pt-14">
            {[
              ['Scored', 'Each dimension is rated from 1 to 5 with a quote from your draft as evidence.'],
              ['Revised', 'A new version addresses the low scores and leaves placeholders for details only you know.'],
              ['Explained', 'Every change states why, with the study behind it.'],
            ].map(([t, d], i) => (
              <div key={t} className="flex gap-5">
                <span className="text-2xl font-light tabular-nums text-brand-accent">{String(i + 1).padStart(2, '0')}</span>
                <div><div className="font-semibold text-navy">{t}</div><p className="mt-1 text-[15px] leading-relaxed text-navy/60">{d}</p></div>
              </div>
            ))}
          </aside>
        </div>

        {error && <p className="mt-10 text-brand-red">{error}</p>}
      </Container>
      {result && (
        <section className="border-t border-navy/10 bg-white py-20">
          <Container><Results key={result.rewrite?.rewrite ?? ""} r={result} type={type} /></Container>
        </section>
      )}
    </>
  )
}

const lb = (l: string | null) => (l && LABELS[l]) || { text: l ?? 'Not scored', tone: 'text-navy/50' }
const PH = /(\[[^\[\]]*\?\])/
const question = (p: string) => { const q = p.slice(1, -2).trim(); return q.charAt(0).toUpperCase() + q.slice(1) + '?' }

/** Shows the revised message with the writer's answers in place of the placeholders, then scores the finished version. */
function FillIn({ rewrite, type, base }: { rewrite: string; type: string; base: Judge }) {
  const slots = [...new Set(rewrite.split(PH).filter((p) => PH.test(p)))]
  const [values, setValues] = useState<Record<string, string>>({})
  const [final, setFinal] = useState<Judge | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const text = rewrite.split(PH).map((p) => (PH.test(p) && values[p]?.trim() ? values[p].trim() : p)).join('')
  const filled = slots.filter((s) => values[s]?.trim()).length

  async function score() {
    setBusy(true); setError(null); setFinal(null)
    try { setFinal(await api.rescore(text, type)) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <section className="mt-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-navy">Revised message</h3>
          <p className="mt-1 text-navy/55">{slots.length ? 'Only you know the highlighted details. Fill them in below and the message updates as you type.' : 'Ready to send.'}</p>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true) }}
          className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-navy ring-1 ring-navy/15 hover:bg-navy/5">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <blockquote className="mt-6 border-l-2 border-brand-accent pl-6 text-xl leading-relaxed whitespace-pre-wrap text-navy">
        {rewrite.split(PH).map((part, i) => {
          if (!PH.test(part)) return <span key={i}>{part}</span>
          const v = values[part]?.trim()
          return v ? <mark key={i} className="rounded bg-brand-green/12 px-1 text-navy underline decoration-brand-green/50 underline-offset-4">{v}</mark>
            : <mark key={i} className="rounded bg-brand-gold/25 px-1 text-navy">{part}</mark>
        })}
      </blockquote>

      {slots.length > 0 && (
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h4 className="text-lg font-semibold text-navy">Fill in the details</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-navy/55">
              The coach never guesses facts, so the revision is marked Pending your details until these are filled in. Then score the finished message with the same scorer.
            </p>
            <p className="mt-6 text-sm font-medium tabular-nums text-navy/45">{filled} of {slots.length} filled</p>
          </div>
          <div>
            <div className="divide-y divide-navy/10 border-y border-navy/10">
              {slots.map((s) => (
                <label key={s} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center sm:gap-6">
                  <span className="text-[15px] font-medium text-navy">{question(s)}</span>
                  <input value={values[s] ?? ''} onChange={(e) => { setValues({ ...values, [s]: e.target.value }); setFinal(null) }}
                    placeholder="Type the detail"
                    className="w-full border-b border-navy/20 bg-transparent py-1.5 text-[15px] text-navy outline-none placeholder:text-navy/30 focus:border-brand-accent" />
                </label>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <button onClick={score} disabled={busy || filled === 0}
                className="inline-flex items-center gap-2 rounded-full bg-navy px-7 py-3.5 font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-40">
                {busy && <Loader2 className="size-4 animate-spin" />}{busy ? 'Scoring…' : 'Score the finished message'}{!busy && <ArrowRight className="size-4" />}
              </button>
              {filled > 0 && filled < slots.length && <span className="text-sm text-navy/45">Details left empty stay as placeholders.</span>}
            </div>
            {error && <p className="mt-4 text-brand-red">{error}</p>}
          </div>
        </div>
      )}

      {final && (
        <div className="mt-14 border-t border-navy/10 pt-10">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">Finished message</div>
          {final.label === 'good' && !final.abstain ? (
            <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl bg-brand-green px-7 py-6 text-white">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/15"><Check className="size-6" /></span>
              <div>
                <div className="text-3xl font-semibold tracking-tight">Good. Ready to send.</div>
                <div className="mt-1 text-white/80">Every scored dimension meets the rubric's bar for a good message.</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true) }}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-brand-green hover:bg-white/90">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy message'}
              </button>
            </div>
          ) : (
            <div className={cn('mt-2 text-4xl font-semibold tracking-tight', final.abstain ? 'text-navy/50' : lb(final.label).tone)}>
              {final.abstain ? 'Not scored' : lb(final.label).text}
            </div>
          )}
          {final.abstain ? <p className="mt-3 text-navy/60">{final.abstain_reason}</p>
            : <Dimensions before={base} after={final} legend="Faded bar: the revision before your details. Solid bar: the finished message." quoteAfter />}
        </div>
      )}
    </section>
  )
}

function Results({ r, type }: { r: Review; type: string }) {
  if (r.before.abstain) return <p className="text-lg text-navy/70">The message was not scored: {r.before.abstain_reason}</p>
  const after = r.after
  const changed = !!after && after !== r.before
  return (
    <div>
      <Eyebrow>Result</Eyebrow>
      <div className="flex flex-wrap items-center gap-5 text-4xl font-semibold tracking-tight md:text-5xl">
        <span className={lb(r.before.label).tone}>{lb(r.before.label).text}</span>
        {changed && <><ArrowRight className="size-8 text-navy/25" /><span className={lb(after!.label).tone}>{lb(after!.label).text}</span></>}
      </div>

      {r.rewrite && <FillIn rewrite={r.rewrite.rewrite} type={type} base={after ?? r.before} />}

      <section className="mt-16">
        <h3 className="text-2xl font-semibold tracking-tight text-navy">Scores by dimension</h3>
        <Dimensions before={r.before} after={changed ? after : null} />
      </section>

      {r.rewrite && r.rewrite.changes.length > 0 && (
        <section className="mt-16">
          <h3 className="text-2xl font-semibold tracking-tight text-navy">What changed and why</h3>
          <ol className="mt-8 space-y-8">
            {r.rewrite.changes.map((c, i) => {
              const d = dimName(c.dimension)
              const cites = [...new Set(c.card_ids.map((id) => r.rewrite!.cards.find((x) => x.id === id)?.source).filter(Boolean))]
              return (
                <li key={i} className="grid gap-4 md:grid-cols-[3rem_1fr]">
                  <span className="text-2xl font-light tabular-nums text-brand-accent">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-navy/45">{d.name}</div>
                    <p className="mt-1.5 text-lg text-navy">{c.what}</p>
                    <p className="mt-1 text-navy/60">{c.why}{cites.length > 0 && <span className="text-navy/45"> ({cites.join('; ')})</span>}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}

function Dots({ dim, faded }: { dim: Dimension | undefined; faded?: boolean }) {
  const value = dim?.score
  if (value === null || value === undefined)
    return <span className={cn('text-sm', dim?.status === 'pending' ? 'text-[#9a6c0e]' : 'text-navy/35', faded && 'opacity-60')}>{dim?.status === 'pending' ? 'Pending your details' : 'Not applicable'}</span>
  const tone = value >= 4 ? 'bg-brand-green' : value === 3 ? 'bg-brand-gold' : 'bg-brand-red'
  return (
    <span className={cn('inline-flex items-center gap-3', faded && 'opacity-45')}>
      <span className="flex gap-1">{[1, 2, 3, 4, 5].map((i) => <span key={i} className={cn('h-2 w-5 rounded-full', i <= value ? tone : 'bg-navy/10')} />)}</span>
      <span className="w-3 text-sm font-semibold tabular-nums text-navy">{value}</span>
    </span>
  )
}

const quote = (v: Dimension | undefined) => {
  const ev = ([] as string[]).concat(v?.evidence ?? []).filter(Boolean)
  return ev.length ? ev.map((e) => `“${e}”`).join('  ') : v?.note
}

function Dimensions({ before, after, legend = 'Faded bar: your draft. Solid bar: the revision.', quoteAfter = false }: { before: Judge; after: Judge | null; legend?: string; quoteAfter?: boolean }) {
  return (
    <div className="mt-8 divide-y divide-navy/10 border-y border-navy/10">
      {Object.entries(before.dimensions).map(([k, v]) => {
        const d = dimName(k)
        return (
          <div key={k} className="grid gap-4 py-6 md:grid-cols-[14rem_1fr_auto] md:items-center">
            <div><div className="font-semibold text-navy">{d.name}</div><div className="text-xs text-navy/40">{d.code}</div></div>
            <p className="text-[15px] leading-relaxed text-navy/60">{quote(quoteAfter && after ? after.dimensions[k] : v)}</p>
            <div className="flex flex-col gap-2 md:items-end">
              <Dots dim={v} faded={!!after} />
              {after && <Dots dim={after.dimensions[k]} />}
            </div>
          </div>
        )
      })}
      {after && <p className="py-3 text-xs text-navy/45">{legend}</p>}
    </div>
  )
}
