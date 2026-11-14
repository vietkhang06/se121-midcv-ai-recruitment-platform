"""Synthetic grounding checks; no HTTP, LLM or database."""
import json
import pytest
from app.services.structured_cv_validator import StructuredCVValidator


def validate(payload, raw):
    j, s, data, error = StructuredCVValidator().validate(json.dumps(payload), raw)
    assert j and s, error
    return data


def test_unsupported_skill_removed():
    data = validate({'skills': [{'name': 'Java'}, {'name': 'Kubernetes'}]}, 'Java academic database projects.')
    assert [s.name for s in data.skills] == ['Java']
    assert data.warnings


def test_java_does_not_match_javascript():
    assert not validate({'skills': [{'name': 'Java'}]}, 'JavaScript frontend projects.').skills


@pytest.mark.parametrize('raw,gpa,scale', [
    ('GPA: 3.6/4.0 at Example Institute.', 3.6, 4.0),
    ('Điểm trung bình: 7,8 / 10 tại Example Institute.', 7.8, 10),
    ('Example Institute: 8.3/10.', 8.3, 10),
])
def test_grade_preserved(raw, gpa, scale):
    e = validate({'education': [{'institution': 'Example Institute', 'gpa': gpa, 'gpa_scale': scale}]}, raw).education[0]
    assert (e.gpa, e.gpa_scale) == (gpa, scale)


def test_unsupported_gpa_removed():
    data = validate({'education': [{'institution': 'Example Institute', 'gpa': 4.0, 'gpa_scale': 4.0}]}, 'Education: Example Institute. Academic projects. No grade is supplied.')
    assert data.education[0].gpa is None
    assert data.education[0].gpa_scale is None
    assert data.warnings


def test_unmentioned_education_institution_is_removed_from_structured_draft():
    raw = "EDUCATION\nBachelor of Software Engineering - North Example Institute (2020)\n"
    data = validate({
        'education': [
            {'institution': 'South Example University', 'degree': 'Bachelor of Software Engineering', 'endYear': 2020},
            {'institution': 'North Example Institute', 'degree': 'Bachelor of Software Engineering', 'endYear': 2020},
        ]
    }, raw)

    assert [item.institution for item in data.education] == ['North Example Institute']
    assert data.education[0].degree == 'Bachelor of Software Engineering'
    assert any('Unsupported education institution omitted' in warning for warning in data.warnings)


def test_scale_not_inferred():
    e = validate({'education': [{'institution': 'Example Institute', 'gpa': 3.6, 'gpa_scale': 4.0}]}, 'GPA: 3.6 at Example Institute.').education[0]
    assert e.gpa == 3.6
    assert e.gpa_scale is None


def test_calendar_fraction_not_grade():
    e = validate({'education': [{'institution': 'Example Institute', 'gpa': 3, 'gpa_scale': 4}]}, 'Education: Example Institute. Meeting date 3/4.').education[0]
    assert e.gpa is None
