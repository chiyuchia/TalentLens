from typing import Any

from flask import Blueprint, request, send_file

from ..constants import CANDIDATE_STATUSES
from ..extensions import db
from ..models import Candidate, ResumeProfile
from ..security import require_auth
from ..utils.paths import resolve_storage_path
from ..utils.responses import error_response, ok_response
from ..utils.serializers import serialize_candidate_detail, serialize_candidate_summary

candidates_bp = Blueprint("candidates", __name__)


@candidates_bp.get("")
@require_auth
def list_candidates():
    q = (request.args.get("q") or "").strip().lower()
    status = (request.args.get("status") or "").strip()
    skill_filters = parse_skill_filters()
    sort = request.args.get("sort") or "-uploaded_at"
    page = max(1, request.args.get("page", default=1, type=int))
    page_size = min(100, max(1, request.args.get("page_size", default=20, type=int)))

    query = Candidate.query
    if status:
        query = query.filter(Candidate.status == status)

    candidates = query.all()

    if q:
        candidates = [candidate for candidate in candidates if matches_query(candidate, q)]
    if skill_filters:
        candidates = [
            candidate for candidate in candidates if has_skills(candidate, skill_filters)
        ]

    candidates = sort_candidates(candidates, sort)
    total = len(candidates)
    start = (page - 1) * page_size
    end = start + page_size

    return ok_response(
        {
            "items": [
                serialize_candidate_summary(candidate) for candidate in candidates[start:end]
            ],
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    )


@candidates_bp.get("/<int:candidate_id>")
@require_auth
def get_candidate(candidate_id: int):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)
    return ok_response(serialize_candidate_detail(candidate))


@candidates_bp.delete("/<int:candidate_id>")
@require_auth
def delete_candidate(candidate_id: int):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    if candidate.profile:
        db.session.delete(candidate.profile)

    db.session.delete(candidate)
    db.session.commit()
    return ok_response({"id": candidate_id, "deleted": True})


@candidates_bp.patch("/<int:candidate_id>/profile")
@require_auth
def update_candidate_profile(candidate_id: int):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    payload = request.get_json(silent=True) or {}
    profile = candidate.profile or ResumeProfile(candidate_id=candidate.id)
    profile.name = str(payload.get("name") or "")
    profile.phone = str(payload.get("phone") or "")
    profile.email = str(payload.get("email") or "")
    profile.city = str(payload.get("city") or "")
    profile.education = ensure_list(payload.get("education"))
    profile.work_experience = ensure_list(payload.get("work_experience"))
    profile.skills = [str(skill) for skill in ensure_list(payload.get("skills"))]
    profile.projects = ensure_list(payload.get("projects"))
    db.session.add(profile)
    db.session.commit()

    return ok_response(serialize_candidate_detail(candidate))


@candidates_bp.patch("/<int:candidate_id>/status")
@require_auth
def update_candidate_status(candidate_id: int):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    payload = request.get_json(silent=True) or {}
    status = str(payload.get("status") or "")
    if status not in CANDIDATE_STATUSES:
        return error_response("INVALID_STATUS", "候选人状态不合法。", status=400)

    candidate.status = status
    db.session.commit()
    return ok_response(serialize_candidate_detail(candidate))


@candidates_bp.post("/compare")
@require_auth
def compare_candidates():
    payload = request.get_json(silent=True) or {}
    ids = payload.get("candidate_ids") or []
    if not isinstance(ids, list) or not 2 <= len(ids) <= 3:
        return error_response("INVALID_COMPARE_SIZE", "请选择 2-3 名候选人进行对比。", status=400)

    candidates = Candidate.query.filter(Candidate.id.in_(ids)).all()
    if len(candidates) != len(set(ids)):
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    order = {candidate_id: index for index, candidate_id in enumerate(ids)}
    candidates.sort(key=lambda candidate: order.get(candidate.id, 0))
    return ok_response(
        {"candidates": [serialize_candidate_detail(candidate) for candidate in candidates]}
    )


@candidates_bp.get("/<int:candidate_id>/pdf")
@require_auth
def get_candidate_pdf(candidate_id: int):
    candidate = Candidate.query.get(candidate_id)
    if not candidate:
        return error_response("NOT_FOUND", "候选人不存在。", status=404)

    pdf_path = resolve_storage_path(candidate.pdf_path)
    if not pdf_path.exists():
        return error_response("PDF_NOT_FOUND", "原始 PDF 文件不存在。", status=404)

    return send_file(
        pdf_path.resolve(),
        mimetype="application/pdf",
        download_name=candidate.original_filename,
    )


def matches_query(candidate: Candidate, q: str) -> bool:
    terms = parse_query_terms(q)
    if not terms:
        return True

    haystack = "\n".join(get_candidate_search_values(candidate)).lower()
    return all(term in haystack for term in terms)


def parse_query_terms(value: str) -> list[str]:
    normalized = value.replace("，", ",")
    return [item.strip().lower() for item in normalized.replace(",", " ").split() if item.strip()]


def get_candidate_search_values(candidate: Candidate) -> list[str]:
    profile = candidate.profile
    values: list[str] = [
        candidate.original_filename,
        candidate.raw_text or "",
    ]

    if profile:
        values.extend(
            [
                profile.name or "",
                profile.phone or "",
                profile.email or "",
                profile.city or "",
            ]
        )
        values.extend(flatten_search_values(profile.skills))
        values.extend(flatten_search_values(profile.education))
        values.extend(flatten_search_values(profile.work_experience))
        values.extend(flatten_search_values(profile.projects))

    return values


def flatten_search_values(value: Any) -> list[str]:
    if value is None:
        return []

    if isinstance(value, str):
        return [value]

    if isinstance(value, int | float | bool):
        return [str(value)]

    if isinstance(value, dict):
        values: list[str] = []
        for item in value.values():
            values.extend(flatten_search_values(item))
        return values

    if isinstance(value, list | tuple | set):
        values: list[str] = []
        for item in value:
            values.extend(flatten_search_values(item))
        return values

    return [str(value)]


def parse_skill_filters() -> list[str]:
    raw_values = [*request.args.getlist("skill"), *request.args.getlist("skills")]
    filters: list[str] = []
    seen: set[str] = set()

    for raw_value in raw_values:
        for item in str(raw_value).replace("，", ",").split(","):
            normalized = item.strip().lower()
            if not normalized or normalized in seen:
                continue
            filters.append(normalized)
            seen.add(normalized)

    return filters


def has_skills(candidate: Candidate, skill_filters: list[str]) -> bool:
    if not candidate.profile:
        return False

    candidate_skills = [str(item).lower() for item in candidate.profile.skills or []]
    return all(
        any(skill_filter in candidate_skill for candidate_skill in candidate_skills)
        for skill_filter in skill_filters
    )


def sort_candidates(candidates: list[Candidate], sort: str) -> list[Candidate]:
    reverse = sort.startswith("-")
    key = sort[1:] if reverse else sort

    if key == "score":
        return sorted(
            candidates,
            key=lambda candidate: max(
                (score.total_score for score in candidate.scores), default=-1
            ),
            reverse=reverse,
        )
    if key == "name":
        return sorted(
            candidates,
            key=lambda candidate: (candidate.profile.name if candidate.profile else "") or "",
            reverse=reverse,
        )
    return sorted(candidates, key=lambda candidate: candidate.created_at, reverse=reverse)


def ensure_list(value):
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]
