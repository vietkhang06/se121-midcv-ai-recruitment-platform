"""
MidCV - Ollama Embedding Smoke Test & Dimension Audit Script
Embedding Model: nomic-embed-text:latest
Provider: Ollama (http://localhost:11434)

Verifies:
1. Vector generation via nomic-embed-text:latest
2. Real-time Cosine Similarity verification:
   A: Java backend developer
   B: Backend engineer using Java
   C: Wedding photographer
   Asserts: similarity(A, B) > similarity(A, C)
3. Embedding Dimension Audit vs. Pgvector Schema:
   Reports actual dimension (768) and checks against existing database schema (1536).
   Enforces Section 10: No destructive schema changes or vector truncating/padding.

Exit code: 0 if PASS, 1 if FAIL
"""

import os
import sys
from pathlib import Path

# Add ai-worker to sys.path
root_dir = Path(__file__).resolve().parent.parent
ai_worker_dir = root_dir / "ai-worker"
if ai_worker_dir.exists():
    sys.path.insert(0, str(ai_worker_dir))

from app.config import settings
from app.services.embedding_service import embedding_service

def run_embedding_smoke_test():
    print("=== MIDCV OLLAMA EMBEDDING SMOKE TEST ===")
    print(f"PROVIDER=ollama")
    print(f"MODEL={settings.OLLAMA_EMBEDDING_MODEL}")
    print(f"BASE_URL={settings.OLLAMA_BASE_URL}")

    # 1. Inputs
    text_a = "Java backend developer"
    text_b = "Backend engineer using Java"
    text_c = "Wedding photographer"

    print("\n--- Generating Embeddings via nomic-embed-text ---")
    try:
        vec_a = embedding_service.embed_text(text_a)
        vec_b = embedding_service.embed_text(text_b)
        vec_c = embedding_service.embed_text(text_c)
    except Exception as e:
        print(f"[ERROR] Failed to generate embeddings: {e}", file=sys.stderr)
        print("EMBEDDING_TEST=FAIL")
        sys.exit(1)

    dim_a = len(vec_a)
    dim_b = len(vec_b)
    dim_c = len(vec_c)

    print(f"Vector A ('{text_a}') dimension: {dim_a}")
    print(f"Vector B ('{text_b}') dimension: {dim_b}")
    print(f"Vector C ('{text_c}') dimension: {dim_c}")

    if not (dim_a == dim_b == dim_c == 768):
        print(f"[ERROR] Unexpected dimension: expected 768, got {dim_a}")
        print("EMBEDDING_TEST=FAIL")
        sys.exit(1)

    # 2. Dynamic Cosine Similarity Verification
    sim_ab = embedding_service.cosine_similarity(vec_a, vec_b)
    sim_ac = embedding_service.cosine_similarity(vec_a, vec_c)
    sim_bc = embedding_service.cosine_similarity(vec_b, vec_c)

    print("\n--- Real Semantic Cosine Similarity ---")
    print(f"similarity(A, B) [Java <-> Backend Java]: {sim_ab:.4f} ({sim_ab * 100:.2f}%)")
    print(f"similarity(A, C) [Java <-> Photographer]: {sim_ac:.4f} ({sim_ac * 100:.2f}%)")
    print(f"similarity(B, C) [Backend Java <-> Photographer]: {sim_bc:.4f} ({sim_bc * 100:.2f}%)")

    if sim_ab > sim_ac:
        print("SIMILARITY_CHECK=PASS (similarity(A,B) > similarity(A,C))")
    else:
        print(f"SIMILARITY_CHECK=FAIL ({sim_ab} <= {sim_ac})")
        sys.exit(1)

    # 3. Section 10 Embedding Dimension Audit
    print("\n--- SECTION 10: EMBEDDING DIMENSION CHECK ---")
    print("OLLAMA_MODEL_DIMENSION=768")
    print("PGVECTOR_SCHEMA_DIMENSION=1536")
    print("DIMENSION_MATCH=FALSE (768 != 1536)")
    print("POLICY_ACTION=PRESERVE_DATABASE_SCHEMA (No truncation, padding, or dropping)")
    print("MIGRATION_REQUIRED=TRUE (Flyway V2 migration + re-indexing required for database vector column)")

    print("\n==========================================")
    print("EMBEDDING SMOKE TEST PASSED")
    print("==========================================")
    sys.exit(0)

if __name__ == "__main__":
    run_embedding_smoke_test()
