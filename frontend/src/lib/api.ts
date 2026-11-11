// Typed calls to the FastAPI backend (backend/main.py). In development Vite forwards /api to port 8000.

export type Evidence = { finding: string; source: string }

export type AreaResult = {
  item_id: string
  label: string
  name: string
  mean: number
  company: number
  gap: number
  interval: [number, number] | null
  status: 'Clear gap' | 'Possible gap' | string
  is_theme: boolean
  rank: number | null
  practice: string[]
  question: string
  strength: string
  evidence: Evidence[]
  teams?: { id: string; name: string; status: string }[]
}

export type Cell = { mean: number; diff: number; theme: string | null }

export type GroupResult = {
  id: string
  name: string
  kind: 'team' | 'department'
  respondents: number
  suppressed: boolean
  department?: string
  themes: AreaResult[]
  areas: AreaResult[]
  team_list?: { id: string; name: string; respondents: number; suppressed: boolean; themes: string[]; cells: Record<string, Cell> }[]
}

export type Overview = {
  rules: { floor: number; minimum: number; top_n: number }
  areas: { item_id: string; label: string; name: string; strength: string; checklist_score: number }[]
  departments: { id: string; name: string; teams: string[]; respondents: number; theme_count: number }[]
  teams: { id: string; name: string; department: string; respondents: number; suppressed: boolean; theme_count: number }[]
}

export type Company = {
  reported: number
  suppressed: number
  focus: string[]
  areas: { item_id: string; label: string; teams_clear: string[]; teams_possible: string[]; practice: string[]; question: string; evidence: Evidence[] }[]
  heatmap: { team: string; team_id: string; department: string; cells: Record<string, Cell> }[]
  departments: { name: string; respondents: number; themes: string[]; cells: Record<string, Cell> }[]
  scorecard: { item_id: string; label: string; company: number; low: number; low_team: string; high: number; high_team: string; below_floor: number; teams: number }[]
}

export type Tool1Rubric = {
  message_type: string
  label: string
  dimensions: { code: string; name: string; definition: string; sources: string[] }[]
  context: { finding: string; source: string }[]
}

export type Research = {
  tool1: Tool1Rubric[]
  checks: Record<string, string>
  label_rule: string
  areas: { item_id: string; label: string; strength: string; score: number; in_scope: boolean; checks: Record<string, { pass: boolean; why: string }> }[]
  sources: { citation: string; tools: string[] }[]
}

export type Dimension = { status: string; evidence: string | string[]; note: string; score: number | null }
export type Judge = {
  message_type: string
  in_scope: boolean
  abstain: boolean
  abstain_reason: string | null
  dimensions: Record<string, Dimension>
  label: string | null
  confidence_level: string
  confidence_note: string
  warnings: string[]
}
export type Change = { dimension: string; what: string; why: string; card_ids: string[] }
export type Card = { id: string; dimension: string; finding: string; limits: string; setting: string; source: string; locator: string }
export type Rewrite = { rewrite: string; changes: Change[]; targeted: string[]; cards: Card[]; placeholders: string[]; warnings: string[] }
export type Review = { before: Judge; rewrite: Rewrite | null; after: Judge | null }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  overview: () => request<Overview>('/api/tool2/overview'),
  team: (id: string) => request<GroupResult>(`/api/tool2/team/${encodeURIComponent(id)}`),
  department: (id: string) => request<GroupResult>(`/api/tool2/department/${encodeURIComponent(id)}`),
  company: () => request<Company>('/api/tool2/company'),
  research: () => request<Research>('/api/research'),
  review: (draft: string, message_type: string) =>
    request<Review>('/api/tool1/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft, message_type }),
    }),
  rescore: (draft: string, message_type: string) =>
    request<Judge>('/api/tool1/rescore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft, message_type }),
    }),
}
