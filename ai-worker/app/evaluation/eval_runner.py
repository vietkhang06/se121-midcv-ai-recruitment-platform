import json
import os
import sys

# Ensure parent directory in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser

def run_evaluation():
    dataset_path = os.path.join(os.path.dirname(__file__), "dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    jd_parser = JDParser()
    cv_parser = CVParser()
    
    total_cases = len(dataset)
    passed_cases = 0
    failed_cases = 0

    category_stats = {"JD": {"total": 0, "passed": 0}, "CV": {"total": 0, "passed": 0}}
    field_matches = 0
    total_field_checks = 0

    print("=== AI EXTRACTION BENCHMARK EVALUATION REPORT ===")
    for item in dataset:
        case_id = item["id"]
        case_type = item["type"]
        category_stats[case_type]["total"] += 1
        
        if case_type == "JD":
            req = JDExtractRequest(job_id=case_id, title="Eval Job", industry=item.get("industry", "Technology"), raw_description=item["input_text"])
            res = jd_parser.parse_job_description(req)
            extracted_req_skills = [s.normalized_name for s in res.required_skills]
            expected_req_skills = item["expected_output"]["required_skills"]
            
            total_field_checks += len(expected_req_skills)
            matched_fields = sum(1 for s in expected_req_skills if s in extracted_req_skills)
            field_matches += matched_fields
            
            is_case_pass = matched_fields == len(expected_req_skills)
            if is_case_pass:
                passed_cases += 1
                category_stats["JD"]["passed"] += 1
                print(f"[PASS] {case_id} ({item['industry']} JD): Extracted required skills match benchmark.")
            else:
                failed_cases += 1
                print(f"[FAIL] {case_id} ({item['industry']} JD): Expected {expected_req_skills}, got {extracted_req_skills}")

        elif case_type == "CV":
            req = CVExtractRequest(cv_id=case_id, cv_version_id="eval-ver-01", file_type="PDF", raw_text=item["input_text"])
            res = cv_parser.parse_cv_document(req)
            extracted_skills = [s.normalized_name for s in res.skills]
            expected_skills = item["expected_output"]["skills"]

            total_field_checks += len(expected_skills)
            matched_fields = sum(1 for s in expected_skills if s in extracted_skills)
            field_matches += matched_fields

            is_case_pass = matched_fields == len(expected_skills)
            if is_case_pass:
                passed_cases += 1
                category_stats["CV"]["passed"] += 1
                print(f"[PASS] {case_id} ({item['industry']} CV): Extracted skills match benchmark.")
            else:
                failed_cases += 1
                print(f"[FAIL] {case_id} ({item['industry']} CV): Expected {expected_skills}, got {extracted_skills}")

    overall_accuracy = (passed_cases / total_cases) * 100.0 if total_cases > 0 else 0.0
    field_accuracy = (field_matches / total_field_checks) * 100.0 if total_field_checks > 0 else 0.0
    jd_acc = (category_stats["JD"]["passed"] / category_stats["JD"]["total"]) * 100.0 if category_stats["JD"]["total"] > 0 else 0.0
    cv_acc = (category_stats["CV"]["passed"] / category_stats["CV"]["total"]) * 100.0 if category_stats["CV"]["total"] > 0 else 0.0

    print("\n--- HONEST METRIC SUMMARY ---")
    print(f"Total Cases: {total_cases}")
    print(f"Passed Cases: {passed_cases}")
    print(f"Failed Cases: {failed_cases}")
    print(f"Overall Case Accuracy: {overall_accuracy:.2f}%")
    print(f"Field-level Extraction Accuracy: {field_accuracy:.2f}% ({field_matches}/{total_field_checks} fields matched)")
    print(f"JD Category Accuracy: {jd_acc:.2f}% ({category_stats['JD']['passed']}/{category_stats['JD']['total']})")
    print(f"CV Category Accuracy: {cv_acc:.2f}% ({category_stats['CV']['passed']}/{category_stats['CV']['total']})")
    print("-----------------------------\n")

    return overall_accuracy

if __name__ == "__main__":
    run_evaluation()
