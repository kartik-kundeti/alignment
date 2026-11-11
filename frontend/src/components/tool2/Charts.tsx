import ReactECharts from 'echarts-for-react'
import { Link } from 'react-router-dom'

import type { AreaResult, Cell, Company } from '@/lib/api'
import { cn } from '@/lib/utils'

const NAVY = '#17233B'
const RED = '#C62828'
const GOLD = '#E9B44C'

const GREEN = '#198754'
const GREY = '#8A94A6'
const MUTED = '#5B6576'
const FONT = "'Inter Variable', system-ui, sans-serif"

/** Short column names for the grids; the full label shows on hover. */
export const SHORT: Record<string, string> = {
  Q01: 'Expectations', Q02: 'Information & tools', Q04: 'Recognition', Q06: 'Growth', Q07: 'Input', Q11: 'Progress',
}

type AreaRef = { item_id: string; label: string }

const dotColor = (a: AreaResult) =>
  a.rank ? (a.status === 'Clear gap' ? RED : GOLD) : a.gap <= 0 ? GREEN : GREY

const axisX = (name: string) => ({
  type: 'value', min: 2.5, max: 5, interval: 0.5, name, nameLocation: 'middle', nameGap: 30,
  nameTextStyle: { color: MUTED, fontSize: 11 }, splitLine: { lineStyle: { color: '#EEF1F6' } },
  axisLabel: { color: MUTED }, axisLine: { show: false },
})

const floorLine = (floor: number) => ({
  symbol: 'none', silent: true, lineStyle: { color: GOLD, type: 'dashed', width: 1.5 },
  label: { show: false }, data: [{ xAxis: floor }],
})

/** One row per area. The open circle is the company average, the filled dot is the group, the dashed line is 4. */
export function Scorecard({ areas, order, floor }: { areas: AreaResult[]; order: AreaRef[]; floor: number }) {
  const rows = order.map((o) => areas.find((a) => a.item_id === o.item_id)).filter(Boolean) as AreaResult[]
  const labels = rows.map((a) => SHORT[a.item_id] ?? a.label)
  return (
    <ReactECharts
      style={{ height: 52 * rows.length + 60 }}
      opts={{ renderer: 'canvas' }}
      option={{
        textStyle: { fontFamily: FONT, color: NAVY },
        animation: false,
        grid: { left: 8, right: 30, top: 20, bottom: 40, containLabel: true },
        xAxis: axisX('Average score (1 to 5 scale, axis starts at 2.5)'),
        yAxis: { type: 'category', data: labels, inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: NAVY, fontSize: 13, fontWeight: 600 } },
        tooltip: {
          trigger: 'item',
          formatter: (p: { dataIndex: number }) => {
            const a = rows[p.dataIndex]
            const d = a.mean - a.company
            return `<b>${a.label}</b><br/>This group ${a.mean.toFixed(2)} · Company ${a.company.toFixed(2)}<br/>${d >= 0 ? '+' : ''}${d.toFixed(2)} vs company${a.rank ? `<br/><b>${a.status}</b>` : ''}`
          },
        },
        series: [
          {
            type: 'custom', silent: true, z: 1,
            renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[] }) => {
              const a = api.coord([api.value(0), api.value(2)])
              const b = api.coord([api.value(1), api.value(2)])
              return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: '#C9D0DB', lineWidth: 3, lineCap: 'round' } }
            },
            data: rows.map((a, i) => [a.company, a.mean, i]),
          },
          {
            name: 'Company', type: 'scatter', symbolSize: 13, z: 2,
            itemStyle: { color: '#fff', borderColor: NAVY, borderWidth: 2, opacity: 1 },
            data: rows.map((a, i) => [a.company, i]),
            markLine: floorLine(floor),
          },
          {
            name: 'This group', type: 'scatter', symbolSize: 17, z: 3,
            data: rows.map((a, i) => ({ value: [a.mean, i], itemStyle: { color: dotColor(a), opacity: 1 }, label: { position: a.mean < a.company ? 'left' : 'right' } })),
            label: { show: true, position: 'right', distance: 10, formatter: (p: { value: number[] }) => p.value[0].toFixed(2), color: NAVY, fontWeight: 600, fontSize: 12 },
          },
        ],
      }}
    />
  )
}

/** Company average per area with the spread from the lowest to the highest team. */
export function CompanyRange({ data, floor }: { data: Company['scorecard']; floor: number }) {
  const labels = data.map((a) => SHORT[a.item_id] ?? a.label)
  return (
    <ReactECharts
      style={{ height: 56 * data.length + 60 }}
      opts={{ renderer: 'canvas' }}
      option={{
        textStyle: { fontFamily: FONT, color: NAVY },
        animation: false,
        grid: { left: 8, right: 30, top: 20, bottom: 40, containLabel: true },
        xAxis: axisX('Average score (1 to 5 scale, axis starts at 2.5)'),
        yAxis: { type: 'category', data: labels, inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: NAVY, fontSize: 13, fontWeight: 600 } },
        tooltip: {
          trigger: 'item',
          formatter: (p: { dataIndex: number }) => {
            const a = data[p.dataIndex]
            return `<b>${a.label}</b><br/>Company ${a.company.toFixed(2)}<br/>Lowest ${a.low.toFixed(2)} (${a.low_team})<br/>Highest ${a.high.toFixed(2)} (${a.high_team})<br/>${a.below_floor} of ${a.teams} teams under ${floor}`
          },
        },
        series: [
          {
            type: 'custom', z: 1,
            renderItem: (_: unknown, api: { value: (i: number) => number; coord: (v: number[]) => number[] }) => {
              const a = api.coord([api.value(0), api.value(2)])
              const b = api.coord([api.value(1), api.value(2)])
              return { type: 'rect', shape: { x: a[0], y: a[1] - 9, width: b[0] - a[0], height: 18, r: 9 }, style: { fill: 'rgba(23,35,59,0.10)' } }
            },
            data: data.map((a, i) => [a.low, a.high, i]),
          },
          {
            type: 'scatter', symbolSize: 9, z: 2, silent: true, itemStyle: { color: RED },
            data: data.map((a, i) => [a.low, i]),
          },
          {
            type: 'scatter', symbolSize: 9, z: 2, silent: true, itemStyle: { color: GREEN },
            data: data.map((a, i) => [a.high, i]),
          },
          {
            type: 'scatter', symbolSize: 17, z: 3, itemStyle: { color: NAVY, borderColor: '#fff', borderWidth: 2, opacity: 1 },
            data: data.map((a, i) => [a.company, i]),
            label: { show: true, position: 'top', distance: 8, formatter: (p: { value: number[] }) => p.value[0].toFixed(2), color: NAVY, fontWeight: 600, fontSize: 12 },
            markLine: floorLine(floor),
          },
        ],
      }}
    />
  )
}

/** Cell colour: red below the company average, green above, stronger with distance. */
function tint(diff: number) {
  if (Math.abs(diff) < 0.05) return { background: '#F5F7FA', color: NAVY }
  const alpha = 0.12 + Math.min(Math.abs(diff) / 0.7, 1) * 0.78
  return { background: diff < 0 ? `rgba(198,40,40,${alpha})` : `rgba(25,135,84,${alpha})`, color: alpha > 0.55 ? '#fff' : NAVY }
}

export type GridRow = { key: string; label: string; sub?: string; to?: string; group?: string; cells: Record<string, Cell> }

/** Groups (rows) by areas (columns). Each cell shows the score; colour shows the difference from the company. */
export function Grid({ rows, areas }: { rows: GridRow[]; areas: AreaRef[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th />
            {areas.map((a) => (
              <th key={a.item_id} title={a.label} className="px-1 pb-2 text-center align-bottom text-xs font-semibold text-navy/70">{SHORT[a.item_id] ?? a.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const head = r.group && r.group !== rows[i - 1]?.group ? r.group : null
            return [
              head && (
                <tr key={`g-${head}`}><td colSpan={areas.length + 1} className="pt-5 pb-1 text-xs font-semibold uppercase tracking-[0.16em] text-navy/40">{head}</td></tr>
              ),
              <tr key={r.key}>
                <td className="pr-4 whitespace-nowrap">
                  {r.to ? <Link to={r.to} className="font-medium text-navy hover:text-brand-accent">{r.label}</Link> : <span className="font-medium text-navy">{r.label}</span>}
                  {r.sub && <div className="text-xs text-navy/40">{r.sub}</div>}
                </td>
                {areas.map((a) => {
                  const c = r.cells[a.item_id]
                  if (!c) return <td key={a.item_id} className="rounded-md bg-navy/5 text-center text-xs text-navy/30">n/a</td>
                  return (
                    <td key={a.item_id} style={tint(c.diff)} title={`${a.label}: ${c.mean.toFixed(2)} (${c.diff >= 0 ? '+' : ''}${c.diff.toFixed(2)} vs company)${c.theme ? `, ${c.theme}` : ''}`}
                      className={cn('h-11 min-w-20 rounded-md text-center text-sm font-semibold tabular-nums', c.theme && 'ring-2 ring-inset', c.theme === 'Clear gap' ? 'ring-navy' : c.theme ? 'ring-brand-gold' : '')}>
                      {c.mean.toFixed(2)}
                    </td>
                  )
                })}
              </tr>,
            ]
          })}
        </tbody>
      </table>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-navy/60">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-24 rounded-full" style={{ background: 'linear-gradient(90deg, rgba(198,40,40,.9), #F5F7FA, rgba(25,135,84,.9))' }} />
          Below company, above company
        </span>
        <span className="inline-flex items-center gap-2"><span className="size-4 rounded ring-2 ring-inset ring-navy" />Clear gap</span>
        <span className="inline-flex items-center gap-2"><span className="size-4 rounded ring-2 ring-inset ring-brand-gold" />Possible gap</span>
      </div>
    </div>
  )
}
