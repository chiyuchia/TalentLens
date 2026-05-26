from flask import Blueprint, request

from ..extensions import db
from ..models import Candidate, JobDescription, ScoreResult
from ..security import require_auth
from ..utils.responses import error_response, ok_response
from .uploads import make_ai_service
from ..utils.serializers import (
    serialize_candidate_detail,
    serialize_job,
    serialize_profile,
    serialize_score,
)

scores_bp = Blueprint("scores", __name__)


@scores_bp.get("")
@require_auth
def list_scores():
    candidate_id = request.args.get("candidate_id", type=int)
    job_id = request.args.get("job_id", type=int)
    query = ScoreResult.query
    if candidate_id:
        query = query.filter_by(candidate_id=candidate_id)
    if job_id:
        query = query.filter_by(job_id=job_id)
    scores = query.order_by(ScoreResult.updated_at.desc()).all()
    return ok_response({"items": [serialize_score(score) for score in scores]})


@scores_bp.post("")
@require_auth
def create_score():
    payload = request.get_json(silent=True) or {}
    candidate_id = payload.get("candidate_id")
    job_ids = payload.get("job_ids") or payload.get("job_id")
    if isinstance(job_ids, int):
        job_ids = [job_ids]
    if not candidate_id or not isinstance(job_ids, list) or not job_ids:
        return error_response("VALIDATION_ERROR", "请提供候选人 ID 和至少一个岗位 ID。", status=400)

    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    jobs = JobDescription.query.filter(JobDescription.id.in_(job_ids)).all()
    if len(jobs) != len(set(job_ids)):
        return error_response("NOT_FOUND", "岗位不存在。", status=404)

    ai = make_ai_service()
    profile_payload = serialize_profile(candidate.profile)
    results = []

    for job in jobs:
        score_payload = ai.score_candidate(profile_payload, serialize_job(job))
        score = ScoreResult.query.filter_by(candidate_id=candidate.id, job_id=job.id).first()
        if not score:
            score = ScoreResult(candidate_id=candidate.id, job_id=job.id)
            db.session.add(score)
        score.total_score = clamp_score(score_payload.get("total_score"))
        score.skill_score = clamp_score(score_payload.get("skill_score"))
        score.experience_score = clamp_score(score_payload.get("experience_score"))
        score.education_score = clamp_score(score_payload.get("education_score"))
        score.ai_comment = str(score_payload.get("ai_comment") or "")
        score.details = (
            score_payload.get("details")
            if isinstance(score_payload.get("details"), dict)
            else {}
        )
        results.append(score)

    db.session.commit()
    return ok_response(
        {
            "candidate": serialize_candidate_detail(candidate),
            "items": [serialize_score(score) for score in results],
        },
        status=201,
    )


def clamp_score(value) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError):
        numeric = 0
    return max(0, min(100, numeric))
