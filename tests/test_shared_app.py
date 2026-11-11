from pathlib import Path
from dataclasses import asdict
from streamlit.testing.v1 import AppTest
from app.tool1.judge import JudgeResult


def coach():
    return AppTest.from_string('from app.tool1.dashboard import main\nmain()').run()


def test_shared_overview_and_message_page():
    app=AppTest.from_file(str(Path(__file__).resolve().parents[1]/'streamlit_app.py')).run()
    assert not app.exception and app.title[0].value=='CommsAlign'
    app=coach()
    assert not app.exception
    assert app.title[0].value=='Tool 1 — Message Coach'
    app.selectbox[0].set_value('performance_feedback').run()
    assert not app.exception


def test_no_request_without_consent_and_clear_missing_settings(monkeypatch):
    import app.tool1.judge as judge_module
    import app.tool1.config as config
    def forbidden(*args,**kwargs):
        raise AssertionError('Model call not allowed')
    monkeypatch.setattr(judge_module,'judge',forbidden)
    app=coach()
    app.text_area[0].set_value('Please submit your report by Friday.')
    app.button[0].click().run()
    assert not app.exception and any('Confirm' in x.value for x in app.error)
    def missing():
        raise RuntimeError('settings absent')
    monkeypatch.setattr(config,'load_settings',missing)
    app.checkbox[0].check()
    app.button[0].click().run()
    assert not app.exception and any('settings are missing' in x.value for x in app.error)
    assert not app.get('download_button')


def test_mocked_evaluation_export_and_clear(monkeypatch):
    import app.tool1.pipeline as pipeline_module
    import app.tool1.config as config
    monkeypatch.setattr(config,'load_settings',lambda:None)
    calls=[]
    def run(draft,kind):
        calls.append((draft,kind))
        before=JudgeResult(kind,'task_instruction_v1.2',True,False,None,{},'borderline',None,'low','Mock only')
        return pipeline_module.PipelineResult(before,None,None)
    monkeypatch.setattr(pipeline_module,'run',run)
    app=coach()
    app.text_area[0].set_value('Please submit your report by Friday.')
    app.checkbox[0].check()
    app.button[0].click().run()
    assert not app.exception and len(calls)==1
    assert app.get('download_button')
    next(b for b in app.button if b.label=='Clear message and result').click().run()
    assert not app.exception and not app.text_area[0].value
    assert not app.get('download_button')
