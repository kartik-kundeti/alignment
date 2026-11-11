"""Tests for the FastAPI backend (backend/main.py) that serves the React site."""
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_overview_lists_company_structure():
    o = client.get('/api/tool2/overview').json()
    assert len(o['departments']) == 6 and len(o['teams']) > 20
    assert o['rules'] == {'floor': 4.0, 'minimum': 4, 'top_n': 3}
    assert {a['item_id'] for a in o['areas']} == {'Q01', 'Q02', 'Q04', 'Q06', 'Q07', 'Q11'}


def test_team_department_and_company_views():
    t = client.get('/api/tool2/team/SYNTHETIC_Engineering_Platform').json()
    assert t['themes'][0]['item_id'] == 'Q04' and t['themes'][0]['company'] > t['themes'][0]['mean']
    assert all(x['mean'] < 4 and x['gap'] > 0 for x in t['themes'])
    d = client.get('/api/tool2/department/Customer Support').json()
    assert d['themes'][0]['item_id'] == 'Q07' and len(d['themes'][0]['teams']) >= 4
    c = client.get('/api/tool2/company').json()
    assert c['focus'] and len(c['heatmap']) == c['reported']


def test_errors_and_validation():
    assert client.get('/api/tool2/team/nope').status_code == 404
    assert client.get('/api/tool2/department/nope').status_code == 404
    assert client.post('/api/tool1/review', json={'draft': 'x', 'message_type': 'memo'}).status_code == 422


def test_citations_are_author_year_only():
    t = client.get('/api/tool2/team/SYNTHETIC_Engineering_Platform').json()
    for e in t['themes'][0]['evidence']:
        assert set(e) == {'finding', 'source'} and 'p.' not in e['source']
    r = client.get('/api/research').json()
    assert len(r['areas']) == 9 and all(not a['label'].startswith('Q') for a in r['areas'])
    assert all('(' in s['citation'] and 'p.' not in s['citation'] for s in r['sources'])


def test_research_covers_message_coach():
    r = client.get('/api/research').json()
    assert [t['message_type'] for t in r['tool1']] == ['task_instruction', 'performance_feedback']
    for t in r['tool1']:
        assert len(t['dimensions']) == 5
        for d in t['dimensions']:
            assert d['definition'] and d['sources'] and '[' not in d['definition']
            assert all('p.' not in s for s in d['sources'])


def test_company_and_department_grids():
    c = client.get('/api/tool2/company').json()
    assert len(c['scorecard']) == 6 and all(s['low'] <= s['company'] <= s['high'] for s in c['scorecard'])
    assert all(len(d['cells']) == 6 for d in c['departments'])
    d = client.get('/api/tool2/department/Customer Support').json()
    assert all(len(t['cells']) == 6 for t in d['team_list'])


def test_pdf_briefs():
    for kind, ident in [('team', 'SYNTHETIC_Engineering_Platform'), ('department', 'Customer Support'), ('company', '')]:
        r = client.get(f'/api/tool2/report/{kind}', params={'id': ident})
        assert r.status_code == 200 and r.headers['content-type'] == 'application/pdf'
        assert r.content.startswith(b'%PDF') and 'attachment' in r.headers['content-disposition']
    assert client.get('/api/tool2/report/team', params={'id': 'nope'}).status_code == 404
    assert client.get('/api/tool2/report/memo').status_code == 404
