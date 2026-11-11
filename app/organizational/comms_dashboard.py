"""Tool 2 page: communication themes from team survey results.

Run inside the shared app (streamlit run streamlit_app.py) or alone (streamlit run app/organizational/comms_dashboard.py).
Views: one team, compare teams, whole company. The page stands alone and does not link to Tool 1
(Practicum_Agent DECISIONS.md F1 row 25). Ranking, scope, and intervals come from app/organizational/themes.py. Data is synthetic.
"""
from html import escape
from pathlib import Path
import re
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import altair as alt
import pandas as pd
import streamlit as st

from app.organizational.themes import CLEAR, FLOOR, MINIMUM, POSSIBLE, company_themes, load_areas, team_themes_from_files

RED, BLUE, MUTED = "#e34948", "#2a78d6", "#52514e"
VIEWS = ["One team", "Compare teams", "Whole company"]

CSS = """<style>
.block-container {max-width:1100px;padding-top:2.2rem;}
.cm-sub {color:#52514e;margin-top:-.6rem;margin-bottom:.4rem;font-size:1.05rem}
.cm-note {color:#667085;font-size:.85rem}
.cm-card {background:#fff;border:1px solid #DEE6EF;border-radius:16px;padding:1.1rem 1.2rem;height:100%;}
.cm-card .rank {text-transform:uppercase;letter-spacing:.12em;font-size:.72rem;font-weight:700;color:#47717D}
.cm-card .label {font-size:1.25rem;font-weight:700;color:#17365D;line-height:1.3;margin:.25rem 0 .15rem}
.cm-card .item {color:#667085;font-size:.8rem;margin-bottom:.6rem}
.cm-card .score {font-size:1.6rem;font-weight:700;color:#243042}
.cm-card .gap {color:#52514e;font-size:.9rem;margin-bottom:.6rem}
.cm-chip {display:inline-block;border-radius:999px;padding:2px 10px;font-size:.78rem;font-weight:600;border:1px solid}
.cm-clear {color:#a32020;border-color:#e34948;background:#fdecec}
.cm-possible {color:#6b5a00;border-color:#d8b64a;background:#fbf5df}
.cm-block h4 {font-size:.95rem;color:#17365D;margin:.2rem 0 .3rem}
.cm-src {color:#667085;font-size:.8rem}
</style>"""


def chip(status):
    cls = "cm-clear" if status == CLEAR else "cm-possible"
    return f'<span class="cm-chip {cls}">{escape(status)}</span>'


def team_name(team_id):
    return team_id.removeprefix("SYNTHETIC_").replace("_", " ")


def clean_limits(text):
    """Card limits were written for the Tool 1 rewriter; drop sentences that only make sense there."""
    return " ".join(s for s in re.split(r"(?<=\.)\s+", text) if "rewriter" not in s.lower() and "PF-F" not in s).strip()


def best_evidence(area):
    """The finding shown first: a workplace study if there is one, otherwise the first card."""
    work = [e for e in area.evidence if e.setting.lower().startswith("workplace")]
    return (work or list(area.evidence))[0]


@st.cache_resource(show_spinner="Reading team results...")
def _results(minimum_responses):
    return team_themes_from_files(minimum_responses)


def theme_cards(top):
    cols = st.columns(len(top))
    for number, (col, t) in enumerate(zip(cols, top), start=1):
        with col:
            st.markdown(
                f'<div class="cm-card"><div class="rank">Theme {number}</div>'
                f'<div class="label">{escape(t.area.plain_label)}</div>'
                f'<div class="item">{escape(t.area.item_id)} · {escape(t.area.name)}</div>'
                f'<div class="score">{t.mean:.2f} <span style="font-size:.9rem;color:#667085">/ 5</span></div>'
                f'<div class="gap">{t.gap:.2f} below the company average</div>{chip(t.status)}</div>',
                unsafe_allow_html=True)


def theme_detail(t, team_label=None):
    a = t.area
    left, right = st.columns(2, gap="large")
    with left:
        st.markdown("#### Why it is flagged")
        who = team_label or "Team members"
        sure = ("The gap holds up when the team's answers are resampled, so it is unlikely to be noise."
                if t.status == CLEAR else "The gap is small enough that it could be noise; treat it as something to check.")
        st.write(f"{who} rated *{a.plain_label.lower()}* {t.mean:.2f} out of 5. That is under {FLOOR:.0f}, the level Gallup describes as "
                 f"met often but not consistently, and {t.gap:.2f} below the company average of {t.mean + t.gap:.2f}. {sure}")
        st.markdown("#### Ask your team")
        st.write(a.manager_question)
    with right:
        st.markdown("#### What research says")
        e = best_evidence(a)
        st.write(e.finding)
        st.markdown(f'<div class="cm-src">{escape(e.source)}, {escape(e.locator)} · {escape(e.setting)}</div>', unsafe_allow_html=True)
        st.markdown("#### What to practice")
        for h in a.plain_habits:
            st.markdown(f"- {h}")
    with st.expander(f"All research for this area ({len(a.evidence)} findings)"):
        for e in a.evidence:
            limits = clean_limits(e.limits)
            st.markdown(f"**{escape(e.finding)}**  \n"
                        f'<span class="cm-src">{escape(e.source)}, {escape(e.locator)} · {escape(e.setting)}'
                        f'{" · Limits: " + escape(limits) if limits else ""}</span>', unsafe_allow_html=True)


def gap_chart(result, items):
    rows = []
    for t in result.ranked:
        if items is not None and t.area.item_id not in items:
            continue
        diff = -t.gap
        top_ids = {x.area.item_id for x in result.top_for(items)}
        kind = (t.status if t.area.item_id in top_ids else ("At or above company average" if diff >= 0 else "Below, not a theme"))
        lo, hi = ((-t.interval[1], -t.interval[0]) if t.interval else (diff, diff))
        rows.append({"Area": t.area.plain_label, "Difference": round(diff, 2), "Score": round(t.mean, 2),
                     "Low": round(lo, 2), "High": round(hi, 2), "Status": kind})
    df = pd.DataFrame(rows)
    order = df.sort_values("Difference")["Area"].tolist()
    color = alt.Color("Status:N", title=None, legend=alt.Legend(orient="top"),
                      scale=alt.Scale(domain=[CLEAR, POSSIBLE, "Below, not a theme", "At or above company average"],
                                      range=[RED, "#f0a3a2", "#c9c8c3", BLUE]))
    base = alt.Chart(df).encode(y=alt.Y("Area:N", sort=order, title=None, axis=alt.Axis(labelLimit=320)))
    bars = base.mark_bar(cornerRadius=4, height=18).encode(
        x=alt.X("Difference:Q", title="Difference from the company average (points on a 1 to 5 scale)",
                scale=alt.Scale(domain=[-1.4, 1.4])),
        color=color,
        tooltip=["Area", "Score", alt.Tooltip("Difference", title="Difference from average"),
                 alt.Tooltip("Low", title="95% interval low"), alt.Tooltip("High", title="95% interval high"), "Status"])
    whiskers = base.mark_rule(color=MUTED, strokeWidth=1.5).encode(x="Low:Q", x2="High:Q")
    zero = alt.Chart(pd.DataFrame({"x": [0]})).mark_rule(color=MUTED, strokeDash=[4, 3]).encode(x="x:Q")
    st.altair_chart((bars + whiskers + zero).properties(height=46 * len(df) + 40), use_container_width=True)
    st.markdown('<div class="cm-note">Thin lines show the 95% interval. A theme is a clear gap when its whole interval sits below the company average (left of the dashed line). Below, not a theme means the team still scores 4 or more there, or the area is outside the top three.</div>',
                unsafe_allow_html=True)


def view_team(results, areas, items, team_ids):
    team_id = st.selectbox("Team", team_ids, format_func=team_name)
    r = results[team_id]
    if r.suppressed:
        st.info(f"{team_name(team_id)} is hidden: fewer than the minimum number of respondents.")
        return
    top = r.top_for(items)
    clear = [t.area.plain_label for t in top if t.status == CLEAR]
    if clear:
        st.subheader(f"{team_name(team_id)} should focus on: {' and '.join(clear)}")
    elif top:
        st.subheader(f"{team_name(team_id)}: no clear gap. Worth checking: {top[0].area.plain_label}")
    else:
        st.subheader(f"{team_name(team_id)}: no communication area is both under 4 and below the company average")
        return
    st.markdown(f'<div class="cm-note">{r.respondents} respondents · a theme scores under {FLOOR:.0f} and below the company average for that area</div>',
                unsafe_allow_html=True)
    theme_cards(top)
    st.write("")
    tabs = st.tabs([f"{i + 1}. {t.area.plain_label}" for i, t in enumerate(top)])
    for tab, t in zip(tabs, top):
        with tab:
            theme_detail(t)
    st.markdown("### How each area compares")
    gap_chart(r, items)
    lines = [f"Communication themes for {team_name(team_id)} (synthetic data)", ""]
    for i, t in enumerate(top, 1):
        lines += [f"{i}. {t.area.plain_label} ({t.area.item_id}): {t.mean:.2f} / 5, {t.gap:.2f} below the company average. {t.status}.",
                  f"   Research: {best_evidence(t.area).finding} ({best_evidence(t.area).source})",
                  f"   Practice: {'; '.join(t.area.plain_habits)}", f"   Ask the team: {t.area.manager_question}", ""]
    lines.append("Signals and hypotheses only, not causes. Discuss with the team before acting.")
    st.download_button("Download these themes", "\n".join(lines), file_name=f"themes_{team_name(team_id)}.txt")


def view_compare(results, areas, items):
    reported = [r for r in results.values() if not r.suppressed]
    rows = []
    for r in reported:
        top_ids = {t.area.item_id: t.status for t in r.top_for(items)}
        for t in r.ranked:
            if items is not None and t.area.item_id not in items:
                continue
            rows.append({"Team": team_name(r.team_id), "Area": t.area.plain_label, "Score": round(t.mean, 2),
                         "Difference": round(-t.gap, 2),
                         "Theme": {CLEAR: "Clear gap", POSSIBLE: "Possible gap"}.get(top_ids.get(t.area.item_id), ""),
                         "Mark": "●" if top_ids.get(t.area.item_id) == CLEAR else ("○" if t.area.item_id in top_ids else "")})
    df = pd.DataFrame(rows)
    st.subheader("Where each team's gaps are")
    area_order = [a.plain_label for q, a in areas.items() if items is None or q in items]
    base = alt.Chart(df).encode(x=alt.X("Team:N", title=None, axis=alt.Axis(labelAngle=0, orient="top")),
                                y=alt.Y("Area:N", title=None, sort=area_order, axis=alt.Axis(labelLimit=320)))
    cells = base.mark_rect(cornerRadius=4, stroke="#ffffff", strokeWidth=2).encode(
        color=alt.Color("Difference:Q", title="Difference from company average",
                        scale=alt.Scale(domain=[-1, 0, 1], range=[RED, "#f0efec", BLUE], interpolate="rgb", clamp=True),
                        legend=alt.Legend(orient="bottom")),
        tooltip=["Team", "Area", "Score", alt.Tooltip("Difference", title="Difference from company average"), "Theme"])
    marks = base.mark_text(fontSize=16, color="#243042").encode(text="Mark:N")
    st.altair_chart((cells + marks).properties(height=52 * df["Area"].nunique() + 40), use_container_width=True)
    st.markdown('<div class="cm-note">● clear gap · ○ possible gap. Red cells sit below the\'s company average for that area, blue cells above it.</div>',
                unsafe_allow_html=True)
    hidden = [team_name(r.team_id) for r in results.values() if r.suppressed]
    if hidden:
        st.caption(f"Hidden for privacy (too few responses): {', '.join(hidden)}.")


def view_company(results, areas, items):
    rows, reported, suppressed = company_themes(results, areas, items)
    lead = [r for r in rows if len(r["teams_clear"]) >= 2]
    if lead:
        st.subheader(f"Company-wide focus: {' and '.join(r['area'].plain_label for r in lead[:2])}")
    else:
        st.subheader("No area is a clear gap in more than one team")
    st.markdown(f'<div class="cm-note">{reported} teams included · {suppressed} hidden for privacy</div>', unsafe_allow_html=True)
    data = []
    for r in rows:
        data.append({"Area": r["area"].plain_label, "Kind": CLEAR, "Teams": len(r["teams_clear"]),
                     "Which teams": ", ".join(team_name(t) for t in r["teams_clear"])})
        possible = [t for t in r["teams_in_top3"] if t not in r["teams_clear"]]
        data.append({"Area": r["area"].plain_label, "Kind": POSSIBLE, "Teams": len(possible),
                     "Which teams": ", ".join(team_name(t) for t in possible)})
    df = pd.DataFrame(data)
    chart = alt.Chart(df).mark_bar(cornerRadius=4, height=20).encode(
        y=alt.Y("Area:N", sort=[r["area"].plain_label for r in rows], title=None, axis=alt.Axis(labelLimit=320)),
        x=alt.X("Teams:Q", title="Number of teams where this is a theme", axis=alt.Axis(tickMinStep=1)),
        color=alt.Color("Kind:N", title=None, scale=alt.Scale(domain=[CLEAR, POSSIBLE], range=[RED, "#f0a3a2"]),
                        legend=alt.Legend(orient="top")),
        order=alt.Order("Kind:N", sort="ascending"),
        tooltip=["Area", "Kind", "Teams", "Which teams"])
    st.altair_chart(chart.properties(height=46 * len(rows) + 40), use_container_width=True)
    for r in lead[:2]:
        a = r["area"]
        st.markdown(f"### {a.plain_label}")
        st.markdown(f'<div class="cm-note">A clear gap in {len(r["teams_clear"])} teams: {", ".join(team_name(t) for t in r["teams_clear"])}</div>',
                    unsafe_allow_html=True)
        left, right = st.columns(2, gap="large")
        with left:
            st.markdown("#### What research says")
            e = best_evidence(a)
            st.write(e.finding)
            st.markdown(f'<div class="cm-src">{escape(e.source)}, {escape(e.locator)} · {escape(e.setting)}</div>', unsafe_allow_html=True)
        with right:
            st.markdown("#### What to practice across the company")
            for h in a.plain_habits:
                st.markdown(f"- {h}")
            st.markdown("#### Ask the teams")
            st.write(a.manager_question)


def main():
    st.set_page_config(page_title="CommsAlign — Team Diagnostic", layout="wide")
    st.markdown(CSS, unsafe_allow_html=True)
    st.title("Team Diagnostic")
    st.markdown('<div class="cm-sub">Which communication habits should a team work on, based on its survey results?</div>',
                unsafe_allow_html=True)
    st.markdown('<div class="cm-note">Synthetic data</div>', unsafe_allow_html=True)

    results = _results(MINIMUM)
    areas = load_areas()
    view = st.segmented_control("View", VIEWS, default=VIEWS[0], key="cm_view") or VIEWS[0]
    items = None   # every in-scope area; the earlier message-type filter was removed (F1 row 25)
    st.divider()

    team_ids = sorted(results, key=team_name)
    if view == "One team":
        view_team(results, areas, items, team_ids)
    elif view == "Compare teams":
        view_compare(results, areas, items)
    else:
        view_company(results, areas, items)

    with st.expander("How this works"):
        st.write("The tool looks at six communication areas of the team survey that our research covers: knowing what is expected (Q01), "
                 "having the information and tools to do the work (Q02), recognition (Q04), encouragement to grow (Q06), asking for and acting on input (Q07), and talking about progress (Q11). "
                 "Areas without clear research support are left out, so they never appear as themes.")
        st.write("A theme is an area where the team scores under 4 and below the company average for that area, with the biggest gap first. "
                 "Gallup compares a team's items with its global database to find opportunities (Interpreting Your Engagement Results, 2015, p.1); "
                 "the company average stands in for that database. Gallup describes a 4 as met often but not consistently (same guide, p.2); "
                 "using 4 as the cutoff is our team's judgment. A team that scores well everywhere gets no themes. Ties go to the area that passes more of our four evidence checks (close match, workplace evidence, a performance "
                 "or behavior outcome, no contrary finding), then to "
                 "Gallup's foundation items Q01 to Q06 (same guide, p.2).")
        st.write("A 95% interval comes from resampling the team's answers 2,000 times. A clear gap stays below the company average across that interval.")
        st.write("Links between survey areas and research are our team's judgment, based on overlapping wording; no source names the survey items. "
                 "Results are signals to discuss with the team, not causes.")


if __name__ == "__main__":
    main()
