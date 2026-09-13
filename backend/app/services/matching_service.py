import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.job_repository import JobRepository
from app.repositories.resume_repository import ResumeRepository
from app.repositories.user_repository import UserRepository

logger = logging.getLogger("careerx.matching_service")

# ============================================================================
# SKILL ALIAS AND NORMALIZATION DICTIONARY
# ============================================================================

SKILL_ALIAS_MAP: Dict[str, str] = {
    # Languages
    "python": "python",
    "python3": "python",
    "py": "python",
    "golang": "go",
    "go": "go",
    "javascript": "javascript",
    "js": "javascript",
    "ecmascript": "javascript",
    "typescript": "typescript",
    "ts": "typescript",
    "java": "java",
    "c++": "c++",
    "cpp": "c++",
    "c#": "c#",
    "csharp": "c#",
    "rust": "rust",
    "ruby": "ruby",
    "php": "php",
    "swift": "swift",
    "kotlin": "kotlin",
    # Frontend & Web
    "react": "react",
    "react.js": "react",
    "reactjs": "react",
    "next.js": "next.js",
    "nextjs": "next.js",
    "next": "next.js",
    "vue": "vue.js",
    "vue.js": "vue.js",
    "vuejs": "vue.js",
    "angular": "angular",
    "node": "node.js",
    "node.js": "node.js",
    "nodejs": "node.js",
    "express": "express.js",
    "express.js": "express.js",
    "expressjs": "express.js",
    "tailwind": "tailwind css",
    "tailwindcss": "tailwind css",
    "tailwind css": "tailwind css",
    "html": "html5",
    "html5": "html5",
    "css": "css3",
    "css3": "css3",
    # Frameworks & APIs
    "fastapi": "fastapi",
    "django": "django",
    "flask": "flask",
    "spring": "spring boot",
    "spring boot": "spring boot",
    "graphql": "graphql",
    "graphql api": "graphql",
    "rest": "rest api",
    "rest api": "rest api",
    "restful": "rest api",
    "restful api": "rest api",
    "grpc": "grpc",
    # Databases & Storage
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "postgres db": "postgresql",
    "mysql": "mysql",
    "redis": "redis",
    "redis cache": "redis",
    "mongo": "mongodb",
    "mongodb": "mongodb",
    "mongodb database": "mongodb",
    "cassandra": "cassandra",
    "dynamodb": "dynamodb",
    "elasticsearch": "elasticsearch",
    "sql": "sql",
    "sqlite": "sqlite",
    # Cloud & DevOps
    "docker": "docker",
    "docker container": "docker",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "kube": "kubernetes",
    "aws": "aws",
    "amazon web services": "aws",
    "gcp": "gcp",
    "google cloud": "gcp",
    "google cloud platform": "gcp",
    "azure": "azure",
    "microsoft azure": "azure",
    "ci/cd": "ci/cd",
    "cicd": "ci/cd",
    "continuous integration": "ci/cd",
    "terraform": "terraform",
    "ansible": "ansible",
    "linux": "linux",
    "unix": "linux",
    "git": "git",
    "github": "git",
    # Distributed Systems & Messaging
    "kafka": "kafka",
    "apache kafka": "kafka",
    "rabbitmq": "rabbitmq",
    "microservices": "microservices",
    "microservice": "microservices",
    "distributed systems": "distributed systems",
    "system design": "system design",
    "event driven": "event-driven architecture",
    "event-driven": "event-driven architecture",
    # Observability & Testing
    "opentelemetry": "opentelemetry",
    "otel": "opentelemetry",
    "prometheus": "prometheus",
    "grafana": "grafana",
    "datadog": "datadog",
    "pytest": "pytest",
    "jest": "jest",
    "testing": "testing & qa",
    "unit testing": "testing & qa",
    # Algorithms
    "algorithms": "algorithms & dsa",
    "dsa": "algorithms & dsa",
    "data structures": "algorithms & dsa",
}

CANONICAL_DISPLAY_NAMES: Dict[str, str] = {
    "python": "Python",
    "go": "Go (Golang)",
    "javascript": "JavaScript",
    "typescript": "TypeScript",
    "java": "Java",
    "c++": "C++",
    "c#": "C#",
    "rust": "Rust",
    "react": "React",
    "next.js": "Next.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "node.js": "Node.js",
    "express.js": "Express.js",
    "tailwind css": "Tailwind CSS",
    "html5": "HTML5",
    "css3": "CSS3",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "spring boot": "Spring Boot",
    "graphql": "GraphQL",
    "rest api": "RESTful APIs",
    "grpc": "gRPC",
    "postgresql": "PostgreSQL",
    "mysql": "MySQL",
    "redis": "Redis",
    "mongodb": "MongoDB",
    "cassandra": "Cassandra",
    "dynamodb": "DynamoDB",
    "elasticsearch": "Elasticsearch",
    "sql": "SQL",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "aws": "AWS",
    "gcp": "Google Cloud (GCP)",
    "azure": "Microsoft Azure",
    "ci/cd": "CI/CD Pipelines",
    "terraform": "Terraform",
    "linux": "Linux",
    "git": "Git",
    "kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",
    "microservices": "Microservices",
    "distributed systems": "Distributed Systems",
    "system design": "System Design",
    "opentelemetry": "OpenTelemetry",
    "prometheus": "Prometheus",
    "grafana": "Grafana",
    "pytest": "Pytest",
    "jest": "Jest",
    "testing & qa": "Testing & QA",
    "algorithms & dsa": "Algorithms & DSA",
}

# Mapping of missing skills to educational modules in Dev Hub (/learning)
SKILL_MODULE_MAP: Dict[str, Dict[str, str]] = {
    "kafka": {
        "courseId": "mod-1",
        "moduleTitle": "Event-Driven Microservices with Kafka",
        "category": "Distributed Systems",
        "estHours": "3.5 hrs",
        "moduleSlug": "/learning?courseId=mod-1",
        "rationale": "High-throughput stream processing and event-driven microservice orchestration.",
    },
    "redis": {
        "courseId": "mod-2",
        "moduleTitle": "Distributed Caching & Rate Limiting with Redis",
        "category": "Databases & Storage",
        "estHours": "2.0 hrs",
        "moduleSlug": "/learning?courseId=mod-2",
        "rationale": "Sliding-window rate limiting, session storage, and cache eviction strategies.",
    },
    "kubernetes": {
        "courseId": "mod-3",
        "moduleTitle": "Kubernetes Multi-Pod Deployments & Helm",
        "category": "Cloud & Infrastructure",
        "estHours": "4.0 hrs",
        "moduleSlug": "/learning?courseId=mod-3",
        "rationale": "Production rolling updates, service discovery, ingress routing, and Helm manifests.",
    },
    "aws": {
        "courseId": "mod-3",
        "moduleTitle": "AWS Cloud Architecture (ECS, S3, RDS)",
        "category": "Cloud & Infrastructure",
        "estHours": "4.0 hrs",
        "moduleSlug": "/learning?courseId=mod-3",
        "rationale": "Containerized workloads on ECS, object storage, and managed relational databases.",
    },
    "docker": {
        "courseId": "mod-3",
        "moduleTitle": "Container Runtimes & Dockerfile Optimization",
        "category": "Cloud & Infrastructure",
        "estHours": "2.0 hrs",
        "moduleSlug": "/learning?courseId=mod-3",
        "rationale": "Multi-stage builds, minimal base images, and runtime vulnerability mitigation.",
    },
    "opentelemetry": {
        "courseId": "mod-1",
        "moduleTitle": "System Observability with OpenTelemetry",
        "category": "Observability",
        "estHours": "2.0 hrs",
        "moduleSlug": "/learning?courseId=mod-1",
        "rationale": "Trace propagation headers, latency percentiles, and distributed span collection.",
    },
    "distributed systems": {
        "courseId": "mod-1",
        "moduleTitle": "Distributed Systems & Consensus Blueprint",
        "category": "Distributed Systems",
        "estHours": "3.5 hrs",
        "moduleSlug": "/learning?courseId=mod-1",
        "rationale": "CAP theorem, Raft consensus, two-phase commits, and idempotency guarantees.",
    },
    "system design": {
        "courseId": "mod-2",
        "moduleTitle": "High-Throughput System Design",
        "category": "System Design",
        "estHours": "2.0 hrs",
        "moduleSlug": "/learning?courseId=mod-2",
        "rationale": "Horizontal scaling, database sharding, and fault-tolerant architecture.",
    },
    "postgresql": {
        "courseId": "mod-12",
        "moduleTitle": "PostgreSQL Indexing & Query Latency Optimization",
        "category": "Databases & Storage",
        "estHours": "3.8 hrs",
        "moduleSlug": "/learning?courseId=mod-12",
        "rationale": "EXPLAIN ANALYZE execution plans, B-tree/GIN indexing, and lock contention analysis.",
    },
    "go": {
        "courseId": "mod-5",
        "moduleTitle": "High-Concurrency Backend Systems in Go",
        "category": "Core Languages",
        "estHours": "3.0 hrs",
        "moduleSlug": "/learning?courseId=mod-5",
        "rationale": "Goroutines, channels, sync primitives, and low-latency network I/O.",
    },
    "python": {
        "courseId": "mod-7",
        "moduleTitle": "FastAPI & Asynchronous Python",
        "category": "Core Languages",
        "estHours": "2.8 hrs",
        "moduleSlug": "/learning?courseId=mod-7",
        "rationale": "Asyncio event loops, Pydantic data contracts, and high-velocity web services.",
    },
    "typescript": {
        "courseId": "mod-6",
        "moduleTitle": "Advanced TypeScript & Type Systems",
        "category": "Core Languages",
        "estHours": "2.5 hrs",
        "moduleSlug": "/learning?courseId=mod-6",
        "rationale": "Conditional types, generics, and end-to-end type safety.",
    },
    "react": {
        "courseId": "mod-10",
        "moduleTitle": "Modern React & Concurrent Rendering",
        "category": "Web & APIs",
        "estHours": "3.2 hrs",
        "moduleSlug": "/learning?courseId=mod-10",
        "rationale": "Custom hooks, performance optimization, and memoization patterns.",
    },
    "graphql": {
        "courseId": "mod-10",
        "moduleTitle": "Schema-Driven GraphQL APIs",
        "category": "Web & APIs",
        "estHours": "2.5 hrs",
        "moduleSlug": "/learning?courseId=mod-10",
        "rationale": "Resolvers, DataLoader batching, and schema federation.",
    },
    "ci/cd": {
        "courseId": "mod-3",
        "moduleTitle": "Automated CI/CD & Deployment Workflows",
        "category": "Cloud & Infrastructure",
        "estHours": "2.0 hrs",
        "moduleSlug": "/learning?courseId=mod-3",
        "rationale": "Pipeline gating, integration testing, and automated release tags.",
    },
    "terraform": {
        "moduleTitle": "Infrastructure as Code with Terraform",
        "category": "Cloud & Infrastructure",
        "estHours": "3.0 hrs",
        "rationale": "Declarative cloud resource provisioning and state management.",
    },
}

# Partial skill detection: if target skill is missing, check if candidate has a related skill
PARTIAL_RELATIONSHIPS: Dict[str, Tuple[List[str], str]] = {
    "kubernetes": (
        ["docker"],
        "Candidate has verified Docker containerization skills, but needs multi-node cluster orchestration experience.",
    ),
    "distributed systems": (
        ["microservices", "docker"],
        "Solid microservices fundamentals, but lacks hands-on multi-region data replication experience.",
    ),
    "kafka": (
        ["redis", "rabbitmq"],
        "Candidate has messaging and caching experience, but lacks Kafka partitioned stream processing depth.",
    ),
    "aws": (
        ["gcp", "azure", "docker"],
        "Cloud provider proficiency present, but specific AWS managed services (ECS, S3, RDS) are required.",
    ),
    "postgresql": (
        ["sql", "mysql", "sqlite"],
        "Relational database fundamentals verified; PostgreSQL-specific indexing and tuning is desired.",
    ),
    "graphql": (
        ["rest api", "fastapi", "express.js"],
        "Strong REST API background; schema design and query resolvers require onboarding.",
    ),
    "opentelemetry": (
        ["prometheus", "grafana"],
        "Metrics monitoring experience present, but needs OpenTelemetry distributed trace instrumentation.",
    ),
}

DIMENSION_CATEGORIES = {
    "Distributed Systems": ["distributed systems", "kafka", "rabbitmq", "microservices", "grpc"],
    "System Design": ["system design", "distributed systems", "microservices", "algorithms & dsa"],
    "Algorithms & DSA": ["algorithms & dsa", "python", "go", "c++", "java"],
    "Cloud & DevOps": ["docker", "kubernetes", "aws", "gcp", "azure", "ci/cd", "terraform", "linux"],
    "Databases & Storage": ["postgresql", "redis", "mongodb", "mysql", "cassandra", "dynamodb", "sql"],
    "Web & APIs": ["react", "node.js", "next.js", "typescript", "javascript", "fastapi", "graphql", "rest api"],
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def normalize_skill(skill_name: str) -> str:
    """Normalize a skill name by trimming, lowercasing, and resolving aliases."""
    if not skill_name:
        return ""
    clean = skill_name.strip().lower()
    # Remove surrounding punctuation
    clean = re.sub(r"^[^\w\+#]+|[^\w\+#]+$", "", clean)
    return SKILL_ALIAS_MAP.get(clean, clean)


def get_display_name(normalized_skill: str) -> str:
    """Return a polished display title for a normalized skill."""
    if normalized_skill in CANONICAL_DISPLAY_NAMES:
        return CANONICAL_DISPLAY_NAMES[normalized_skill]
    # Capitalize words as fallback
    return " ".join(w.capitalize() for w in normalized_skill.split())


def extract_skills_from_text(text: str) -> Set[str]:
    """Scan raw text for known tech skill keywords."""
    if not text:
        return set()
    found = set()
    lower_text = text.lower()
    for alias, canonical in SKILL_ALIAS_MAP.items():
        # Match whole word pattern
        pattern = r"(?:\b|_)" + re.escape(alias) + r"(?:\b|_)"
        if re.search(pattern, lower_text):
            found.add(canonical)
    return found


# ============================================================================
# CORE SERVICE METHODS
# ============================================================================

async def get_candidate_skills(
    db: AsyncIOMotorDatabase,
    user_id: str,
    resume_id: Optional[str] = None,
) -> Tuple[Set[str], List[Dict[str, Any]], Optional[Dict[str, Any]], bool]:
    """
    Gather verified candidate skills from:
    1. Active or specified resume (from Groq analysis extractedSkills or parsedText)
    2. User profile skills (from db.profiles)
    Returns:
        - normalized_skills: Set[str]
        - skill_details: List[Dict[str, Any]] (for display with category and level)
        - active_resume_doc: Optional[Dict[str, Any]]
        - has_active_resume: bool
    """
    resume_repo = ResumeRepository(db)
    user_repo = UserRepository(db)

    # 1. Fetch Resume
    target_resume = None
    if resume_id:
        target_resume = await resume_repo.get_resume_by_id(resume_id, user_id=user_id)
    if not target_resume:
        target_resume = await resume_repo.get_active_resume(user_id)

    has_active_resume = target_resume is not None
    normalized_skills: Set[str] = set()
    skill_categories: Dict[str, str] = {}

    # Extract from resume analysis if available
    if target_resume:
        latest_analysis = await resume_repo.get_latest_analysis(user_id, target_resume["id"])
        if latest_analysis and latest_analysis.get("extractedSkills"):
            raw_ext = latest_analysis["extractedSkills"]
            if isinstance(raw_ext, dict):
                for cat, skills_list in raw_ext.items():
                    if isinstance(skills_list, list):
                        for s in skills_list:
                            norm = normalize_skill(str(s))
                            if norm:
                                normalized_skills.add(norm)
                                skill_categories[norm] = cat
        elif target_resume.get("parsedText"):
            # Extract via text scanner if analysis has not run
            parsed_skills = extract_skills_from_text(target_resume["parsedText"])
            for s in parsed_skills:
                normalized_skills.add(s)
                skill_categories[s] = "Extracted from Resume"

    # 2. Fetch User Profile
    profile = await user_repo.get_profile(user_id)
    if profile and profile.get("skills"):
        for s in profile["skills"]:
            norm = normalize_skill(str(s))
            if norm:
                normalized_skills.add(norm)
                if norm not in skill_categories:
                    skill_categories[norm] = "Profile Skills"

    # Build detailed item list
    skill_details = []
    for s in sorted(normalized_skills):
        display = get_display_name(s)
        category = skill_categories.get(s, "Engineering")
        # Deterministic proficiency estimate based on presence
        skill_details.append({
            "name": display,
            "category": category,
            "level": "Advanced",
            "percent": 88,
            "verified": True,
        })

    return normalized_skills, skill_details, target_resume, has_active_resume


def calculate_job_match(
    candidate_skills: Set[str],
    job: Dict[str, Any],
    candidate_exp: str = "Mid",
    candidate_loc: str = "Remote",
    target_resume: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Calculate deterministic compatibility between candidate skills and job requirements.
    Guarantees mathematically bounded score in [0, 100].
    """
    # 1. Normalize job required skills
    job_skills_raw = job.get("skills", [])
    required_raw = job.get("requiredSkills", [])

    job_skill_names = []
    for item in job_skills_raw:
        if isinstance(item, dict) and "name" in item:
            job_skill_names.append(item["name"])
        elif isinstance(item, str):
            job_skill_names.append(item)

    for r in required_raw:
        if isinstance(r, str) and r not in job_skill_names:
            job_skill_names.append(r)

    # Fallback to scanning job description if skills array is empty
    if not job_skill_names and job.get("description"):
        extracted = extract_skills_from_text(job["description"])
        job_skill_names = list(extracted)

    normalized_job_skills = {normalize_skill(s) for s in job_skill_names if normalize_skill(s)}

    # 2. Compute Set Intersections & Gaps
    if not normalized_job_skills:
        # If job has zero specified skills, score depends on experience / location baseline
        skill_score = 100 if candidate_skills else 50
        matched_norm = candidate_skills
        missing_norm = set()
    else:
        matched_norm = candidate_skills.intersection(normalized_job_skills)
        missing_norm = normalized_job_skills.difference(candidate_skills)
        skill_score = (len(matched_norm) / len(normalized_job_skills)) * 100

    # 3. Detect Partial Skills
    partial_skills = []
    unresolved_missing = set(missing_norm)
    for missing_skill in list(missing_norm):
        if missing_skill in PARTIAL_RELATIONSHIPS:
            related_list, note = PARTIAL_RELATIONSHIPS[missing_skill]
            if any(rel in candidate_skills for rel in related_list):
                partial_skills.append({
                    "name": get_display_name(missing_skill),
                    "note": note,
                })
                # Partial skill still counts as a gap, but candidate has adjacency

    # 4. Experience Level Alignment
    level_weights = {"intern": 1, "junior": 2, "mid": 3, "senior": 4, "lead": 5}
    cand_lvl = level_weights.get(candidate_exp.lower(), 3)
    job_lvl = level_weights.get(str(job.get("experienceLevel", "Mid")).lower(), 3)

    if cand_lvl >= job_lvl:
        exp_score = 100
    elif cand_lvl == job_lvl - 1:
        exp_score = 70
    else:
        exp_score = 35

    # 5. Work Type / Location Alignment
    work_type = str(job.get("workType", "Remote")).lower()
    job_loc = str(job.get("location", "")).lower()
    cand_loc = str(candidate_loc).lower()

    if "remote" in work_type or "remote" in job_loc:
        loc_score = 100
    elif "hybrid" in work_type:
        loc_score = 80 if cand_loc in job_loc else 60
    elif cand_loc in job_loc:
        loc_score = 100
    else:
        loc_score = 40

    # 6. Composite Deterministic Match Score: 70% skills, 15% experience, 15% location
    raw_composite = (0.70 * skill_score) + (0.15 * exp_score) + (0.15 * loc_score)
    final_score = min(100, max(0, round(raw_composite)))

    # 7. Format Outputs
    matched_skills = [get_display_name(s) for s in sorted(matched_norm)]
    
    missing_skills_formatted = []
    for s in sorted(missing_norm):
        mod_info = SKILL_MODULE_MAP.get(s, {
            "moduleTitle": f"{get_display_name(s)} Essentials",
            "category": "General",
            "estHours": "2.5 hrs",
            "rationale": f"Required competency for {job.get('title', 'this role')}.",
        })
        missing_skills_formatted.append({
            "name": get_display_name(s),
            "priority": "High" if s in [normalize_skill(x) for x in required_raw] else "Medium",
            "module": mod_info["moduleTitle"],
        })

    # Recommendations
    recommendations = []
    if missing_norm:
        top_missing = sorted(missing_norm)[0]
        top_display = get_display_name(top_missing)
        mod_info = SKILL_MODULE_MAP.get(top_missing, {"moduleTitle": f"{top_display} Blueprint"})
        recommendations.append({
            "title": f'Complete "{mod_info["moduleTitle"]}" in Dev Hub',
            "desc": f"Closing the {top_display} competency gap will elevate your match score for this position.",
            "action": "Launch Module",
            "link": mod_info.get("moduleSlug", "/learning"),
        })

    if partial_skills:
        first_partial = partial_skills[0]["name"]
        recommendations.append({
            "title": f"Highlight {first_partial} System Projects in Resume",
            "desc": f"Demonstrate production depth for {first_partial} to overcome partial competency flags.",
            "action": "Optimize Bullets",
            "link": "/resume",
        })

    if final_score >= 75:
        recommendations.append({
            "title": "Strong Match: Prepared to Apply",
            "desc": f"Your {final_score}% match score represents strong qualification for this opening.",
            "action": "Prepare Application",
            "link": "/applications",
        })
    elif not recommendations:
        recommendations.append({
            "title": "Refine Profile Skills",
            "desc": "Add more technical proficiencies to your profile to improve diagnostic accuracy.",
            "action": "Update Profile",
            "link": "/profile",
        })

    return {
        "matchScore": final_score,
        "overallScore": final_score,
        "matchedSkills": matched_skills,
        "partialSkills": partial_skills,
        "missingSkills": missing_skills_formatted,
        "recommendations": recommendations,
        "jobId": str(job.get("id") or job.get("_id", "")),
        "jobTitle": job.get("title", ""),
        "company": job.get("company") or job.get("companyName", ""),
        "resumeId": target_resume.get("id") if target_resume else None,
        "resumeName": target_resume.get("filename") if target_resume else None,
    }


async def calculate_skill_gap_matrix(
    db: AsyncIOMotorDatabase,
    user_id: str,
    target_track: Optional[str] = None,
    job_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Calculate dynamic skill gap matrix against live MongoDB jobs.
    Evaluates candidate's profile/resume skills against actual market requirements.
    """
    candidate_skills, detailed_skills, target_resume, has_active_resume = await get_candidate_skills(
        db, user_id
    )

    job_repo = JobRepository(db)
    
    # 1. Fetch live jobs to extract market expectations
    query_filter = {}
    if job_id:
        target_job = await job_repo.get_by_id(job_id)
        live_jobs = [target_job] if target_job else []
    else:
        # Sample active jobs from DB
        live_jobs = await job_repo.find_many({"isActive": True}, limit=50)
        if not live_jobs:
            live_jobs = await job_repo.find_many({}, limit=50)

    # 2. Count market skill prevalence
    market_skill_counts: Dict[str, int] = {}
    market_skill_companies: Dict[str, Set[str]] = {}
    total_jobs = len(live_jobs)

    for j in live_jobs:
        comp_name = j.get("company") or j.get("companyName") or "Industry Standard"
        j_skills = []
        for s in j.get("skills", []):
            if isinstance(s, dict) and "name" in s:
                j_skills.append(s["name"])
            elif isinstance(s, str):
                j_skills.append(s)
        for r in j.get("requiredSkills", []):
            if isinstance(r, str) and r not in j_skills:
                j_skills.append(r)

        # Fallback to description scan if skills array empty
        if not j_skills and j.get("description"):
            j_skills = list(extract_skills_from_text(j["description"]))

        for raw_s in j_skills:
            norm = normalize_skill(raw_s)
            if norm:
                market_skill_counts[norm] = market_skill_counts.get(norm, 0) + 1
                if norm not in market_skill_companies:
                    market_skill_companies[norm] = set()
                market_skill_companies[norm].add(comp_name)

    # If no jobs in DB, provide realistic market baseline based on track
    if total_jobs == 0:
        market_skill_counts = {
            "distributed systems": 8,
            "system design": 9,
            "go": 7,
            "python": 8,
            "postgresql": 8,
            "redis": 7,
            "docker": 8,
            "kubernetes": 6,
            "kafka": 6,
            "aws": 7,
            "algorithms & dsa": 8,
        }
        market_skill_companies = {
            "distributed systems": {"Market Baseline"},
            "kafka": {"Market Baseline"},
            "kubernetes": {"Market Baseline"},
            "redis": {"Market Baseline"},
        }
        total_jobs = 10

    # 3. Calculate Radar Dimensions: Candidate vs Market
    radar_data = []
    dim_scores = []
    for dim_name, dim_skill_list in DIMENSION_CATEGORIES.items():
        # Candidate depth in dimension
        matched_in_dim = [s for s in dim_skill_list if s in candidate_skills]
        cand_score = min(98, max(20, round((len(matched_in_dim) / len(dim_skill_list)) * 100))) if candidate_skills else 0

        # Market requirement level in dimension
        market_mentions = sum(market_skill_counts.get(s, 0) for s in dim_skill_list)
        market_pct = min(95, max(60, round((market_mentions / max(1, total_jobs * len(dim_skill_list))) * 150)))
        
        radar_data.append({
            "subject": dim_name,
            "candidate": cand_score,
            "market": market_pct,
        })
        if cand_score > 0:
            dim_scores.append(cand_score)

    # 4. Category Proficiency Progress Bars
    category_proficiency = []
    cat_mapping = [
        ("Core Languages (Go, Python, TS)", ["go", "python", "typescript", "javascript", "java"]),
        ("Databases & Storage (Postgres, Redis)", ["postgresql", "redis", "mongodb", "mysql"]),
        ("System Design & Concurrency", ["system design", "distributed systems", "microservices"]),
        ("Web & UI (React, Next.js, Tailwind)", ["react", "next.js", "tailwind css", "node.js"]),
        ("Cloud & Kubernetes (ECS, K8s, S3)", ["docker", "kubernetes", "aws", "gcp"]),
        ("Event Streaming (Kafka, RabbitMQ)", ["kafka", "rabbitmq"]),
    ]

    for cat_name, skill_set in cat_mapping:
        matched = [s for s in skill_set if s in candidate_skills]
        if not candidate_skills:
            score = 0
            lvl = "Needs Work"
            verified = False
        else:
            ratio = len(matched) / len(skill_set)
            score = min(96, max(30, round(ratio * 100)))
            lvl = "Expert" if score >= 90 else "Advanced" if score >= 80 else "Intermediate"
            verified = len(matched) > 0

        category_proficiency.append({
            "name": cat_name,
            "score": score,
            "level": lvl,
            "verified": verified,
        })

    # 5. Prioritized Missing Skills (Gaps)
    missing_skills_list = []
    # Identify skills in market demand that candidate doesn't have
    for skill_norm, count in sorted(market_skill_counts.items(), key=lambda x: x[1], reverse=True):
        if skill_norm not in candidate_skills:
            prevalence = count / total_jobs
            priority = "High" if prevalence >= 0.4 else "Medium" if prevalence >= 0.2 else "Low"
            companies = list(market_skill_companies.get(skill_norm, []))[:3]
            company_str = ", ".join(companies) if companies else "Target Tech Employers"

            mod_info = SKILL_MODULE_MAP.get(skill_norm, {
                "moduleTitle": f"{get_display_name(skill_norm)} Essentials",
                "category": "General Engineering",
                "estHours": "2.5 hrs",
                "rationale": f"Identified in market requirements across {company_str}.",
            })

            missing_skills_list.append({
                "id": f"gap-{skill_norm}",
                "skill": get_display_name(skill_norm),
                "category": mod_info.get("category", "Engineering"),
                "priority": priority,
                "requiredBy": company_str,
                "estHours": mod_info.get("estHours", "3.0 hrs"),
                "moduleTitle": mod_info.get("moduleTitle", "Module"),
                "moduleSlug": mod_info.get("moduleSlug", "/learning"),
                "rationale": mod_info.get("rationale", "Essential requirement for target applications."),
            })

    # Limit to top 6 actionable gaps
    missing_skills_list = missing_skills_list[:6]

    # 6. Overall KPI Summary
    avg_alignment = round(sum(dim_scores) / len(dim_scores)) if dim_scores else 0
    critical_gaps_count = sum(1 for g in missing_skills_list if g["priority"] == "High")

    summary = {
        "totalProfileSkills": len(candidate_skills),
        "marketAlignment": avg_alignment,
        "criticalGaps": len(missing_skills_list),
        "remediationModules": len(missing_skills_list),
    }

    message = None
    if not candidate_skills:
        message = "No active resume or profile skills found. Please upload a resume or add skills to your profile to calculate your real competency roadmap."

    return {
        "summary": summary,
        "radarData": radar_data,
        "categoryProficiency": category_proficiency,
        "currentSkills": detailed_skills,
        "missingSkills": missing_skills_list,
        "targetTrack": target_track or "distributed",
        "hasActiveResume": has_active_resume,
        "hasProfileSkills": len(candidate_skills) > 0,
        "message": message,
    }
