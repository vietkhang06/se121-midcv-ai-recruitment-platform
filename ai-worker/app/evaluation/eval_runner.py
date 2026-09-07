import json
import math
import os
import sys
import time

# Ensure parent directory in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.schemas.jd import JDExtractRequest
from app.schemas.cv import CVExtractRequest
from app.services.jd_parser import JDParser
from app.services.cv_parser import CVParser
from app.services.normalizer import normalize_skill_name
from app.services.cache_service import cache_service

def compute_extraction_metrics(predicted: list, ground_truth: list):
    """
    Computes True Positives (TP), False Positives (FP), False Negatives (FN),
    Precision, Recall, and F1 Score for a pair of predicted vs ground-truth sets.
    """
    pred_set = set(p.strip().lower() for p in predicted if p)
    gt_set = set(g.strip().lower() for g in ground_truth if g)

    tp = len(pred_set.intersection(gt_set))
    fp = len(pred_set.difference(gt_set))
    fn = len(gt_set.difference(pred_set))

    precision = tp / (tp + fp) if (tp + fp) > 0 else 1.0 if len(gt_set) == 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 1.0 if len(gt_set) == 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": f1
    }

def compute_dcg(relevance_scores: list, k: int) -> float:
    """
    Discounted Cumulative Gain at K:
    DCG@K = sum_{i=1}^K (2^rel_i - 1) / log2(i + 1)
    """
    dcg = 0.0
    for i in range(min(k, len(relevance_scores))):
        rel = relevance_scores[i]
        gain = (2.0 ** rel) - 1.0
        discount = math.log2(i + 2) # i=0 -> log2(2) = 1
        dcg += gain / discount
    return dcg

def compute_ndcg_at_k(predicted_items: list, k: int) -> dict:
    """
    Normalized Discounted Cumulative Gain at K.
    predicted_items: list of dicts with 'ground_truth_relevance' and 'predicted_score'
    """
    # Sort by predicted score descending
    sorted_pred = sorted(predicted_items, key=lambda x: x["predicted_score"], reverse=True)
    pred_rel = [x["ground_truth_relevance"] for x in sorted_pred]

    # Ideal sort by ground truth relevance descending
    ideal_rel = sorted([x["ground_truth_relevance"] for x in predicted_items], reverse=True)

    dcg_k = compute_dcg(pred_rel, k)
    idcg_k = compute_dcg(ideal_rel, k)

    ndcg = (dcg_k / idcg_k) if idcg_k > 0 else 1.0

    # Precision@K: fraction of top-K recommendations that are relevant (rel >= 2)
    relevant_in_top_k = sum(1 for r in pred_rel[:k] if r >= 2)
    p_at_k = relevant_in_top_k / k if k > 0 else 0.0

    return {
        "k": k,
        "dcg": round(dcg_k, 4),
        "idcg": round(idcg_k, 4),
        "ndcg": round(ndcg, 4),
        "precision_at_k": round(p_at_k, 4)
    }

def run_evaluation():
    dataset_path = os.path.join(os.path.dirname(__file__), "dataset.json")
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    jd_parser = JDParser()
    cv_parser = CVParser()

    total_cases = len(dataset)
    global_tp = 0
    global_fp = 0
    global_fn = 0

    cat_metrics = {
        "JD": {"tp": 0, "fp": 0, "fn": 0, "cases": 0},
        "CV": {"tp": 0, "fp": 0, "fn": 0, "cases": 0}
    }

    print("==========================================================")
    print("MATCHPROOF ACADEMIC AI EVALUATION — INFORMATION EXTRACTION")
    print("==========================================================")

    for item in dataset:
        case_id = item["id"]
        case_type = item["type"]
        cat_metrics[case_type]["cases"] += 1

        if case_type == "JD":
            # Test cache check
            cached = cache_service.get("JD", item["input_text"])
            if cached:
                res = cached
            else:
                req = JDExtractRequest(job_id=case_id, title="Eval Job", industry=item.get("industry", "Technology"), raw_description=item["input_text"])
                res = jd_parser.parse_job_description(req)
                cache_service.set("JD", item["input_text"], res)

            extracted_req_skills = [s.normalized_name for s in res.required_skills]
            expected_req_skills = item["expected_output"]["required_skills"]

            m = compute_extraction_metrics(extracted_req_skills, expected_req_skills)
            cat_metrics["JD"]["tp"] += m["tp"]
            cat_metrics["JD"]["fp"] += m["fp"]
            cat_metrics["JD"]["fn"] += m["fn"]
            global_tp += m["tp"]
            global_fp += m["fp"]
            global_fn += m["fn"]

            status = "PASS" if m["f1"] == 1.0 else "SUBOPTIMAL"
            print(f"[{status}] {case_id} ({item['industry']} JD) -> P: {m['precision']:.2f}, R: {m['recall']:.2f}, F1: {m['f1']:.2f}")

        elif case_type == "CV":
            cached = cache_service.get("CV", item["input_text"])
            if cached:
                res = cached
            else:
                req = CVExtractRequest(cv_id=case_id, cv_version_id="eval-ver-01", file_type="PDF", raw_text=item["input_text"])
                res = cv_parser.parse_cv_document(req)
                cache_service.set("CV", item["input_text"], res)

            extracted_skills = [s.normalized_name for s in res.skills]
            expected_skills = item["expected_output"]["skills"]

            m = compute_extraction_metrics(extracted_skills, expected_skills)
            cat_metrics["CV"]["tp"] += m["tp"]
            cat_metrics["CV"]["fp"] += m["fp"]
            cat_metrics["CV"]["fn"] += m["fn"]
            global_tp += m["tp"]
            global_fp += m["fp"]
            global_fn += m["fn"]

            status = "PASS" if m["f1"] == 1.0 else "SUBOPTIMAL"
            print(f"[{status}] {case_id} ({item['industry']} CV) -> P: {m['precision']:.2f}, R: {m['recall']:.2f}, F1: {m['f1']:.2f}")

    # Overall Extraction Metrics
    macro_precision = global_tp / (global_tp + global_fp) if (global_tp + global_fp) > 0 else 0.0
    macro_recall = global_tp / (global_tp + global_fn) if (global_tp + global_fn) > 0 else 0.0
    macro_f1 = (2 * macro_precision * macro_recall) / (macro_precision + macro_recall) if (macro_precision + macro_recall) > 0 else 0.0

    print("\n--- QUANTITATIVE EXTRACTION SUMMARY ---")
    print(f"Total Evaluated Extraction Cases: {total_cases}")
    print(f"Total True Positives (TP): {global_tp}")
    print(f"Total False Positives (FP): {global_fp}")
    print(f"Total False Negatives (FN): {global_fn}")
    print(f"Micro-averaged Precision: {macro_precision * 100:.2f}%")
    print(f"Micro-averaged Recall:    {macro_recall * 100:.2f}%")
    print(f"Micro-averaged F1 Score:  {macro_f1 * 100:.2f}%")

    # Category breakdowns
    for cat in ["JD", "CV"]:
        c_tp = cat_metrics[cat]["tp"]
        c_fp = cat_metrics[cat]["fp"]
        c_fn = cat_metrics[cat]["fn"]
        c_p = c_tp / (c_tp + c_fp) if (c_tp + c_fp) > 0 else 0.0
        c_r = c_tp / (c_tp + c_fn) if (c_tp + c_fn) > 0 else 0.0
        c_f1 = (2 * c_p * c_r) / (c_p + c_r) if (c_p + c_r) > 0 else 0.0
        print(f"{cat} Extraction Category -> P: {c_p*100:.2f}%, R: {c_r*100:.2f}%, F1: {c_f1*100:.2f}%")

    # Ranking Evaluation (NDCG@K)
    print("\n==========================================================")
    print("MATCHPROOF ACADEMIC EVALUATION — CANDIDATE RANKING (NDCG@K)")
    print("==========================================================")
    ranking_path = os.path.join(os.path.dirname(__file__), "ranking_dataset.json")
    with open(ranking_path, "r", encoding="utf-8") as f:
        ranking_data = json.load(f)

    job_bench = ranking_data["benchmark_job"]
    req_set = set(normalize_skill_name(s).lower() for s in job_bench["required_skills"])
    pref_set = set(normalize_skill_name(s).lower() for s in job_bench["preferred_skills"])

    scored_candidates = []
    for cand in ranking_data["candidates"]:
        cand_skills = set(normalize_skill_name(s).lower() for s in cand["skills"])
        req_matched = len(req_set.intersection(cand_skills))
        pref_matched = len(pref_set.intersection(cand_skills))
        req_missing = len(req_set) - req_matched

        # S_req = 100 * (req_matched / len(req_set))
        s_req = (req_matched / len(req_set)) * 100.0 if req_set else 100.0
        s_pref = (pref_matched / len(pref_set)) * 100.0 if pref_set else 100.0
        skill_score = (0.80 * s_req) + (0.20 * s_pref)

        # Experience score
        exp_years = cand.get("experience_years", 0)
        exp_score = min(100.0, (exp_years / job_bench["min_experience_years"]) * 100.0)

        # Core score
        core_score = (0.60 * skill_score) + (0.40 * exp_score)

        # GitHub supporting score (supplementary only: non-technical or unavailable has ZERO penalty)
        if cand.get("github_available"):
            github_score = 88.0
            overall_score = (0.85 * core_score) + (0.15 * github_score)
        else:
            overall_score = core_score # zero penalty

        # Enforce Required Skills Gate (Missing required skills lowers rank)
        final_rank_metric = overall_score - (req_missing * 30.0)

        scored_candidates.append({
            "id": cand["id"],
            "name": cand["name"],
            "ground_truth_relevance": cand["ground_truth_relevance"],
            "predicted_score": final_rank_metric,
            "overall_score": overall_score,
            "req_missing": req_missing
        })

    ndcg_3 = compute_ndcg_at_k(scored_candidates, 3)
    ndcg_5 = compute_ndcg_at_k(scored_candidates, 5)

    print(f"Candidate Ranking NDCG@3: {ndcg_3['ndcg']} (Precision@3: {ndcg_3['precision_at_k']})")
    print(f"Candidate Ranking NDCG@5: {ndcg_5['ndcg']} (Precision@5: {ndcg_5['precision_at_k']})")
    print("----------------------------------------------------------\n")

    return {
        "macro_f1": macro_f1,
        "macro_precision": macro_precision,
        "macro_recall": macro_recall,
        "ndcg_at_3": ndcg_3["ndcg"],
        "ndcg_at_5": ndcg_5["ndcg"],
        "precision_at_3": ndcg_3["precision_at_k"],
        "precision_at_5": ndcg_5["precision_at_k"]
    }

if __name__ == "__main__":
    run_evaluation()
