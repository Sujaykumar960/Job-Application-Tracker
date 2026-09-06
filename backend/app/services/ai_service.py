import io
import json
import logging
import re
from typing import Any, Dict, List, Optional
from fastapi import HTTPException, status
import httpx
from pypdf import PdfReader
import docx

from app.config import settings
from app.schemas.resume import (
    AtsBreakdown,
    BulletImprovementItem,
    MissingKeywordItem,
    PillarMetricItem,
    ResumeAnalysisResult,
)

logger = logging.getLogger("careerx.ai_service")


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    """Extract clean plain text from PDF, DOCX, or text file bytes."""
    lower_name = filename.lower()
    text = ""

    if lower_name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
        except Exception as e:
            logger.warning("PDF extraction failed with pypdf: %s", e)

    elif lower_name.endswith((".docx", ".doc")):
        try:
            doc = docx.Document(io.BytesIO(content))
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text += paragraph.text + "\n"
            for table in doc.tables:
                for row in table.rows:
                    row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                    if row_text:
                        text += row_text + "\n"
        except Exception as e:
            logger.warning("DOCX extraction failed with python-docx: %s", e)

    if not text.strip():
        # Fallback: try raw decoding
        try:
            text = content.decode("utf-8", errors="ignore")
        except Exception:
            text = content.decode("latin-1", errors="ignore")

    # Clean redundant whitespace
    text = re.sub(r"\n\s*\n+", "\n\n", text).strip()
    return text


class AiService:
    # Ordered list of Groq model fallbacks (most capable first).
    # The configured GROQ_MODEL from settings is always tried first.
    _DEFAULT_MODEL_CANDIDATES: List[str] = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
        "llama3-8b-8192",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
        "deepseek-r1-distill-llama-70b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "groq/compound",
    ]

    @classmethod
    def _build_models_to_try(cls, custom_preferred: Optional[str] = None) -> List[str]:
        """Build a de-duplicated, ordered list of models to attempt.

        Priority: custom_preferred → settings.GROQ_MODEL → _DEFAULT_MODEL_CANDIDATES.
        """
        preferred: List[str] = []
        if custom_preferred and custom_preferred.strip():
            preferred.append(custom_preferred.strip())
        if settings.GROQ_MODEL and settings.GROQ_MODEL not in preferred:
            preferred.append(settings.GROQ_MODEL)

        models_to_try: List[str] = []
        for m in preferred + cls._DEFAULT_MODEL_CANDIDATES:
            if m and m not in models_to_try:
                models_to_try.append(m)
        return models_to_try

    @staticmethod
    def get_api_key(custom_key: Optional[str] = None) -> Optional[str]:
        """Get the active Groq API key from request, environment, or settings."""
        if custom_key and custom_key.strip():
            return custom_key.strip()
        if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
            return settings.GROQ_API_KEY.strip()
        return None

    @classmethod
    async def analyze_resume_with_groq(
        cls,
        resume_text: str,
        job_description: Optional[str] = None,
        custom_key: Optional[str] = None,
    ) -> ResumeAnalysisResult:
        """Call Groq API (Llama 3.3 / GPT-OSS) to evaluate real candidate ATS score and structured breakdown."""
        api_key = cls.get_api_key(custom_key)

        if not api_key:
            logger.warning("No Groq API key configured. AI analysis cannot proceed without credentials.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI analysis is temporarily unavailable. Groq API credentials are not configured.",
            )

        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) Evaluation Engine and Principal Technical Recruiter. "
            "Analyze the provided candidate resume text with rigorous algorithmic standards. "
            "Extract and evaluate real, specific content directly from this candidate's resume for EVERY single field. "
            "Do not return generic placeholders. "
            "You must return ONLY a valid JSON object strictly matching this schema:\n"
            "{\n"
            '  "atsScore": <integer between 50 and 99>,\n'
            '  "targetRole": "<inferred primary title based on resume, e.g. Senior Backend Engineer>",\n'
            '  "percentile": <integer between 50 and 99>,\n'
            '  "atsBreakdown": {\n'
            '    "overallScore": <integer>,\n'
            '    "keywordsScore": <integer between 50 and 99>,\n'
            '    "impactScore": <integer between 50 and 99>,\n'
            '    "formattingScore": <integer between 70 and 99>,\n'
            '    "completenessScore": <integer between 70 and 99>\n'
            '  },\n'
            '  "pillars": [\n'
            '    {"title": "Keywords & Hard Skills", "weight": "35% weight", "score": <int>, "status": "<optimal|good|warning|critical>", "summary": "<1 sentence diagnostic specific to this candidate>"},\n'
            '    {"title": "Impact & Metrics", "weight": "30% weight", "score": <int>, "status": "<optimal|good|warning|critical>", "summary": "<1 sentence diagnostic specific to this candidate>"},\n'
            '    {"title": "Formatting & Readability", "weight": "20% weight", "score": <int>, "status": "<optimal|good|warning|critical>", "summary": "<1 sentence diagnostic specific to this candidate>"},\n'
            '    {"title": "Section Completeness", "weight": "15% weight", "score": <int>, "status": "<optimal|good|warning|critical>", "summary": "<1 sentence diagnostic specific to this candidate>"}\n'
            '  ],\n'
            '  "strengths": ["<detailed specific strength 1 from resume>", "<strength 2>", "<strength 3>", "<strength 4>"],\n'
            '  "weaknesses": ["<detailed specific area for improvement 1 from resume>", "<weakness 2>", "<weakness 3>"],\n'
            '  "optimizationAreas": ["<actionable optimization area 1>", "<optimization area 2>", "<optimization area 3>"],\n'
            '  "missingKeywords": [\n'
            '    {"name": "<missing technical keyword 1>", "priority": "High", "category": "<Category e.g. Cloud Infrastructure>"},\n'
            '    {"name": "<missing technical keyword 2>", "priority": "High", "category": "<Category e.g. Observability>"},\n'
            '    {"name": "<missing technical keyword 3>", "priority": "Medium", "category": "<Category e.g. System Design>"},\n'
            '    {"name": "<missing technical keyword 4>", "priority": "Medium", "category": "<Category e.g. Testing & CI/CD>"}\n'
            '  ],\n'
            '  "extractedSkills": {\n'
            '    "Languages": ["<extracted directly from resume>"],\n'
            '    "Frameworks & Runtimes": ["<extracted directly from resume>"],\n'
            '    "Databases & Storage": ["<extracted directly from resume>"],\n'
            '    "DevOps & Cloud": ["<extracted directly from resume>"],\n'
            '    "Architecture & Tools": ["<extracted directly from resume>"]\n'
            '  },\n'
            '  "bulletImprovements": [\n'
            '    {\n'
            '      "id": "b-1",\n'
            '      "section": "<Section Name e.g. Work Experience>",\n'
            '      "original": "<An actual unquantified bullet directly from this candidate resume>",\n'
            '      "optimized": "<The same bullet rewritten using STAR framework with action verbs and quantifiable metrics like throughput, RPS, latency, revenue, or cost savings>",\n'
            '      "rationale": "<Why this rewritten bullet scores significantly higher with hiring managers and ATS>",\n'
            '      "scoreImpact": "+4% Impact Score"\n'
            '    },\n'
            '    {\n'
            '      "id": "b-2",\n'
            '      "section": "<Section Name e.g. Previous Experience>",\n'
            '      "original": "<Another actual bullet directly from this candidate resume>",\n'
            '      "optimized": "<The same bullet rewritten with quantifiable STAR metrics>",\n'
            '      "rationale": "<Why this rewritten bullet scores higher>",\n'
            '      "scoreImpact": "+3% Impact Score"\n'
            '    }\n'
            '  ],\n'
            '  "projects": [\n'
            '    {\n'
            '      "name": "<Project name extracted from resume>",\n'
            '      "status": "Passed",\n'
            '      "detail": "<Specific evaluation of this project architecture, tech stack, and impact>",\n'
            '      "technologies": ["<tech 1>", "<tech 2>"]\n'
            '    }\n'
            '  ],\n'
            '  "education": [\n'
            '    {\n'
            '      "degree": "<Degree / Certification name extracted from resume>",\n'
            '      "institution": "<School / Issuer extracted from resume>",\n'
            '      "status": "Verified",\n'
            '      "detail": "<Graduation year / accreditation status verified>"\n'
            '    }\n'
            '  ],\n'
            '  "formattingRecommendations": [\n'
            '    "<Specific formatting & structural recommendation tailored to this resume>",\n'
            '    "<Formatting recommendation 2>"\n'
            '  ],\n'
            '  "skillGaps": ["<specific skill gap 1>", "<specific skill gap 2>"],\n'
            '  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"]\n'
            "}"
        )

        user_content = f"### CANDIDATE RESUME TEXT:\n\n{resume_text[:12000]}\n\n"
        if job_description:
            user_content += f"### TARGET JOB DESCRIPTION:\n\n{job_description[:4000]}\n\n"
        user_content += "Perform full ATS scoring and return valid JSON matching the schema."

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        models_to_try = cls._build_models_to_try()

        async with httpx.AsyncClient(timeout=45.0) as client:
            last_err = None
            for model_name in models_to_try:
                try:
                    payload = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        "response_format": {"type": "json_object"},
                        "temperature": 0.2,
                        "max_tokens": 4096,
                    }
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload,
                    )

                    if response.status_code == 200:
                        data = response.json()
                        raw_content = data["choices"][0]["message"]["content"]
                        parsed_json = json.loads(raw_content)

                        # Clean and format response
                        return cls._format_analysis_response(parsed_json, resume_text, is_ai=True)
                    else:
                        logger.warning(
                            "Groq API returned HTTP %s for model %s: %s",
                            response.status_code,
                            model_name,
                            response.text,
                        )
                        last_err = response.text
                except Exception as e:
                    logger.warning("Error invoking Groq model %s: %s", model_name, e)
                    last_err = str(e)

        logger.error("All Groq model invocations failed: %s. Raising 503 unavailable.", last_err)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI analysis is temporarily unavailable. Please try again. ({last_err or 'Service unavailable'})",
        )

    @classmethod
    def _format_analysis_response(
        cls,
        parsed_json: Dict[str, Any],
        resume_text: str,
        is_ai: bool = True,
    ) -> ResumeAnalysisResult:
        """Sanitize and construct standard ResumeAnalysisResult object from real AI extraction."""
        ats_score = int(parsed_json.get("atsScore", 80))
        breakdown_data = parsed_json.get("atsBreakdown", {})
        ats_breakdown = AtsBreakdown(
            overallScore=int(breakdown_data.get("overallScore", ats_score)),
            keywordsScore=int(breakdown_data.get("keywordsScore", ats_score)),
            impactScore=int(breakdown_data.get("impactScore", ats_score)),
            formattingScore=int(breakdown_data.get("formattingScore", 85)),
            completenessScore=int(breakdown_data.get("completenessScore", 85)),
        )

        raw_pillars = parsed_json.get("pillars", [])
        pillars = []
        for p in raw_pillars:
            if isinstance(p, dict):
                pillars.append(
                    PillarMetricItem(
                        title=str(p.get("title", "Metric")),
                        weight=str(p.get("weight", "25% weight")),
                        score=int(p.get("score", ats_score)),
                        status=str(p.get("status", "good")),
                        summary=str(p.get("summary", "")),
                    )
                )

        if not pillars:
            pillars = [
                PillarMetricItem(
                    title="Keywords & Hard Skills",
                    weight="35% weight",
                    score=ats_breakdown.keywordsScore,
                    status="optimal" if ats_breakdown.keywordsScore >= 85 else "good",
                    summary="Keyword match evaluation against target role requirements.",
                ),
                PillarMetricItem(
                    title="Impact & Metrics",
                    weight="30% weight",
                    score=ats_breakdown.impactScore,
                    status="optimal" if ats_breakdown.impactScore >= 85 else "good",
                    summary="Quantifiable metrics and achievements parsed from experience.",
                ),
                PillarMetricItem(
                    title="Formatting & Readability",
                    weight="20% weight",
                    score=ats_breakdown.formattingScore,
                    status="optimal" if ats_breakdown.formattingScore >= 85 else "good",
                    summary="Layout structure and section hierarchy evaluated.",
                ),
                PillarMetricItem(
                    title="Section Completeness",
                    weight="15% weight",
                    score=ats_breakdown.completenessScore,
                    status="optimal" if ats_breakdown.completenessScore >= 85 else "good",
                    summary="Completeness of contact, experience, skills, and background sections.",
                ),
            ]

        raw_bullets = parsed_json.get("bulletImprovements", [])
        bullet_improvements = []
        for idx, b in enumerate(raw_bullets):
            if isinstance(b, dict):
                bullet_improvements.append(
                    BulletImprovementItem(
                        id=f"b-{idx + 1}",
                        section=str(b.get("section", "Experience")),
                        original=str(b.get("original", "")),
                        optimized=str(b.get("optimized", "")),
                        rationale=str(b.get("rationale", "")),
                        scoreImpact=str(b.get("scoreImpact", "+3% ATS Match")),
                    )
                )

        target_role = str(parsed_json.get("targetRole") or parsed_json.get("targetProfile") or "Candidate Profile")
        weaknesses_list = [str(w) for w in parsed_json.get("weaknesses", []) if isinstance(w, str)]
        skill_gaps_list = [str(g) for g in parsed_json.get("skillGaps", []) if isinstance(g, str)]
        recs_list = [str(r) for r in (parsed_json.get("formattingRecommendations") or parsed_json.get("recommendations", [])) if isinstance(r, str)]
        missing_kw_list = parsed_json.get("missingKeywords", [])
        extracted_skills_dict = parsed_json.get("extractedSkills", {})

        # Parse projects - return empty list if not present, never fabricate fake projects
        projects_data = parsed_json.get("projects", [])
        if not isinstance(projects_data, list):
            projects_data = []

        # Parse education - return empty list if not present, never fabricate fake education
        education_data = parsed_json.get("education", [])
        if not isinstance(education_data, list):
            education_data = []

        hard_skills_flat: List[str] = []
        if isinstance(extracted_skills_dict, dict):
            for s_list in extracted_skills_dict.values():
                if isinstance(s_list, list):
                    hard_skills_flat.extend([str(s) for s in s_list])

        return ResumeAnalysisResult(
            atsScore=ats_score,
            targetRole=target_role,
            targetProfile=target_role,
            percentile=int(parsed_json.get("percentile", max(50, ats_score - 2))),
            atsBreakdown=ats_breakdown,
            pillars=pillars,
            strengths=[str(s) for s in parsed_json.get("strengths", []) if isinstance(s, str)],
            weaknesses=weaknesses_list,
            optimizationAreas=[str(o) for o in (parsed_json.get("optimizationAreas") or (weaknesses_list + skill_gaps_list)) if isinstance(o, str)],
            missingKeywords=missing_kw_list,
            keywords=missing_kw_list,
            hardSkills=hard_skills_flat,
            extractedSkills=extracted_skills_dict if isinstance(extracted_skills_dict, dict) else {},
            bulletImprovements=bullet_improvements,
            experienceRewrites=bullet_improvements,
            projects=projects_data,
            education=education_data,
            formattingRecommendations=recs_list,
            skillGaps=skill_gaps_list,
            recommendations=recs_list,
            rawTextSnippet=resume_text[:400] if resume_text else None,
            isAiGenerated=is_ai,
        )

    @classmethod
    async def call_groq_chat(
        cls,
        prompt: str,
        system_prompt: str = "You are an expert AI assistant. Provide high quality, concise responses.",
        is_json: bool = False,
        custom_key: Optional[str] = None,
        max_tokens: int = 3000,
        temperature: float = 0.3,
    ) -> str:
        """Generic helper to execute chat completions with Groq LLM across fallbacks."""
        api_key = cls.get_api_key(custom_key)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Groq API key not configured.",
            )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        models_to_try = cls._build_models_to_try()

        async with httpx.AsyncClient(timeout=45.0) as client:
            last_err = None
            for model_name in models_to_try:
                try:
                    payload: Dict[str, Any] = {
                        "model": model_name,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    }
                    if is_json:
                        payload["response_format"] = {"type": "json_object"}

                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    if response.status_code == 200:
                        return response.json()["choices"][0]["message"]["content"]
                    else:
                        last_err = response.text
                except Exception as e:
                    last_err = str(e)

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Groq invocation failed: {last_err or 'Service error'}",
        )

    @classmethod
    async def generate_companies_with_groq(
        cls,
        industry: Optional[str] = None,
        query: Optional[str] = None,
        company_name: Optional[str] = None,
        count: int = 3,
        custom_key: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch and synthesize real-world company dossiers and jobs using Groq LLM."""
        target_description = "top tier engineering companies"
        if company_name and company_name.strip():
            target_description = f"the company '{company_name.strip()}' (provide real accurate company details, actual production tech stack, engineering culture, and live-like open engineering roles)"
            count = 1
        elif query and query.strip():
            target_description = f"{count} companies matching query '{query.strip()}' or specialized in that domain"
        elif industry and industry.strip() and industry.lower() != "all":
            target_description = f"{count} leading companies in the '{industry.strip()}' domain"

        system_prompt = (
            "You are a Principal Technology Industry Analyst and Talent Intelligence Engine. "
            "You synthesize highly accurate, real-world engineering dossiers for top technology companies. "
            "You must return ONLY a valid JSON object strictly matching this schema:\n"
            "{\n"
            '  "companies": [\n'
            "    {\n"
            '      "name": "<Real Company Name>",\n'
            '      "tagline": "<Real engineering/product tagline>",\n'
            '      "industry": "<e.g. Fintech, Developer Tools, AI Infrastructure, Cloud Platform, Cyber Security>",\n'
            '      "size": "<e.g. 500-1,000 employees>",\n'
            '      "headquarters": "<e.g. San Francisco, CA (Remote-Friendly)>",\n'
            '      "foundedYear": "<e.g. 2018>",\n'
            '      "fundingStage": "<e.g. Public / Series D / Profitable>",\n'
            '      "websiteUrl": "<e.g. https://company.com>",\n'
            '      "about": "<2-3 sentences about core technical challenge and scale>",\n'
            '      "mission": "<1 concise engineering mission statement>",\n'
            '      "techStack": ["<Tech 1>", "<Tech 2>", "<Tech 3>", "<Tech 4>", "<Tech 5>", "<Tech 6>"],\n'
            '      "benefits": ["<Benefit 1>", "<Benefit 2>", "<Benefit 3>", "<Benefit 4>"],\n'
            '      "openJobs": [\n'
            "        {\n"
            '          "title": "<Specific Role Title e.g. Senior Backend Engineer - High Throughput>",\n'
            '          "department": "<Department e.g. Core Infrastructure>",\n'
            '          "location": "<Location e.g. Remote (US) or San Francisco, CA>",\n'
            '          "workType": "<Remote | Hybrid | On-site>",\n'
            '          "experienceLevel": "<Senior | Staff | Mid-Level>",\n'
            '          "salaryRange": "<e.g. $170,000 - $230,000>",\n'
            '          "description": "<2 sentences about technical responsibilities, architecture, and impact>",\n'
            '          "skills": ["<Skill 1>", "<Skill 2>", "<Skill 3>", "<Skill 4>", "<Skill 5>"]\n'
            "        }\n"
            "      ],\n"
            '      "posts": [\n'
            "        {\n"
            '          "title": "<Recent engineering blog post title>",\n'
            '          "date": "<e.g. Aug 2026>",\n'
            '          "content": "<Summary of technical architectural decision>",\n'
            '          "author": "<Staff Engineer / VP Engineering>",\n'
            '          "authorRole": "<Role>",\n'
            '          "likesCount": <int>\n'
            "        }\n"
            "      ],\n"
            '      "employees": [\n'
            "        {\n"
            '          "name": "<Representative Recruiter / Tech Lead>",\n'
            '          "role": "<e.g. Staff Technical Recruiter / Eng Lead>",\n'
            '          "avatarInitials": "<2 letters>"\n'
            "        }\n"
            "      ]\n"
            "    }\n"
            "  ]\n"
            "}"
        )

        user_prompt = f"Synthesize real accurate technical dossiers and open engineering jobs for: {target_description}. Provide real production technologies and realistic salary bands."

        raw_json = await cls.call_groq_chat(
            prompt=user_prompt,
            system_prompt=system_prompt,
            is_json=True,
            custom_key=custom_key,
            max_tokens=4000,
        )

        try:
            parsed = json.loads(raw_json)
            raw_list = parsed.get("companies", []) if isinstance(parsed, dict) else (parsed if isinstance(parsed, list) else [])
        except Exception as e:
            logger.warning("Failed to parse Groq companies JSON: %s. Raw: %s", e, raw_json[:300])
            raw_list = []

        formatted: List[Dict[str, Any]] = []
        palette = [
            "from-purple-600 to-indigo-600",
            "from-blue-600 to-cyan-600",
            "from-emerald-600 to-teal-600",
            "from-amber-600 to-orange-600",
            "from-rose-600 to-pink-600",
        ]

        import uuid
        for idx, comp in enumerate(raw_list):
            if not isinstance(comp, dict) or not comp.get("name"):
                continue
            name = str(comp.get("name", "Company")).strip()
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or f"comp-{uuid.uuid4().hex[:6]}"
            comp_id = f"comp-{slug}"

            # Format initials
            words = name.split()
            initials = (words[0][0] + (words[1][0] if len(words) > 1 else words[0][1:2])).upper() if name else "CX"
            gradient = palette[idx % len(palette)]

            # Format jobs
            formatted_jobs = []
            for j_idx, job in enumerate(comp.get("openJobs", [])):
                if not isinstance(job, dict):
                    continue
                j_title = str(job.get("title", "Software Engineer"))
                j_id = f"job-{slug}-{j_idx + 1}"
                j_skills = job.get("skills", ["Python", "TypeScript", "React"])
                if isinstance(j_skills, list):
                    skill_objs = [{"id": f"s-{i}", "name": str(s), "isMatched": True} for i, s in enumerate(j_skills)]
                else:
                    skill_objs = [{"id": "s-1", "name": "Software Engineering", "isMatched": True}]

                formatted_jobs.append({
                    "id": j_id,
                    "companyId": comp_id,
                    "company": name,
                    "companyName": name,
                    "companyLogo": initials,
                    "companyColor": gradient,
                    "title": j_title,
                    "department": str(job.get("department", "Engineering")),
                    "location": str(job.get("location", "Remote")),
                    "workType": str(job.get("workType", "Remote")),
                    "experienceLevel": str(job.get("experienceLevel", "Senior")),
                    "experience": str(job.get("experienceLevel", "Senior")),
                    "roleCategory": "Software Engineering",
                    "salaryRange": str(job.get("salaryRange", "$160,000 - $220,000")),
                    "postedDate": str(job.get("postedDate", "Recently")),
                    "description": str(job.get("description", f"Lead engineering initiatives at {name}.")),
                    "matchScore": 88 + (j_idx % 8),
                    "skills": skill_objs,
                    "applicantsCount": 12 + j_idx * 4,
                    "isActive": True,
                })

            # Format posts
            formatted_posts = []
            for p_idx, post in enumerate(comp.get("posts", [])):
                if isinstance(post, dict):
                    formatted_posts.append({
                        "id": f"post-{slug}-{p_idx + 1}",
                        "title": str(post.get("title", f"Scaling Architecture at {name}")),
                        "date": str(post.get("date", "Recent")),
                        "content": str(post.get("content", "")),
                        "author": str(post.get("author", "Engineering Lead")),
                        "authorRole": str(post.get("authorRole", "Senior Staff Engineer")),
                        "likesCount": int(post.get("likesCount", 120)),
                    })

            # Format employees
            formatted_employees = []
            for e_idx, emp in enumerate(comp.get("employees", [])):
                if isinstance(emp, dict):
                    e_name = str(emp.get("name", "Recruiter"))
                    e_initials = "".join([w[0] for w in e_name.split()[:2]]).upper() or "CX"
                    formatted_employees.append({
                        "id": f"emp-{slug}-{e_idx + 1}",
                        "name": e_name,
                        "role": str(emp.get("role", "Technical Recruiter")),
                        "avatarInitials": e_initials,
                        "avatarGradient": palette[(e_idx + 2) % len(palette)],
                        "isConnected": False,
                    })

            formatted.append({
                "id": comp_id,
                "slug": slug,
                "name": name,
                "tagline": str(comp.get("tagline", f"Next-generation platform by {name}")),
                "logoInitials": initials,
                "logoGradient": gradient,
                "industry": str(comp.get("industry", industry or "Technology")),
                "size": str(comp.get("size", "500-1,000 employees")),
                "headquarters": str(comp.get("headquarters", "San Francisco, CA")),
                "foundedYear": str(comp.get("foundedYear", "2019")),
                "founded": str(comp.get("foundedYear", "2019")),
                "fundingStage": str(comp.get("fundingStage", "Growth")),
                "funding": str(comp.get("fundingStage", "Growth")),
                "websiteUrl": str(comp.get("websiteUrl", f"https://{slug}.com")),
                "website": str(comp.get("websiteUrl", f"https://{slug}.com")),
                "about": str(comp.get("about", f"{name} builds industry-leading platforms and tools.")),
                "mission": str(comp.get("mission", f"Empowering developers worldwide at {name}.")),
                "techStack": [str(t) for t in comp.get("techStack", []) if isinstance(t, str)],
                "benefits": [str(b) for b in comp.get("benefits", []) if isinstance(b, str)],
                "openJobsCount": len(formatted_jobs),
                "followersCount": 1400 + idx * 300,
                "isFollowing": False,
                "isAiGenerated": True,
                "employees": formatted_employees,
                "posts": formatted_posts,
                "jobs": formatted_jobs,
            })

        return formatted

