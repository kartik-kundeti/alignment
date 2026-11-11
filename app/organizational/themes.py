"""Communication themes: which communication areas a team or the company should focus on.

Scope (Practicum_Agent DECISIONS.md F1 rows 20 to 26):
- Only Q12 areas with Stronger or Moderate evidence in our research corpus are in scope:
  Q01, Q02, Q04, Q06, Q07, Q11. An area without clear evidence never becomes a theme.
  Tool 2 shares the evidence cards with Tool 1 but does not link to it (F1 rows 24 and 25).
- An area is a theme when the team's mean is below the floor of 4 AND below the company's mean for that item
  (F1 row 27). Gallup's guide names a team's opportunities as its lowest items relative to Gallup's global
  database (Interpreting Your Engagement Results, 2015, p.1); the company mean stands in for that database.
  The same guide describes a 4 as a need met often but not consistently (p.2), which is the basis for the floor.
  The value 4 itself is team judgment.
- Gap = the company mean for the item minus the team's mean. Themes are ordered by gap.
- Ties are broken by the evidence checklist score (checks passed out of four, F1 row 26), then by Gallup's advice to attend first to the foundation items
  Q01 to Q06 (same guide, p.2). Evidence never multiplies the gap.
- With respondent-level data, a 95% bootstrap interval (team answers resampled, company mean held fixed) shows
  whether a gap is clear (the whole interval sits below the company mean) or possible (it includes zero).
- Gallup's suppression rules, as quoted from Gallup's website by the user (F1 row 29): a group with fewer than 4
  respondents gets no results, and an item with fewer than 4 responses is left out of that group's results.
Signals and hypotheses only; nothing here establishes a cause.
"""
from __future__ import annotations

import csv
import json
import random
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAPPING_PATH = ROOT / "data" / "organizational" / "research_themes" / "q12_theme_mapping.json"
CARDS_PATH = ROOT / "knowledge" / "evidence_cards.json"
RUBRIC_PATH = ROOT / "data" / "organizational" / "communication_rubric.csv"
RESPONDENTS_PATH = ROOT / "data" / "organizational" / "simulation" / "respondents_q12_synthetic.csv"
EXTENDED_PATH = ROOT / "data" / "organizational" / "simulation" / "extended_q12_results.csv"
DEPARTMENTS_PATH = ROOT / "data" / "organizational" / "simulation" / "team_departments.csv"
FOUNDATION = {f"Q{i:02d}" for i in range(1, 7)}
TOP_N = 3
MINIMUM = 4   # Gallup's default suppression threshold (user-supplied quote from Gallup's website, F1 row 29)
FLOOR = 4.0   # Gallup: a 4 is met often but not consistently (Interpreting Your Engagement Results, 2015, p.2)
BOOTSTRAP = 2000
SEED = 20261104
CLEAR, POSSIBLE, NO_INTERVAL = "Clear gap", "Possible gap", "Gap (no interval available)"


@dataclass(frozen=True)
class Evidence:
    card_id: str
    finding: str
    limits: str
    setting: str
    source: str
    locator: str


@dataclass(frozen=True)
class Area:
    item_id: str
    name: str
    plain_label: str
    manager_question: str
    plain_habits: tuple[str, ...]
    strength: str
    strength_meaning: str
    checklist_score: int
    evidence: tuple[Evidence, ...]


@dataclass
class Theme:
    area: Area
    mean: float
    gap: float
    interval: tuple[float, float] | None
    rank: int

    @property
    def status(self) -> str:
        if self.interval is None:
            return NO_INTERVAL
        return CLEAR if self.interval[0] > 0 else POSSIBLE


def is_theme(t) -> bool:
    return t.gap > 0 and t.mean < FLOOR


@dataclass
class TeamThemes:
    team_id: str
    suppressed: bool
    respondents: int = 0
    average: float | None = None          # team mean across the in-scope areas (context only)
    ranked: list[Theme] = field(default_factory=list)

    def top_for(self, items=None) -> list[Theme]:
        """Up to three areas below both the floor and the company mean, optionally limited to some areas."""
        pool = [t for t in self.ranked if is_theme(t) and (items is None or t.area.item_id in items)]
        return pool[:TOP_N]

    @property
    def top(self) -> list[Theme]:
        return self.top_for()


def load_areas(mapping_path=MAPPING_PATH, cards_path=CARDS_PATH, rubric_path=RUBRIC_PATH) -> dict[str, Area]:
    """The in-scope areas only (evidence strength in the mapping's eligible list)."""
    mapping = json.loads(Path(mapping_path).read_text(encoding="utf-8"))
    eligible = set(mapping["eligible_strengths"])
    cards_doc = json.loads(Path(cards_path).read_text(encoding="utf-8"))
    cards = {c["id"]: c for c in cards_doc["cards"]}
    names = cards_doc["sources"]
    rubric = {r["source_item"]: r for r in csv.DictReader(Path(rubric_path).open(encoding="utf-8-sig"))}
    areas = {}
    for item, spec in mapping["areas"].items():
        if spec["evidence_strength"] not in eligible:
            continue
        ev = tuple(Evidence(cid, cards[cid]["finding"], cards[cid]["limits"], cards[cid]["setting"],
                            names[cards[cid]["source"]], cards[cid]["locator"]) for cid in spec["card_ids"])
        areas[item] = Area(item, rubric[item]["dimension_name"], spec["plain_label"], rubric[item]["manager_question_1"],
                           tuple(spec["plain_habits"]),
                           spec["evidence_strength"], mapping["evidence_strength_meaning"][spec["evidence_strength"]],
                           spec["checklist_score"], ev)
    return areas


def load_respondents(path=RESPONDENTS_PATH) -> dict[str, list[dict[str, int]]]:
    """team_id -> list of {item: score} for the items a respondent answered."""
    teams: dict[str, list[dict[str, int]]] = {}
    for row in csv.DictReader(Path(path).open(encoding="utf-8")):
        answers = {k: int(v) for k, v in row.items() if k.startswith("Q") and v not in ("", None)}
        teams.setdefault(row["team_id"], []).append(answers)
    return teams


def _means(people, items):
    out = {}
    for q in items:
        vals = [p[q] for p in people if q in p]
        out[q] = sum(vals) / len(vals) if vals else None
    return out


def _gaps(means, company):
    return {q: company[q] - m for q, m in means.items() if m is not None}


def company_means(means_by_team, counts_by_team) -> dict[str, float]:
    """Respondent-weighted mean of every item across all teams (suppressed teams included; only the total is used)."""
    out = {}
    for q in {q for m in means_by_team.values() for q in m}:
        pairs = [(means_by_team[t][q], counts_by_team[t][q]) for t in means_by_team if q in means_by_team[t]]
        out[q] = sum(m * n for m, n in pairs) / sum(n for _, n in pairs)
    return out


def rank_team(team_id, item_means, areas, company, people=None, minimum_responses=MINIMUM, counts=None, seed=SEED) -> TeamThemes:
    """item_means: {item: mean}; company: {item: company mean}; people: respondent answers; counts: {item: respondents}."""
    respondents = len(people) if people else (max(counts.values()) if counts else 0)
    if (people or counts) and respondents < minimum_responses:          # group rule: under 4 respondents, no results
        return TeamThemes(team_id, suppressed=True, respondents=respondents)
    scoped = [q for q in areas if item_means.get(q) is not None
              and (counts is None or counts.get(q, 0) >= minimum_responses)]   # item rule: under 4 responses, item left out
    if not scoped:
        return TeamThemes(team_id, suppressed=True, respondents=respondents)
    avg = sum(item_means[q] for q in scoped) / len(scoped)
    gap = _gaps({q: item_means[q] for q in scoped}, company)
    intervals = {q: None for q in scoped}
    if people:
        rng = random.Random(f"{seed}-{team_id}")
        draws = {q: [] for q in scoped}
        for _ in range(BOOTSTRAP):
            sample = [people[rng.randrange(len(people))] for _ in people]
            m = _means(sample, scoped)
            if any(v is None for v in m.values()):
                continue
            g = _gaps(m, company)
            for q in scoped:
                draws[q].append(g[q])
        for q, d in draws.items():
            d.sort()
            intervals[q] = (d[int(0.025 * len(d))], d[int(0.975 * len(d)) - 1]) if d else None
    ranked = sorted(scoped, key=lambda q: (-round(gap[q], 6), -areas[q].checklist_score, q not in FOUNDATION, q))
    themes = [Theme(areas[q], item_means[q], gap[q], intervals[q], i + 1) for i, q in enumerate(ranked)]
    return TeamThemes(team_id, suppressed=False, respondents=respondents, average=avg, ranked=themes)


def _read_extended(extended_path=EXTENDED_PATH):
    means, counts = {}, {}
    for r in csv.DictReader(Path(extended_path).open(encoding="utf-8")):
        means.setdefault(r["team_id"], {})[r["item_id"]] = float(r["mean_score"])
        counts.setdefault(r["team_id"], {})[r["item_id"]] = int(r["respondent_count"])
    return means, counts


def team_themes_from_files(minimum_responses=MINIMUM, extended_path=EXTENDED_PATH, respondents_path=RESPONDENTS_PATH) -> dict[str, TeamThemes]:
    areas = load_areas()
    people = load_respondents(respondents_path) if respondents_path else {}
    means, counts = _read_extended(extended_path)
    company = company_means(means, counts)
    return {t: rank_team(t, means[t], areas, company, people.get(t), minimum_responses, counts[t]) for t in means}


def load_departments(path=DEPARTMENTS_PATH) -> dict[str, str]:
    """team_id -> department."""
    return {r["team_id"]: r["department"] for r in csv.DictReader(Path(path).open(encoding="utf-8"))}


def department_themes(minimum_responses=MINIMUM, extended_path=EXTENDED_PATH, respondents_path=RESPONDENTS_PATH,
                      departments_path=DEPARTMENTS_PATH) -> dict[str, TeamThemes]:
    """Departments judged by the same rule as teams, on the pooled answers of their teams' respondents
    (F1 row 28). The company mean is the same one teams are compared with."""
    areas = load_areas()
    dept_of = load_departments(departments_path)
    people = load_respondents(respondents_path)
    means, counts = _read_extended(extended_path)
    company = company_means(means, counts)
    pooled: dict[str, list[dict[str, int]]] = {}
    for team, rows in people.items():
        pooled.setdefault(dept_of[team], []).extend(rows)
    out = {}
    for dept, rows in pooled.items():
        dept_means = _means(rows, list(areas))
        dept_counts = {q: sum(1 for r in rows if q in r) for q in areas}
        out[dept] = rank_team(dept, dept_means, areas, company, rows, minimum_responses, dept_counts)
    return out


def company_themes(results: dict[str, TeamThemes], areas: dict[str, Area], items=None):
    """Areas ranked by how many reported teams have them as a clear theme, then as any theme, then by average gap."""
    reported = [r for r in results.values() if not r.suppressed]
    rows = []
    for q, area in areas.items():
        if items is not None and q not in items:
            continue
        tops = {r.team_id: r.top_for(items) for r in reported}
        in_top = [t for t, ts in tops.items() if any(x.area.item_id == q for x in ts)]
        clear = [t for t, ts in tops.items() if any(x.area.item_id == q and x.status == CLEAR for x in ts)]
        gaps = [x.gap for r in reported for x in r.ranked if x.area.item_id == q]
        rows.append({"area": area, "teams_clear": clear, "teams_in_top3": in_top,
                     "average_gap": sum(gaps) / len(gaps) if gaps else 0.0})
    rows.sort(key=lambda r: (-len(r["teams_clear"]), -len(r["teams_in_top3"]), -r["average_gap"]))
    return rows, len(reported), len(results) - len(reported)
