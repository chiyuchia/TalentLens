from __future__ import annotations

from datetime import datetime

from ..models import Candidate, JobDescription, ResumeProfile, ScoreResult


def isoformat(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


def serialize_profile(profile: ResumeProfile | None) -> dict:
    if not profile:
        return {
            "name": "",
            "phone": "",
            "email": "",
            "city": "",
            "education": [],
            "work_experience": [],
            "skills": [],
            "projects": [],
        }

    return {
        "name": profile.name or "",
        "phone": profile.phone or "",
        "email": profile.email or "",
        "city": profile.city or "",
        "education": profile.education or [],
        "work_experience": profile.work_experience or [],
        "skills": profile.skills or [],
        "projects": profile.projects or [],
    }


def serialize_score(score: ScoreResult) -> dict:
    return {
        "id": score.id,
        "candidate_id": score.candidate_id,
        "job_id": score.job_id,
        "job_title": score.job.title if score.job else "",
        "total_score": score.total_score,
        "skill_score": score.skill_score,
        "experience_score": score.experience_score,
        "education_score": score.education_score,
        "ai_comment": score.ai_comment,
        "details": score.details or {},
        "created_at": isoformat(score.created_at),
        "updated_at": isoformat(score.updated_at),
    }


def serialize_candidate_summary(candidate: Candidate) -> dict:
    profile = serialize_profile(candidate.profile)
    best_score = max((score.total_score for score in candidate.scores), default=None)
    return {
        "id": candidate.id,
        "upload_batch_id": candidate.upload_batch_id,
        "original_filename": candidate.original_filename,
        "name": profile["name"],
        "email": profile["email"],
        "city": profile["city"],
        "status": candidate.status,
        "parse_status": candidate.parse_status,
        "error_message": candidate.error_message,
        "skills": profile["skills"],
        "total_score": best_score,
        "uploaded_at": isoformat(candidate.created_at),
        "updated_at": isoformat(candidate.updated_at),
    }


def serialize_candidate_detail(candidate: Candidate) -> dict:
    data = serialize_candidate_summary(candidate)
    data.update(
        {
            "raw_text": candidate.raw_text or "",
            "profile": serialize_profile(candidate.profile),
            "scores": [serialize_score(score) for score in candidate.scores],
            "pdf_url": f"/api/candidates/{candidate.id}/pdf",
        }
    )
    return data


def serialize_job(job: JobDescription) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills or [],
        "bonus_skills": job.bonus_skills or [],
        "created_at": isoformat(job.created_at),
        "updated_at": isoformat(job.updated_at),
    }

