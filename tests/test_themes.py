"""Tests for communication themes (app/organizational/themes.py) and the Tool 2 page (comms_dashboard.py)."""
import json
from pathlib import Path

from streamlit.testing.v1 import AppTest

from app.organizational.themes import (CARDS_PATH, CLEAR, FLOOR, MAPPING_PATH, MINIMUM, POSSIBLE, TOP_N, company_themes, department_themes,
                                       load_areas, load_departments, rank_team, team_themes_from_files)

PAGE = Path(__file__).resolve().parents[1] / 'app/organizational/comms_dashboard.py'
AREAS = load_areas()
FLAT = {q: 3.8 for q in AREAS}
COMPANY = {f'Q{i:02d}': 3.8 for i in range(1, 13)}
OUT_OF_SCOPE = {'Q03', 'Q05', 'Q08', 'Q09', 'Q10', 'Q12'}


def test_only_areas_with_clear_evidence_are_in_scope():
    assert set(AREAS) == {'Q01', 'Q02', 'Q04', 'Q06', 'Q07', 'Q11'}
    ids = {c['id'] for c in json.loads(CARDS_PATH.read_text(encoding='utf-8'))['cards']}
    for a in AREAS.values():
        assert a.strength in ('Stronger', 'Moderate') and a.evidence
        assert {e.card_id for e in a.evidence} <= ids
        assert a.plain_label and a.plain_habits


def test_low_area_without_evidence_never_becomes_a_theme():
    # Team norms (Q09) is the lowest item, but it is out of scope.
    r = rank_team('T', {**FLAT, 'Q09': 1.5, 'Q04': 3.2}, AREAS, COMPANY)
    assert [t.area.item_id for t in r.top] == ['Q04']
    for res in team_themes_from_files().values():
        assert not {t.area.item_id for t in res.ranked} & OUT_OF_SCOPE


def test_ranks_by_gap_and_evidence_only_breaks_ties():
    r = rank_team('T', {**FLAT, 'Q04': 3.0, 'Q01': 3.4}, AREAS, COMPANY)
    assert [t.area.item_id for t in r.top][:2] == ['Q04', 'Q01']
    tie = rank_team('T', {**FLAT, 'Q06': 3.2, 'Q11': 3.2}, AREAS, COMPANY)   # Q06 passes 4 checks, Q11 passes 3
    assert [t.area.item_id for t in tie.top][:2] == ['Q06', 'Q11']
    tie = rank_team('T', {**FLAT, 'Q04': 3.2, 'Q11': 3.2}, AREAS, COMPANY)   # both 3 of 4: foundation item Q04 first
    assert [t.area.item_id for t in tie.top][:2] == ['Q04', 'Q11']


def test_checklist_labels_follow_the_rule():
    m = json.loads(MAPPING_PATH.read_text(encoding='utf-8'))
    for q, spec in m['areas'].items():
        ck = {k: v['pass'] for k, v in spec['checklist'].items()}
        assert spec['checklist_score'] == sum(ck.values())
        if spec['evidence_strength'] == 'Stronger':
            assert all(ck.values())
        if spec['evidence_strength'] == 'Moderate':
            assert ck['B'] and ck['C'] and (ck['A'] != ck['D'])
    assert 'tie_break_order' not in m


def test_no_link_to_tool1():
    mapping = json.loads(MAPPING_PATH.read_text(encoding='utf-8'))
    for spec in mapping['areas'].values():
        assert 'tool1_habits' not in spec and 'message_types' not in spec
    src = PAGE.read_text(encoding='utf-8')
    assert 'message-coach' not in src and 'Tool 1' not in src.split('def clean_limits')[1].split('def best_evidence')[1]


def test_suppression_and_no_theme_cases():
    assert MINIMUM == 4
    small = {q: 3 for q in AREAS}                                     # group under 4: no results
    assert rank_team('T', {**FLAT, 'Q04': 2.0}, AREAS, COMPANY, counts=small).suppressed
    counts = {q: 20 for q in AREAS} | {'Q04': 3}                      # one item under 4: only that item drops
    r = rank_team('T', {**FLAT, 'Q04': 2.0, 'Q01': 3.0}, AREAS, COMPANY, counts=counts)
    assert not r.suppressed and [t.area.item_id for t in r.top] == ['Q01']
    assert not rank_team('T', {**FLAT, 'Q04': 2.0}, AREAS, COMPANY, counts={q: 4 for q in AREAS}).suppressed
    assert rank_team('T', FLAT, AREAS, COMPANY).top == []


def test_intervals_mark_clear_and_possible_gaps():
    people = [{q: 4 for q in AREAS} | {'Q04': 2} for _ in range(20)]
    means = {q: sum(p[q] for p in people) / len(people) for q in AREAS}
    r = rank_team('T', means, AREAS, COMPANY, people=people)
    assert r.top[0].area.item_id == 'Q04' and r.top[0].status == CLEAR
    assert all(t.interval[0] <= t.gap <= t.interval[1] for t in r.top)


def test_simulated_company_patterns():
    """The three planted patterns in simulate_q12.py (F1 row 28)."""
    res = team_themes_from_files()
    depts = department_themes()
    dept_of = load_departments()
    assert len(depts) == 6 and len(res) > 20 and not any(r.suppressed for r in res.values())
    # 1. Department-wide voice gap in Customer Support
    assert depts['Customer Support'].top[0].area.item_id == 'Q07' and depts['Customer Support'].top[0].status == CLEAR
    support = [t for t, d in dept_of.items() if d == 'Customer Support']
    assert sum(any(x.area.item_id == 'Q07' for x in res[t].top) for t in support) >= 4
    # 2. Recognition gap in one Engineering team only
    assert res['SYNTHETIC_Engineering_Platform'].top[0].area.item_id == 'Q04'
    assert not any(x.area.item_id == 'Q04' and x.status == CLEAR for x in depts['Engineering'].top)
    # 3. Finance scores well: no department theme
    assert depts['Finance'].top == []
    rows, reported, suppressed = company_themes(res, AREAS)
    assert (reported, suppressed) == (len(res), 0)
    assert all(len(r.top) <= TOP_N for r in res.values())




def test_page_views_render():
    app = AppTest.from_file(str(PAGE)).run(timeout=60)
    assert not app.exception
    assert app.title[0].value == 'Team Diagnostic'
    assert not app.radio                                   # no dataset switch
    assert not [e for e in app.expander if e.label in ('Data-quality rules', 'Evidence validation status')]
    app.selectbox[0].set_value('SYNTHETIC_Engineering_Platform').run(timeout=60)
    assert not app.exception
    assert any('should focus on' in s.value for s in app.subheader)
    for view in ('Compare teams', 'Whole company'):
        app.segmented_control(key='cm_view').set_value(view).run(timeout=60)
        assert not app.exception
    assert any('Company-wide focus' in s.value for s in app.subheader)
    assert not [c for c in app.segmented_control if c.key == 'cm_focus']


def test_shared_app_uses_new_page():
    app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / 'streamlit_app.py')).run(timeout=60)
    assert not app.exception


def test_q07_is_tool2_only():
    from app.tool1.cards import load_cards, retrieve
    q07 = AREAS['Q07']
    assert q07.strength == 'Moderate'
    assert {e.card_id for e in q07.evidence} == {'TD-C9-a', 'TD-C9-b', 'TD-C9-c', 'TD-C9-d'}
    cards = load_cards()
    for kind in ('task_instruction', 'performance_feedback'):
        dims = {c.dimension for c in cards.values() if c.rubric == kind}
        assert not [c for c in retrieve(cards, kind, list(dims)) if c.id.startswith('TD-')]


def test_floor_and_company_rule():
    strong = {q: 4.2 for q in AREAS} | {'Q04': 4.05}
    high_company = {q: 4.6 for q in COMPANY}
    assert rank_team('T', strong, AREAS, high_company).top == []          # below company but not under 4
    low_company = {q: 3.0 for q in COMPANY}
    assert rank_team('T', {q: 3.5 for q in AREAS}, AREAS, low_company).top == []   # under 4 but above company
    r = rank_team('T', {**FLAT, 'Q04': 3.9, 'Q01': 3.2}, AREAS, {**COMPANY, 'Q04': 4.5})
    assert [t.area.item_id for t in r.top] == ['Q01', 'Q04']   # equal gaps of 0.6: Q01 passes 4 checks, Q04 passes 3
    assert all(t.mean < FLOOR and t.gap > 0 for t in r.top)
