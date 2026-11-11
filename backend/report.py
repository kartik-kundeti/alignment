"""Builds the downloadable Team Diagnostic brief as a PDF (Practicum_Agent DECISIONS.md G2 row 7).

It adds no analysis. It lays out the same results the website shows (from backend/main.py):
headline numbers, a scorecard chart, the focus areas with habits and questions, and for a
department or the company a colour grid of groups by area. Drawn with ReportLab.
"""
from __future__ import annotations

import io
from datetime import date

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

NAVY = colors.HexColor("#17233B")
RED = colors.HexColor("#C62828")
GREEN = colors.HexColor("#198754")
GOLD = colors.HexColor("#E9B44C")
GREY = colors.HexColor("#8A94A6")
MUTED = colors.HexColor("#5B6576")
LIGHT = colors.HexColor("#F5F7FA")
LINE = colors.HexColor("#DDE2EA")

SHORT = {"Q01": "Expectations", "Q02": "Information & tools", "Q04": "Recognition",
         "Q06": "Growth", "Q07": "Input", "Q11": "Progress"}

PAGE_W, PAGE_H = letter
MARGIN = 0.7 * inch
WIDTH = PAGE_W - 2 * MARGIN - 12  # the page frame keeps 6 points of padding on each side


def _styles():
    plain = ParagraphStyle("plain", fontName="Helvetica", textColor=NAVY, alignment=TA_LEFT)
    base = dict(parent=plain)
    return {
        "h1": ParagraphStyle("h1", **base, fontSize=24, leading=28, fontName="Helvetica-Bold"),
        "kicker": ParagraphStyle("kicker", **base, fontSize=9, leading=12, textColor=MUTED),
        "h2": ParagraphStyle("h2", **base, fontSize=14, leading=18, fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=2),
        "sub": ParagraphStyle("sub", **base, fontSize=9, leading=12, textColor=MUTED, spaceAfter=8),
        "h3": ParagraphStyle("h3", **base, fontSize=12, leading=15, fontName="Helvetica-Bold"),
        "body": ParagraphStyle("body", **base, fontSize=9.5, leading=13),
        "small": ParagraphStyle("small", **base, fontSize=8, leading=10.5, textColor=MUTED),
        "quote": ParagraphStyle("quote", **base, fontSize=9.5, leading=13, fontName="Helvetica-Oblique"),
        "label": ParagraphStyle("label", **base, fontSize=7, leading=9, textColor=MUTED, fontName="Helvetica-Bold"),
    }


def _frame(canvas, doc):
    """Navy band with the product name on every page, and a footer line."""
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.55 * inch, PAGE_W, 0.55 * inch, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 12)
    canvas.drawString(MARGIN, PAGE_H - 0.35 * inch, "CommsAlign")
    canvas.setFillColor(GOLD)
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.35 * inch, "Team Diagnostic brief")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(MARGIN, 0.45 * inch, f"Generated {date.today():%B %d, %Y}. Simulated demonstration data.")
    canvas.drawRightString(PAGE_W - MARGIN, 0.45 * inch, f"Page {doc.page}")
    canvas.restoreState()


def _kpis(items: list[tuple[str, str, str | None, colors.Color | None]]) -> Table:
    """A navy strip of headline numbers: (label, value, sub, value colour)."""
    s = _styles()
    cells = []
    for label, value, sub, tone in items:
        size = 20 if len(value) <= 6 else 13
        v = ParagraphStyle("v", parent=s["body"], fontSize=size, leading=size + 4, fontName="Helvetica-Bold",
                           textColor=tone or colors.white)
        cells.append([Paragraph(label.upper(), ParagraphStyle("l", parent=s["label"], textColor=colors.HexColor("#AAB3C2"))),
                      Paragraph(value, v),
                      Paragraph(sub or "", ParagraphStyle("s", parent=s["small"], textColor=colors.HexColor("#C5CCD8")))])
    t = Table([cells], colWidths=[WIDTH / len(items)] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LINEBEFORE", (1, 0), (-1, -1), 0.5, colors.HexColor("#2E3B55")),
    ]))
    return t


def _x(v: float, x0: float, x1: float) -> float:
    return x0 + (v - 2.5) / 2.5 * (x1 - x0)


def _scorecard(rows: list[dict], floor: float, range_mode: bool = False) -> Drawing:
    """Dot chart on a 2.5 to 5 axis. Group mode: group dot and company circle. Range mode: company dot on a low-to-high bar."""
    row_h, top, label_w = 26, 14, 120
    h = top + row_h * len(rows) + 30
    d = Drawing(WIDTH, h)
    x0, x1 = label_w, WIDTH - 30
    y_base = h - top
    for v in (2.5, 3, 3.5, 4, 4.5, 5):
        x = _x(v, x0, x1)
        d.add(Line(x, 22, x, y_base, strokeColor=LINE, strokeWidth=0.5))
        d.add(String(x, 10, f"{v:g}", fontName="Helvetica", fontSize=7.5, fillColor=MUTED, textAnchor="middle"))
    fx = _x(floor, x0, x1)
    d.add(Line(fx, 22, fx, y_base, strokeColor=GOLD, strokeWidth=1.2, strokeDashArray=[3, 2]))
    for i, r in enumerate(rows):
        y = y_base - row_h * (i + 0.5)
        d.add(String(label_w - 8, y - 3, r["name"], fontName="Helvetica", fontSize=8.5, fillColor=NAVY, textAnchor="end"))
        if range_mode:
            lo, hi, c = _x(r["low"], x0, x1), _x(r["high"], x0, x1), _x(r["company"], x0, x1)
            d.add(Rect(lo, y - 4, hi - lo, 8, rx=4, ry=4, fillColor=colors.HexColor("#E3E7EE"), strokeColor=None))
            d.add(Circle(lo, y, 3, fillColor=RED, strokeColor=None))
            d.add(Circle(hi, y, 3, fillColor=GREEN, strokeColor=None))
            d.add(Circle(c, y, 5.5, fillColor=NAVY, strokeColor=colors.white, strokeWidth=1))
            d.add(String(c, y + 8, f"{r['company']:.2f}", fontName="Helvetica-Bold", fontSize=7.5, fillColor=NAVY, textAnchor="middle"))
        else:
            g, c = _x(r["mean"], x0, x1), _x(r["company"], x0, x1)
            d.add(Line(g, y, c, y, strokeColor=colors.HexColor("#C9D0DB"), strokeWidth=2.5))
            d.add(Circle(c, y, 4.5, fillColor=colors.white, strokeColor=NAVY, strokeWidth=1.3))
            d.add(Circle(g, y, 5.5, fillColor=r["color"], strokeColor=None))
            left = r["mean"] < r["company"]
            d.add(String(g + (-9 if left else 9), y - 3, f"{r['mean']:.2f}", fontName="Helvetica-Bold", fontSize=7.5,
                         fillColor=NAVY, textAnchor="end" if left else "start"))
    return d


def _tint(diff: float) -> tuple[colors.Color, colors.Color]:
    if abs(diff) < 0.05:
        return LIGHT, NAVY
    a = 0.12 + min(abs(diff) / 0.7, 1) * 0.78
    base = (198, 40, 40) if diff < 0 else (25, 135, 84)
    mixed = colors.Color(*[(1 - a) + a * c / 255 for c in base])
    return mixed, colors.white if a > 0.55 else NAVY


def _grid(rows: list[dict], areas: list[str]) -> Table:
    """Groups by areas. Each cell is the score; colour is the difference from the company; outline marks a flagged area."""
    s = _styles()
    head = [""] + [Paragraph(f"<b>{SHORT.get(q, q)}</b>", ParagraphStyle("gh", parent=s["small"], alignment=1)) for q in areas]
    data, styles = [head], []
    for ri, r in enumerate(rows, start=1):
        line = [Paragraph(f"<b>{r['label']}</b><br/><font size=7 color='#5B6576'>{r.get('sub', '')}</font>", s["body"])]
        for ci, q in enumerate(areas, start=1):
            c = r["cells"].get(q)
            if not c:
                line.append("n/a")
                continue
            bg, fg = _tint(c["diff"])
            line.append(f"{c['mean']:.2f}")
            styles += [("BACKGROUND", (ci, ri), (ci, ri), bg), ("TEXTCOLOR", (ci, ri), (ci, ri), fg)]
            if c["theme"]:
                styles.append(("BOX", (ci, ri), (ci, ri), 1.6, NAVY if c["theme"] == "Clear gap" else GOLD))
        data.append(line)
    t = Table(data, colWidths=[1.6 * inch] + [(WIDTH - 1.6 * inch) / len(areas)] * len(areas), repeatRows=1)
    t.setStyle(TableStyle([
        ("FONT", (1, 1), (-1, -1), "Helvetica-Bold", 9), ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE), ("GRID", (1, 1), (-1, -1), 1.5, colors.white),
        *styles,
    ]))
    return t


def _grid_key() -> Paragraph:
    return Paragraph("Cell colour: red below the company average, green above. Navy outline: clear gap. Gold outline: possible gap.",
                     _styles()["small"])


def _focus(themes: list[dict], heading_note: str) -> list:
    s = _styles()
    out: list = [Paragraph("Focus areas", s["h2"]), Paragraph(heading_note, s["sub"])]
    if not themes:
        box = Table([[Paragraph("<b>No area to focus on.</b> Every area scores 4 or more, or at or above the company average.", s["body"])]],
                    colWidths=[WIDTH])
        box.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#E8F3ED")),
                                 ("LEFTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
        return out + [box]
    for i, t in enumerate(themes, start=1):
        status_col = "#C62828" if t["status"] == "Clear gap" else "#9a6c0e"
        title = Paragraph(f"<font color='#17233B'>{i:02d}</font>&nbsp;&nbsp;{t['label']}&nbsp;&nbsp;"
                          f"<font size=8 color='{status_col}'>{t['status']}</font>", s["h3"])
        score = Paragraph(f"<b><font size=14>{t['mean']:.2f}</font></b><br/><font size=7.5 color='#5B6576'>company {t['company']:.2f}</font>"
                          f"<br/><font size=8 color='#C62828'><b>-{t['gap']:.2f}</b></font>", ParagraphStyle("r", parent=s["body"], alignment=2))
        practice = [Paragraph("WHAT TO PRACTICE", s["label"])] + [Paragraph(f"- {p}", s["body"]) for p in t["practice"]]
        ask = [Paragraph("ASK THE TEAM", s["label"]), Paragraph(f"“{t['question']}”", s["quote"])]
        cites = "; ".join(dict.fromkeys(e["source"] for e in t["evidence"]))
        inner = Table([[practice, ask]], colWidths=[(WIDTH - 1.1 * inch) / 2] * 2)
        inner.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
        body = [title, Spacer(1, 6), inner, Spacer(1, 4), Paragraph(f"Research: {cites}", s["small"])]
        if t.get("teams"):
            body.insert(3, Paragraph(f"Shared by {len(t['teams'])} teams in the department.", s["small"]))
        row = Table([[body, score]], colWidths=[WIDTH - 1.1 * inch, 1.1 * inch])
        row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LINEABOVE", (0, 0), (-1, 0), 0.6, LINE),
                                 ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                                 ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
        out.append(KeepTogether(row))
    return out


def _method(floor: float, minimum: int) -> list:
    s = _styles()
    lines = [f"An area is flagged when the group scores under {floor:g} and below the company average for that area.",
             "The company average stands in for Gallup's benchmark database.",
             "A clear gap holds across 2,000 resamples of the group's answers. A possible gap may be noise.",
             f"Only six research-backed areas can be flagged. Groups with fewer than {minimum} respondents are not reported."]
    return [Paragraph("How areas are flagged", s["h2"])] + [Paragraph(f"{i}. {t}", s["small"]) for i, t in enumerate(lines, 1)]


def _dot_color(a: dict) -> colors.Color:
    if a.get("rank"):
        return RED if a["status"] == "Clear gap" else GOLD
    return GREEN if a["gap"] <= 0 else GREY


def group_pdf(g: dict, order: list[str], rules: dict) -> bytes:
    """Brief for one team or department, from the backend's group result."""
    s = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.85 * inch,
                            bottomMargin=0.75 * inch, title=f"CommsAlign brief, {g['name']}", author="CommsAlign")
    rank = {t["item_id"]: t for t in g["themes"]}
    areas = [{**a, "rank": rank.get(a["item_id"], {}).get("rank"), "status": rank.get(a["item_id"], {}).get("status", a["status"])}
             for a in sorted(g["areas"], key=lambda a: order.index(a["item_id"]))]
    n = len(g["themes"])
    clear = sum(1 for t in g["themes"] if t["status"] == "Clear gap")
    best = max(areas, key=lambda a: a["mean"] - a["company"])
    bd = best["mean"] - best["company"]
    who = "team" if g["kind"] == "team" else "department"
    story: list = [
        Paragraph(f"{g.get('department', '')} department" if g["kind"] == "team" else "Department", s["kicker"]),
        Paragraph(g["name"], s["h1"]), Spacer(1, 10),
        _kpis([("Respondents", str(g["respondents"]), None, None),
               ("Focus areas", str(n), f"of {len(areas)} areas", RED if n else GREEN),
               ("Clear gaps", str(clear), f"{n - clear} possible" if n - clear else None, None),
               ("Strongest area", SHORT.get(best["item_id"], best["label"]), f"{bd:+.2f} vs company", GREEN if bd > 0 else None)]),
        Paragraph(f"How the {who} scores in each area", s["h2"]),
        Paragraph(f"Filled dot: the {who}. Open circle: the company average. Dashed line: {rules['floor']:g}. "
                  "Red is a clear gap, gold a possible gap, grey below the company but not flagged, green at or above.", s["sub"]),
        _scorecard([{"name": SHORT.get(a["item_id"], a["label"]), "mean": a["mean"], "company": a["company"], "color": _dot_color(a)}
                    for a in areas], rules["floor"]),
        *_focus(g["themes"], f"Areas under {rules['floor']:g} and below the company average, largest gap first."),
    ]
    if g["kind"] == "department" and g.get("team_list"):
        story += [Paragraph(f"Teams in {g['name']}", s["h2"]),
                  Paragraph("A gap shared by most teams is a department matter. A gap in one team is local.", s["sub"]),
                  _grid([{"label": t["name"].replace(f"{g['name']} ", ""), "sub": f"{t['respondents']} people", "cells": t["cells"]}
                         for t in g["team_list"] if not t["suppressed"]], order), Spacer(1, 4), _grid_key()]
    story += _method(rules["floor"], rules["minimum"])
    doc.build(story, onFirstPage=_frame, onLaterPages=_frame)
    return buf.getvalue()


def company_pdf(c: dict, o: dict) -> bytes:
    """Brief for the whole company, from the backend's company and overview results."""
    s = _styles()
    rules, order = o["rules"], [a["item_id"] for a in o["areas"]]
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.85 * inch,
                            bottomMargin=0.75 * inch, title="CommsAlign brief, whole company", author="CommsAlign")
    people = sum(t["respondents"] for t in o["teams"])
    under = sum(1 for a in c["scorecard"] if a["company"] < rules["floor"])
    with_clear = sum(1 for r in c["heatmap"] if any(x["theme"] == "Clear gap" for x in r["cells"].values()))
    focus = [a for a in c["areas"] if a["item_id"] in c["focus"]]
    story: list = [
        Paragraph(f"{len(o['departments'])} departments", s["kicker"]), Paragraph("Whole company", s["h1"]), Spacer(1, 10),
        _kpis([("Respondents", str(people), None, None),
               ("Teams reported", str(c["reported"]), f"{c['suppressed']} hidden" if c["suppressed"] else None, None),
               (f"Areas under {rules['floor']:g}", str(under), f"of {len(c['scorecard'])}, company average", RED if under else GREEN),
               ("Teams with a clear gap", str(with_clear), f"of {c['reported']}", None)]),
        Paragraph("Company scorecard", s["h2"]),
        Paragraph(f"Dark dot: the company average. Bar: lowest team (red end) to highest team (green end). Dashed line: {rules['floor']:g}.", s["sub"]),
        _scorecard([{"name": SHORT.get(a["item_id"], a["label"]), **a} for a in c["scorecard"]], rules["floor"], range_mode=True),
        Paragraph("Departments by area", s["h2"]),
        Paragraph("Each cell is the department's average, coloured by its distance from the company average.", s["sub"]),
        _grid([{"label": d["name"], "sub": f"{d['respondents']} people", "cells": d["cells"]} for d in c["departments"]], order),
        Spacer(1, 4), _grid_key(),
        Paragraph("Company-wide focus areas", s["h2"]),
        Paragraph("Areas that are a clear gap in two or more teams.", s["sub"]),
    ]
    if not focus:
        story.append(Paragraph("No area is a clear gap in more than one team.", s["body"]))
    for i, f in enumerate(focus, start=1):
        cites = "; ".join(dict.fromkeys(e["source"] for e in f["evidence"]))
        story.append(KeepTogether([
            Paragraph(f"<font color='#17233B'>{i:02d}</font>&nbsp;&nbsp;{f['label']}&nbsp;&nbsp;"
                      f"<font size=8 color='#C62828'>Clear gap in {len(f['teams_clear'])} teams</font>", s["h3"]),
            Spacer(1, 4), *[Paragraph(f"- {p}", s["body"]) for p in f["practice"]],
            Spacer(1, 3), Paragraph(f"“{f['question']}”", s["quote"]),
            Paragraph(f"Research: {cites}", s["small"]), Spacer(1, 10)]))
    story += [Paragraph("Every team", s["h2"]),
              _grid([{"label": r["team"].replace(f"{r['department']} ", ""), "sub": r["department"], "cells": r["cells"]} for r in c["heatmap"]], order),
              Spacer(1, 4), _grid_key(), *_method(rules["floor"], rules["minimum"])]
    doc.build(story, onFirstPage=_frame, onLaterPages=_frame)
    return buf.getvalue()
