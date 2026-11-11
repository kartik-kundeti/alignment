"""Simulates respondent-level Q12 answers for a fictional company, for the Tool 2 themes view.

Outputs (next to this script):
- respondents_q12_synthetic.csv: one row per synthetic respondent (department, team, Q01..Q12 scored 1 to 5, blank = skipped).
- extended_q12_results.csv: the same data aggregated to Tool 2's input schema
  (team_id, item_id, mean_score, respondent_count, period), unchanged so the existing analyzer still reads it.
- team_departments.csv: team_id -> department, kept separate so the schema above does not change.

Structure (Practicum_Agent DECISIONS.md F1 row 28)
A team's target mean for an item = company baseline + department effect + team effect + planted pattern.
Each respondent then adds a person effect (shared across their items) and item-level noise, and the result is
rounded to the 1 to 5 scale. Department and team effects are random; three patterns are planted on purpose
so the demo can tell a department-wide gap from a single-team gap:
  1. Customer Support: employee voice (Q07) is low across every team in the department.
  2. Engineering, one team (Platform): recognition (Q04) is low in that team only.
  3. Finance: every item is somewhat higher, so the department should get no themes.

What is sourced and what is assumed
- Sourced: the 1 to 5 scale and Q01..Q12 items (Gallup employee engagement hierarchy handout); Gallup's guide
  describes a 4 as a need met often but not consistently (Interpreting Your Engagement Results, 2015, p.2).
- Assumed, with no published distribution available to us: the company baseline, the six departments and their
  team counts, every effect size below, team sizes (triangular 12 to 35, mode 20, about 22 on average), the
  person-level spread (sd 0.5), item noise (sd 0.6) and the 2% skip rate. These are demonstration choices, not
  estimates of real organizations. Team sizes were decided by Claude at the user's request; no team falls under
  Tool 2 minimum of 4 responses (F1 row 29).
All departments and teams are fictional.

Usage: python data/organizational/simulation/simulate_q12.py
"""
import csv
import random
from pathlib import Path

HERE = Path(__file__).resolve().parent
SEED = 20261108
PERIOD = "SYNTHETIC_PERIOD_1"
ITEMS = [f"Q{i:02d}" for i in range(1, 13)]
PERSON_SD, NOISE_SD, SKIP_RATE = 0.5, 0.6, 0.02
DEPT_SD, TEAM_SD = 0.15, 0.20            # random department and team effects per item (assumed)
SIZE_LOW, SIZE_MODE, SIZE_HIGH = 12, 20, 35

BASE = dict(zip(ITEMS, [3.9, 3.8, 4.0, 3.8, 4.0, 3.7, 3.8, 3.9, 3.8, 4.1, 3.7, 3.9]))

DEPARTMENTS = {
    "Operations": ["Dispatch", "Warehouse", "Fleet", "Planning", "Quality"],
    "Sales": ["Enterprise", "Midmarket", "Inside", "Partners"],
    "Customer Support": ["Tier1", "Tier2", "Onboarding", "Escalations", "Billing Help"],
    "Engineering": ["Platform", "Mobile", "Data", "Infrastructure", "Security"],
    "Finance": ["Payables", "Receivables", "Planning FP&A", "Audit"],
    "People": ["Recruiting", "Learning", "HR Operations", "Benefits"],
}

# Planted patterns: (department, team or None for every team, {item: shift})
PLANTED = [
    ("Customer Support", None, {"Q07": -0.8}),
    ("Engineering", "Platform", {"Q04": -1.2}),
    ("Finance", None, {q: 0.35 for q in ITEMS}),
]


def team_id(dept, team):
    return "SYNTHETIC_" + f"{dept} {team}".replace(" ", "_").replace("&", "and")


def score(target, person, rng):
    return min(5, max(1, round(target + person + rng.gauss(0, NOISE_SD))))


def main():
    rng = random.Random(SEED)
    respondents, teams = [], []
    for dept, team_names in DEPARTMENTS.items():
        dept_effect = {q: rng.gauss(0, DEPT_SD) for q in ITEMS}
        for name in team_names:
            tid = team_id(dept, name)
            target = {q: BASE[q] + dept_effect[q] + rng.gauss(0, TEAM_SD) for q in ITEMS}
            for d, t, shift in PLANTED:
                if d == dept and t in (None, name):
                    for q, s in shift.items():
                        target[q] += s
            size = round(rng.triangular(SIZE_LOW, SIZE_HIGH, SIZE_MODE))
            teams.append((tid, dept))
            for k in range(1, size + 1):
                person = rng.gauss(0, PERSON_SD)
                row = {"department": dept, "team_id": tid, "period": PERIOD,
                       "respondent_id": f"{tid.removeprefix('SYNTHETIC_')}-{k:03d}"}
                for q in ITEMS:
                    row[q] = "" if rng.random() < SKIP_RATE else score(target[q], person, rng)
                respondents.append(row)

    with (HERE / "respondents_q12_synthetic.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["department", "team_id", "period", "respondent_id", *ITEMS])
        w.writeheader()
        w.writerows(respondents)

    with (HERE / "extended_q12_results.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["team_id", "item_id", "mean_score", "respondent_count", "period"])
        for tid, _ in teams:
            rows = [r for r in respondents if r["team_id"] == tid]
            for q in ITEMS:
                vals = [r[q] for r in rows if r[q] != ""]
                w.writerow([tid, q, f"{sum(vals) / len(vals):.2f}", len(vals), PERIOD])

    with (HERE / "team_departments.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["team_id", "department"])
        w.writerows(teams)

    sizes = [sum(1 for r in respondents if r["team_id"] == t) for t, _ in teams]
    print(f"{len(respondents)} respondents, {len(teams)} teams, {len(DEPARTMENTS)} departments, "
          f"team size {min(sizes)} to {max(sizes)} (mean {sum(sizes) / len(sizes):.1f}), seed {SEED}")


if __name__ == "__main__":
    main()
