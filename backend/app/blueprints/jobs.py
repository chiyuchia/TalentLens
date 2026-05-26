from flask import Blueprint, request

from ..extensions import db
from ..models import JobDescription
from ..security import require_auth
from ..utils.responses import error_response, ok_response
from ..utils.serializers import serialize_job

jobs_bp = Blueprint("jobs", __name__)


@jobs_bp.get("")
@require_auth
def list_jobs():
    jobs = JobDescription.query.order_by(JobDescription.updated_at.desc()).all()
    return ok_response({"items": [serialize_job(job) for job in jobs]})


@jobs_bp.post("")
@require_auth
def create_job():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title") or "").strip()
    description = str(payload.get("description") or "").strip()
    if not title or not description:
        return error_response("VALIDATION_ERROR", "岗位名称和岗位描述不能为空。", status=400)

    job = JobDescription(
        title=title,
        description=description,
        required_skills=ensure_list(payload.get("required_skills")),
        bonus_skills=ensure_list(payload.get("bonus_skills")),
    )
    db.session.add(job)
    db.session.commit()
    return ok_response(serialize_job(job), status=201)


@jobs_bp.patch("/<int:job_id>")
@require_auth
def update_job(job_id: int):
    job = JobDescription.query.get(job_id)
    if not job:
        return error_response("NOT_FOUND", "岗位不存在。", status=404)

    payload = request.get_json(silent=True) or {}
    if "title" in payload:
        job.title = str(payload.get("title") or "").strip()
    if "description" in payload:
        job.description = str(payload.get("description") or "").strip()
    if "required_skills" in payload:
        job.required_skills = ensure_list(payload.get("required_skills"))
    if "bonus_skills" in payload:
        job.bonus_skills = ensure_list(payload.get("bonus_skills"))

    if not job.title or not job.description:
        return error_response("VALIDATION_ERROR", "岗位名称和岗位描述不能为空。", status=400)

    db.session.commit()
    return ok_response(serialize_job(job))


@jobs_bp.delete("/<int:job_id>")
@require_auth
def delete_job(job_id: int):
    job = JobDescription.query.get(job_id)
    if not job:
        return error_response("NOT_FOUND", "岗位不存在。", status=404)

    db.session.delete(job)
    db.session.commit()
    return ok_response({"id": job_id, "deleted": True})


def ensure_list(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []
