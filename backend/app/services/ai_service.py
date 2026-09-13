import json
import logging
from typing import Any, Dict, Optional
from fastapi import HTTPException, status
from groq import AsyncGroq, GroqError

from app.config import settings
from app.schemas.resume import (
    AtsBreakdown,
    BulletImprovement,
    FormattingCheck,
    MissingKeyword,
    PillarMetric,
    ResumeAnalysisResult,
)
from app.utils.helpers import utc_now_iso

logger = logging.getLogger("careerx.ai_service")

RESUME_ATS_SYSTEM_PROMPT = """You are an elite enterprise Applicant Tracking System (ATS) screening algorithm and Senior Technical Recruiter diagnostic engine.
Your task is to analyze an actual candidate's resume text (and optional target job description) with 100% factual accuracy and zero hallucination.

### CRITICAL ANTI-HALLUCINATION & INTEGRITY RULES:
1. TRUTH PRESERVATION: NEVER invent, extrapolate, or fabricate any experience, company, project, education degree, graduation date, certification, metric, or skill that does not explicitly exist in the candidate's resume text.
2. STAR BULLET OPTIMIZATIONS: When recommending rewritten bullet points, improve the sentence structure, action verbs, and active framing using the STAR method (Situation, Task, Action, Result). DO NOT invent fictional numbers (e.g. do not invent "$10M in revenue" or "reduced latency by 99%" unless present in the resume). If metrics are missing, use placeholders like "[X]% improvement" or instruct the candidate where to add their real metrics.
3. SKILL EXTRACTION: Only list skills that appear or are clearly demonstrated in the resume text. Group them by category.
4. MISSING KEYWORDS: If a Job Description is provided, extract keywords that appear in the Job Description but are ABSENT from the resume text. If no Job Description is provided, identify industry-standard keywords for the candidate's actual target role that are missing from their resume.
5. ATS SCORING: Calculate an authentic, holistic score between 0 and 100 based on standard enterprise screening rubrics:
   - Keywords & Hard Skills (35% weight)
   - Impact & Quantifiable Results (30% weight)
   - Formatting & Section Parseability (20% weight)
   - Section Completeness & Contact Info (15% weight)
6. PILLARS & BREAKDOWN: Provide realistic scores (0-100) and concise summaries for each of the 4 pillars.

### OUTPUT SPECIFICATION:
You MUST respond with a single, strictly valid JSON object matching this schema exactly:
{
  "atsScore": <integer 0-100>,
  "atsBreakdown": {
    "overallScore": <integer 0-100>,
    "keywordsScore": <integer 0-100>,
    "impactScore": <integer 0-100>,
    "formattingScore": <integer 0-100>,
    "completenessScore": <integer 0-100>
  },
  "pillars": [
    {
      "title": "Keywords & Hard Skills",
      "weight": "35% weight",
      "score": <integer 0-100>,
      "status": "optimal" | "good" | "needs_work",
      "summary": "<one clear sentence explaining keyword evaluation>"
    },
    {
      "title": "Impact & Metrics",
      "weight": "30% weight",
      "score": <integer 0-100>,
      "status": "optimal" | "good" | "needs_work",
      "summary": "<one clear sentence explaining quantified metrics>"
    },
    {
      "title": "Formatting & Readability",
      "weight": "20% weight",
      "score": <integer 0-100>,
      "status": "optimal" | "good" | "needs_work",
      "summary": "<one clear sentence explaining layout/structure parseability>"
    },
    {
      "title": "Section Completeness",
      "weight": "15% weight",
      "score": <integer 0-100>,
      "status": "optimal" | "good" | "needs_work",
      "summary": "<one clear sentence explaining completeness of standard sections>"
    }
  ],
  "strengths": ["<strength 1 based on actual resume>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<specific weakness or gap 1>", "<weakness 2>", "<weakness 3>"],
  "missingKeywords": [
    { "name": "<keyword>", "priority": "High" | "Medium" | "Low", "category": "<taxonomy category>" }
  ],
  "extractedSkills": {
    "Languages": ["..."],
    "Frameworks & Runtimes": ["..."],
    "Databases & Storage": ["..."],
    "DevOps & Cloud": ["..."],
    "Architecture": ["..."]
  },
  "bulletImprovements": [
    {
      "id": "b-1",
      "section": "<Section Name • Company or Project>",
      "original": "<original bullet verbatim from resume>",
      "optimized": "<rewritten bullet with STAR impact without inventing facts>",
      "rationale": "<explanation of enhancement>",
      "scoreImpact": "+3% Impact Score"
    }
  ],
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>"],
  "formattingRecommendations": ["<formatting improvement 1>", "<formatting improvement 2>"],
  "percentile": <integer 1-99>,
  "targetProfile": "<demonstrated engineering specialization>",
  "targetRole": "<target technical role>",
  "keywords": ["<core keyword 1>", "<core keyword 2>"],
  "hardSkills": ["<technical hard skill 1>", "<technical hard skill 2>"],
  "optimizationAreas": ["<high impact growth area 1>", "<area 2>"],
  "experienceRewrites": [
    {
      "id": "rew-1",
      "role": "<Role Title>",
      "original": "<original bullet>",
      "rewritten": "<STAR enhanced bullet>",
      "impact": "<impact statement>"
    }
  ],
  "formattingHealth": [
    { "label": "Single-Column Linear Hierarchy", "status": "Passed" | "Warning", "detail": "<brief detail>" },
    { "label": "Standard Section Headings", "status": "Passed" | "Warning", "detail": "<brief detail>" },
    { "label": "Parseable Contact Information", "status": "Passed" | "Warning", "detail": "<brief detail>" },
    { "label": "Bullet Point Density & Length", "status": "Passed" | "Warning", "detail": "<brief detail>" }
  ]
}
"""


class ResumeAiService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL or "llama-3.3-70b-versatile"

    def _get_client(self) -> AsyncGroq:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI analysis service is unavailable: GROQ_API_KEY is not configured on the server.",
            )
        return AsyncGroq(api_key=self.api_key)

    async def analyze_resume(
        self,
        resume_text: str,
        job_description: Optional[str] = None,
    ) -> ResumeAnalysisResult:
        """Executes real ATS evaluation against actual resume text via Groq AI.
        
        Raises:
            HTTPException 400 if resume text is blank.
            HTTPException 503 if Groq service is unavailable, timed out, or rate-limited.
            HTTPException 502 if Groq returns unparseable or invalid JSON structure.
        """
        if not resume_text or len(resume_text.strip()) < 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot analyze resume: extracted resume text is empty or insufficient.",
            )

        client = self._get_client()

        # Sanitize and bound input text size to prevent Groq HTTP 413 (Request Entity Too Large)
        clean_resume = resume_text.strip()
        if len(clean_resume) > 15000:
            clean_resume = clean_resume[:15000]

        clean_jd = job_description.strip() if job_description else None
        if clean_jd and len(clean_jd) > 4000:
            clean_jd = clean_jd[:4000]

        # Build prompt payload
        user_prompt = f"### CANDIDATE RESUME TEXT:\n\"\"\"\n{clean_resume}\n\"\"\"\n\n"
        if clean_jd:
            user_prompt += f"### TARGET JOB DESCRIPTION:\n\"\"\"\n{clean_jd}\n\"\"\"\n\n"
            user_prompt += "Perform targeted ATS comparison between the candidate's resume and this specific job description."
        else:
            user_prompt += "Perform general technical ATS screening analysis for this candidate's demonstrated career profile."

        try:
            logger.info("Sending resume analysis request to Groq (model=%s)...", self.model)
            response = await client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": RESUME_ATS_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_tokens=2500,
            )
        except GroqError as ge:
            logger.error("Groq API error during resume analysis: %s", ge)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Groq AI service error: {str(ge)}",
            )
        except Exception as e:
            logger.error("Unexpected error contacting Groq API: %s", e)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI analysis service temporarily unavailable: {str(e)}",
            )

        # Parse and validate response
        choice = response.choices[0]
        raw_json_str = choice.message.content or "{}"
        try:
            parsed_data = json.loads(raw_json_str)
        except json.JSONDecodeError as je:
            logger.error("Failed to decode JSON from Groq response: %s", raw_json_str)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI service returned an unparseable response structure.",
            )

        # Attach metadata
        parsed_data["rawResumeText"] = clean_resume[:1000]  # preview snippet
        parsed_data["jobDescription"] = clean_jd
        parsed_data["analyzedAt"] = utc_now_iso()
        parsed_data["modelUsed"] = self.model

        # Ensure all required schema fields are populated
        ats = parsed_data.get("atsScore", 0)
        if "percentile" not in parsed_data or parsed_data["percentile"] is None:
            parsed_data["percentile"] = max(1, min(99, int(ats * 0.95)))
        if not parsed_data.get("targetProfile"):
            parsed_data["targetProfile"] = "Software Engineer"
        if not parsed_data.get("targetRole"):
            parsed_data["targetRole"] = "Software Engineer"
        if not parsed_data.get("keywords"):
            parsed_data["keywords"] = [
                k["name"] if isinstance(k, dict) and "name" in k else str(k)
                for k in parsed_data.get("missingKeywords", [])
            ]
        if not parsed_data.get("hardSkills"):
            h_skills = []
            for _, s_list in (parsed_data.get("extractedSkills") or {}).items():
                if isinstance(s_list, list):
                    h_skills.extend(s_list)
            parsed_data["hardSkills"] = h_skills
        if not parsed_data.get("optimizationAreas"):
            parsed_data["optimizationAreas"] = list(parsed_data.get("weaknesses", []))
        if not parsed_data.get("experienceRewrites"):
            parsed_data["experienceRewrites"] = list(parsed_data.get("bulletImprovements", []))
        if not parsed_data.get("formattingRecommendations"):
            parsed_data["formattingRecommendations"] = list(parsed_data.get("recommendations", []))

        try:
            analysis_result = ResumeAnalysisResult(**parsed_data)
        except Exception as ve:
            logger.error("Validation error converting AI response to ResumeAnalysisResult: %s", ve)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI output failed schema validation: {str(ve)}",
            )

        return analysis_result


_ai_service_instance: Optional[ResumeAiService] = None


def get_resume_ai_service() -> ResumeAiService:
    global _ai_service_instance
    if _ai_service_instance is None:
        _ai_service_instance = ResumeAiService()
    return _ai_service_instance
