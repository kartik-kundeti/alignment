"""CommsAlign web backend (Practicum_Agent DECISIONS.md G2 rows 2 and 3).

A thin FastAPI layer over the existing engines. It adds no analysis of its own:
- Tool 1 (Message Coach): app/tool1/pipeline.py judges a draft, rewrites it, and judges the rewrite.
- Tool 2 (Team Diagnostic): app/organizational/themes.py ranks communication themes for teams,
  departments and the company.
The React frontend (frontend/) calls the /api routes below. After `npm run build`, the compiled
site in frontend/dist is served from the same address, so the demo laptop only needs Python.

Run:  .venv\\Scripts\\python -m uvicorn backend.main:app --port 8000
"""
from __future__ import annotations

import dataclasses
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.organizational.themes import (FLOOR, MINIMUM, TOP_N, TeamThemes, Theme, company_themes,
                                       department_themes, is_theme, load_areas, load_departments,
                                       team_themes_from_files)

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="CommsAlign API", version="1.0")


# ---------- Tool 2 ----------

@lru_cache(maxsize=1)
def _tool2():
    """Results are computed once per server start; the data is static."""
    return load_areas(), team_themes_from_files(), department_themes(), load_departments()


def _label(team_id: str) -> str:
    return team_id.removeprefix("SYNTHETIC_").replace("_", " ")


def _theme(t: Theme, rank: int | None = None) -> dict:
    a = t.area
    return {
        "item_id": a.item_id, "label": a.plain_label, "name": a.name, "mean": round(t.mean, 2),
        "company": round(t.mean + t.gap, 2), "gap": round(t.gap, 2),
        "interval": [round(x, 2) for x in t.interval] if t.interval else None,
        "status": t.status, "is_theme": is_theme(t), "rank": rank,
        "practice": list(a.plain_habits), "question": a.manager_question,
        "strength": a.strength, "evidence": [{"finding": e.finding, "source": e.source} for e in a.evidence],
    }


def _group(r: TeamThemes, kind: str, name: str, extra: dict | None = None) -> dict:
    top = r.top
    return {
        "id": r.team_id, "name": name, "kind": kind, "respondents": r.respondents, "suppressed": r.suppressed,
        "themes": [_theme(t, i + 1) for i, t in enumerate(top)],
        "areas": [_theme(t) for t in r.ranked],
        **(extra or {}),
    }


@app.get("/api/tool2/overview")
def tool2_overview():
    areas, teams, depts, dept_of = _tool2()
    return {
        "rules": {"floor": FLOOR, "minimum": MINIMUM, "top_n": TOP_N},
        "areas": [{"item_id": q, "label": a.plain_label, "name": a.name, "strength": a.strength,
                   "checklist_score": a.checklist_score} for q, a in areas.items()],
        "departments": [{"id": d, "name": d, "teams": sorted(t for t, dd in dept_of.items() if dd == d),
                         "respondents": depts[d].respondents, "theme_count": len(depts[d].top)} for d in depts],
        "teams": [{"id": t, "name": _label(t), "department": dept_of.get(t), "respondents": r.respondents,
                   "suppressed": r.suppressed, "theme_count": len(r.top)} for t, r in sorted(teams.items())],
    }


@app.get("/api/tool2/team/{team_id}")
def tool2_team(team_id: str):
    _, teams, _, dept_of = _tool2()
    if team_id not in teams:
        raise HTTPException(404, "Unknown team")
    return _group(teams[team_id], "team", _label(team_id), {"department": dept_of.get(team_id)})


@app.get("/api/tool2/department/{dept}")
def tool2_department(dept: str):
    _, teams, depts, dept_of = _tool2()
    if dept not in depts:
        raise HTTPException(404, "Unknown department")
    members = [t for t, d in dept_of.items() if d == dept]
    out = _group(depts[dept], "department", dept)
    for th in out["themes"]:   # which of the department's teams share each theme
        th["teams"] = [{"id": t, "name": _label(t), "status": x.status}
                       for t in members for x in teams[t].top if x.area.item_id == th["item_id"]]
    out["team_list"] = [{"id": t, "name": _label(t), "respondents": teams[t].respondents, "suppressed": teams[t].suppressed,
                         "themes": [x.area.item_id for x in teams[t].top], "cells": _cells(teams[t])} for t in sorted(members)]
    return out


def _cells(r: TeamThemes) -> dict:
    """One group's score per area, its difference from the company, and whether the area is flagged."""
    return {x.area.item_id: {"mean": round(x.mean, 2), "diff": round(-x.gap, 2),
                             "theme": next((y.status for y in r.top if y.area.item_id == x.area.item_id), None)}
            for x in r.ranked}


@app.get("/api/tool2/company")
def tool2_company():
    areas, teams, depts, dept_of = _tool2()
    rows, reported, suppressed = company_themes(teams, areas)
    lead = [r for r in rows if len(r["teams_clear"]) >= 2][:2]
    return {
        "reported": reported, "suppressed": suppressed,
        "focus": [r["area"].item_id for r in lead],
        "areas": [{"item_id": r["area"].item_id, "label": r["area"].plain_label,
                   "teams_clear": [_label(t) for t in r["teams_clear"]],
                   "teams_possible": [_label(t) for t in r["teams_in_top3"] if t not in r["teams_clear"]],
                   "practice": list(r["area"].plain_habits), "question": r["area"].manager_question,
                   "evidence": [{"finding": e.finding, "source": e.source} for e in r["area"].evidence]} for r in rows],
        "heatmap": [{"team": _label(t), "team_id": t, "department": dept_of.get(t), "cells": _cells(r)}
                    for t, r in sorted(teams.items(), key=lambda kv: (dept_of.get(kv[0], ""), kv[0])) if not r.suppressed],
        "departments": [{"name": d, "respondents": depts[d].respondents, "themes": [x.area.item_id for x in depts[d].top],
                         "cells": _cells(depts[d])} for d in depts],
        "scorecard": _scorecard(areas, teams),
    }


def _scorecard(areas, teams) -> list[dict]:
    """Company average per area with the lowest and highest reported team, for the company view's range chart."""
    shown = {t: {x.area.item_id: x for x in r.ranked} for t, r in teams.items() if not r.suppressed}
    out = []
    for q, a in areas.items():
        vals = sorted(((s[q].mean, t) for t, s in shown.items() if q in s))
        if not vals:
            continue
        company = next(s[q].mean + s[q].gap for s in shown.values() if q in s)
        out.append({"item_id": q, "label": a.plain_label, "company": round(company, 2),
                    "low": round(vals[0][0], 2), "low_team": _label(vals[0][1]),
                    "high": round(vals[-1][0], 2), "high_team": _label(vals[-1][1]),
                    "below_floor": sum(1 for m, _ in vals if m < FLOOR), "teams": len(vals)})
    return out


@app.get("/api/tool2/report/{kind}")
def tool2_report(kind: str, id: str = ""):
    """The brief as a PDF download for a team, a department or the whole company (backend/report.py)."""
    from fastapi.responses import Response
    from backend.report import company_pdf, group_pdf
    o = tool2_overview()
    order = [a["item_id"] for a in o["areas"]]
    if kind == "team":
        g = tool2_team(id)
        if g["suppressed"]:
            raise HTTPException(404, "This team has too few respondents to report")
        pdf, name = group_pdf(g, order, o["rules"]), g["name"]
    elif kind == "department":
        g = tool2_department(id)
        if g["suppressed"]:
            raise HTTPException(404, "This department has too few respondents to report")
        pdf, name = group_pdf(g, order, o["rules"]), g["name"]
    elif kind == "company":
        pdf, name = company_pdf(tool2_company(), o), "Whole company"
    else:
        raise HTTPException(404, "Unknown report type")
    filename = f"CommsAlign brief - {name}.pdf"
    return Response(pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ---------- Tool 1 ----------

class ReviewRequest(BaseModel):
    draft: str = Field(min_length=1, max_length=8000)
    message_type: str = Field(pattern="^(task_instruction|performance_feedback)$")


def _plain(obj):
    if dataclasses.is_dataclass(obj):
        return {k: _plain(v) for k, v in dataclasses.asdict(obj).items() if k != "raw"}
    return obj


@app.post("/api/tool1/review")
def tool1_review(req: ReviewRequest):
    """Judge, rewrite, re-judge. Calls the GW Azure model, so it needs the .env keys."""
    from app.tool1.pipeline import run   # imported lazily so Tool 2 works without model keys
    try:
        res = run(req.draft, req.message_type)
    except Exception as exc:  # surfaced to the page as a readable error
        raise HTTPException(502, f"The model call failed: {exc}") from exc
    return {"before": _plain(res.before), "rewrite": _plain(res.rewrite), "after": _plain(res.after)}


@app.post("/api/tool1/rescore")
def tool1_rescore(req: ReviewRequest):
    from app.tool1.pipeline import rescore
    try:
        return _plain(rescore(req.draft, req.message_type))
    except Exception as exc:
        raise HTTPException(502, f"The model call failed: {exc}") from exc


@app.get("/api/health")
def health():
    return {"ok": True}


# ---------- Research page ----------

@app.get("/api/research")
def research():
    """The evidence checklist per survey area and the list of sources behind both tools."""
    import json
    import re
    from app.organizational.themes import CARDS_PATH, MAPPING_PATH
    import csv
    from app.organizational.themes import RUBRIC_PATH
    mapping = json.loads(MAPPING_PATH.read_text(encoding="utf-8"))
    names_by_item = {r["source_item"]: r["dimension_name"] for r in csv.DictReader(RUBRIC_PATH.open(encoding="utf-8-sig"))}
    cards_doc = json.loads(CARDS_PATH.read_text(encoding="utf-8"))
    names = cards_doc["sources"]
    clean = lambda t: re.sub(r"\s*\((?:[A-Z]{2}-[A-Z0-9]+-[a-z](?:, )?)+\)", "", t).replace(" (TI-D5-c limits)", "").strip()
    used: dict[str, set] = {}
    for c in cards_doc["cards"]:
        tool = "Team Diagnostic" if c["rubric"] == "team_diagnostic" else "Message Coach"
        used.setdefault(names[c["source"]], set()).add(tool)
    for a in mapping["areas"].values():   # cards linked to Tool 2 areas also serve Tool 2
        for cid in a["card_ids"]:
            src = next(names[c["source"]] for c in cards_doc["cards"] if c["id"] == cid)
            used[src].add("Team Diagnostic")
    year = lambda s: int(re.search(r"\((\d{4})", s).group(1)) if re.search(r"\((\d{4})", s) else 0
    from app.tool1.rubrics import RUBRICS
    heading = re.compile(r"^### ([DF]\d)\. (.+?)\n\n\*\*Definition\.\*\* ([^\[]+)", re.M)
    tool1 = []
    for r in RUBRICS.values():   # Tool 1 writing dimensions; definitions are read from the approved rubric files
        defs = {code: (name, d.strip()) for code, name, d in heading.findall(r.text())}
        mine = [c for c in cards_doc["cards"] if c["rubric"] == r.message_type]
        tool1.append({
            "message_type": r.message_type,
            "label": r.message_type.replace("_", " ").capitalize(),
            "dimensions": [{"code": k.split("_")[0], "name": defs[k.split("_")[0]][0], "definition": defs[k.split("_")[0]][1],
                            "sources": sorted({names[c["source"]] for c in mine if c["dimension"] == k}, key=lambda s: (year(s), s))}
                           for k in r.dimensions],
            "context": [{"finding": c["finding"], "source": names[c["source"]]} for c in mine if c["dimension"] == "all"],
        })
    return {
        "tool1": tool1,
        "checks": mapping["evidence_checklist"]["checks"],
        "label_rule": mapping["evidence_checklist"]["label_rule"],
        "areas": [{"item_id": q, "label": a.get("plain_label") or names_by_item.get(q, q), "strength": a["evidence_strength"],
                   "score": a.get("checklist_score", 0), "in_scope": a["evidence_strength"] in mapping["eligible_strengths"],
                   "checks": {k: {"pass": v["pass"], "why": clean(v["why"])} for k, v in a.get("checklist", {}).items()}}
                  for q, a in mapping["areas"].items()],
        "sources": sorted(({"citation": s, "tools": sorted(t)} for s, t in used.items()), key=lambda x: (x["citation"].split(",")[0].split(" ")[0], year(x["citation"]))),
    }


# ---------- Compiled frontend ----------

if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        """Any non-API address returns the React app, which handles its own page routing.
        index.html is never cached, so after a rebuild the browser always gets the current file names."""
        f = DIST / path
        if path and f.is_file():
            return FileResponse(f)
        return FileResponse(DIST / "index.html", headers={"Cache-Control": "no-cache"})
