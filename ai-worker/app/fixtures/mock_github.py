MOCK_GITHUB_DATA = {
    "candidate-java": {
        "username": "candidate-java",
        "github_url": "https://github.com/candidate-java",
        "public_repos_count": 4,
        "latest_activity_at": "2026-08-28T10:00:00Z", # Recent activity within 14 days
        "repositories": [
            {
                "name": "spring-boot-microservices-demo",
                "repo_url": "https://github.com/candidate-java/spring-boot-microservices-demo",
                "description": "E-Commerce backend microservices using Java 21, Spring Boot 3, and PostgreSQL",
                "primary_language": "Java",
                "stars_count": 18,
                "forks_count": 4,
                "is_archived": False,
                "updated_at_github": "2026-08-28T10:00:00Z",
                "languages": [
                    {"language_name": "Java", "bytes_count": 450000, "percentage_ratio": 60.0},
                    {"language_name": "TypeScript", "bytes_count": 225000, "percentage_ratio": 30.0},
                    {"language_name": "HTML", "bytes_count": 75000, "percentage_ratio": 10.0}
                ],
                "topics": ["spring-boot", "java", "postgresql", "microservices"]
            },
            {
                "name": "pgvector-search-java",
                "repo_url": "https://github.com/candidate-java/pgvector-search-java",
                "description": "Pgvector extension integration sample in Java",
                "primary_language": "Java",
                "stars_count": 5,
                "forks_count": 1,
                "is_archived": False,
                "updated_at_github": "2026-07-20T10:00:00Z",
                "languages": [
                    {"language_name": "Java", "bytes_count": 200000, "percentage_ratio": 100.0}
                ],
                "topics": ["java", "pgvector", "vector-search"]
            }
        ]
    },
    "candidate-private": {
        "username": "candidate-private",
        "github_url": "https://github.com/candidate-private",
        "public_repos_count": 0,
        "latest_activity_at": "2026-08-01T10:00:00Z",
        "repositories": [],
        "status": "PRIVATE_ONLY"
    },
    "candidate-rate-limited": {
        "username": "candidate-rate-limited",
        "github_url": "https://github.com/candidate-rate-limited",
        "public_repos_count": 0,
        "latest_activity_at": None,
        "repositories": [],
        "status": "API_UNAVAILABLE"
    }
}

