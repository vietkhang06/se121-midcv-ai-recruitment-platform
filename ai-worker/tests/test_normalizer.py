import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.normalizer import normalize_skill_name

def test_positive_alias_normalization():
    assert normalize_skill_name("Spring Framework") == "Spring Boot"
    assert normalize_skill_name("postgres") == "PostgreSQL"
    assert normalize_skill_name("GA4") == "Google Analytics 4"
    assert normalize_skill_name("TS") == "TypeScript"
    assert normalize_skill_name("k8s") == "Kubernetes"

def test_negative_alias_normalization_prevents_false_equivalence():
    # Ensure distinct technologies are NOT merged into the same canonical name
    java_norm = normalize_skill_name("Java")
    js_norm = normalize_skill_name("JavaScript")
    assert java_norm != js_norm
    assert java_norm == "Java"
    assert js_norm == "JavaScript"

    go_norm = normalize_skill_name("Go")
    ga_norm = normalize_skill_name("Google Analytics 4")
    assert go_norm != ga_norm

    c_norm = normalize_skill_name("C")
    cpp_norm = normalize_skill_name("C++")
    assert c_norm != cpp_norm
