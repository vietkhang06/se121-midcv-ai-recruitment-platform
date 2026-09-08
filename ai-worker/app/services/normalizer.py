import re

# Canonical Technology & Skill Normalization Mapping
ALIAS_MAP = {
    "spring framework": "Spring Boot",
    "springboot": "Spring Boot",
    "spring-boot": "Spring Boot",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "pgvector": "Pgvector",
    "reactjs": "React",
    "react.js": "React",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ga4": "Google Analytics 4",
    "google analytics": "Google Analytics 4",
    "google analytics 4": "Google Analytics 4",
    "aws": "Amazon Web Services (AWS)",
    "amazon web services": "Amazon Web Services (AWS)",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "docker": "Docker",
    "golang": "Go",
    "sql": "SQL",
    "css": "CSS",
    "html": "HTML",
    "api": "API",
    "rest": "REST",
    "ci/cd": "CI/CD",
}

# Explicit Distinct Technologies that MUST NOT be merged
DISTINCT_PAIRS = {
    ("java", "javascript"),
    ("c", "c++"),
    ("c#", "c++"),
    ("go", "google analytics"),
}

def normalize_skill_name(raw_skill: str) -> str:
    if not raw_skill:
        return ""
    
    clean_skill = raw_skill.strip()
    lower_skill = clean_skill.lower()
    
    if lower_skill in ALIAS_MAP:
        return ALIAS_MAP[lower_skill]
    
    # Capitalize first letter of each word if not in map
    return " ".join(word.capitalize() for word in clean_skill.split())
