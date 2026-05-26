import json
import uuid

from flask import Blueprint, Response, current_app, request, stream_with_context
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..constants import MAX_UPLOAD_FILES
from ..extensions import db
from ..models import Candidate, ResumeProfile
from ..security import require_auth
from ..services.ai_service import AiService
from ..services.pdf_service import extract_pdf_text
from ..utils.paths import resolve_storage_path, upload_dir_path
from ..utils.responses import error_response, ok_response
from ..utils.serializers import serialize_candidate_detail, serialize_candidate_summary

uploads_bp = Blueprint("uploads", __name__)


@uploads_bp.post("/resumes")
@require_auth
def upload_resumes():
    files = request.files.getlist("files")
    if not files:
        return error_response("NO_FILES", "请至少上传一个 PDF 文件。", status=400)
    if len(files) > MAX_UPLOAD_FILES:
        return error_response(
            "TOO_MANY_FILES",
            f"单次最多上传 {MAX_UPLOAD_FILES} 个 PDF 文件。",
            status=400,
        )

    batch_id = uuid.uuid4().hex
    upload_dir = upload_dir_path()

    candidates: list[Candidate] = []
    for file in files:
        validation_error = validate_pdf_upload(file)
        if validation_error:
            return validation_error

        original_filename = file.filename or "resume.pdf"
        storage_name = f"{uuid.uuid4().hex}-{secure_filename(original_filename)}"
        pdf_path = upload_dir / storage_name
        file.save(pdf_path)

        candidate = Candidate(
            upload_batch_id=batch_id,
            original_filename=original_filename,
            pdf_path=str(pdf_path),
            parse_status="uploaded",
        )
        db.session.add(candidate)
        candidates.append(candidate)

    db.session.commit()

    return ok_response(
        {
            "upload_id": batch_id,
            "candidates": [serialize_candidate_summary(candidate) for candidate in candidates],
        },
        status=202,
    )


@uploads_bp.get("/<upload_id>/events")
@require_auth
def upload_events(upload_id: str):
    def event_stream():
        candidates = (
            Candidate.query.filter_by(upload_batch_id=upload_id)
            .order_by(Candidate.id.asc())
            .all()
        )
        if not candidates:
            yield sse_event("error", {"upload_id": upload_id, "message": "上传批次不存在。"})
            return

        for candidate in candidates:
            yield sse_event(
                "uploaded",
                {"upload_id": upload_id, "candidate": serialize_candidate_summary(candidate)},
            )

            if candidate.parse_status == "completed":
                yield sse_event(
                    "completed",
                    {"upload_id": upload_id, "candidate": serialize_candidate_detail(candidate)},
                )
                continue

            try:
                candidate.parse_status = "parsing"
                candidate.error_message = None
                db.session.commit()
                yield sse_event(
                    "parsing",
                    {"upload_id": upload_id, "candidate": serialize_candidate_summary(candidate)},
                )

                text = extract_pdf_text(resolve_storage_path(candidate.pdf_path))
                if not text:
                    raise ValueError("未能从 PDF 中提取文本，扫描版 PDF 暂不支持 OCR。")

                candidate.raw_text = text
                candidate.parse_status = "extracting"
                db.session.commit()
                yield sse_event(
                    "extracting",
                    {"upload_id": upload_id, "candidate": serialize_candidate_summary(candidate)},
                )

                ai = make_ai_service()
                accumulated_chunks = []
                for chunk in ai.extract_resume_stream(text):
                    accumulated_chunks.append(chunk)
                    yield sse_event(
                        "extract_chunk",
                        {
                            "upload_id": upload_id,
                            "candidate_id": candidate.id,
                            "chunk": chunk,
                        },
                    )

                full_json_str = "".join(accumulated_chunks)
                try:
                    profile_payload = ai._extract_json(full_json_str)
                except Exception:
                    profile_payload = ai.extract_resume(text)

                profile_payload = normalize_profile(profile_payload)
                upsert_profile(candidate, profile_payload)
                candidate.parse_status = "completed"
                db.session.commit()

                yield sse_event(
                    "partial_result",
                    {"upload_id": upload_id, "candidate": serialize_candidate_detail(candidate)},
                )
                yield sse_event(
                    "completed",
                    {"upload_id": upload_id, "candidate": serialize_candidate_detail(candidate)},
                )
            except Exception as exc:  # noqa: BLE001
                candidate.parse_status = "failed"
                candidate.error_message = str(exc)
                db.session.commit()
                yield sse_event(
                    "error",
                    {
                        "upload_id": upload_id,
                        "candidate": serialize_candidate_summary(candidate),
                        "message": str(exc),
                    },
                )

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


def validate_pdf_upload(file: FileStorage):
    filename = file.filename or ""
    mimetype = file.mimetype or ""
    if not filename.lower().endswith(".pdf"):
        return error_response("INVALID_FILE_TYPE", "仅支持 PDF 文件。", status=400)
    if mimetype and mimetype not in {"application/pdf", "application/octet-stream"}:
        return error_response("INVALID_FILE_TYPE", "仅支持 PDF 文件。", status=400)
    return None


def make_ai_service() -> AiService:
    provider = current_app.config.get("AI_PROVIDER", "openai")
    if provider == "moonshot":
        return AiService(
            mode=current_app.config["AI_MODE"],
            api_key=current_app.config["MOONSHOT_API_KEY"],
            base_url=current_app.config["MOONSHOT_BASE_URL"],
            model=current_app.config["MOONSHOT_MODEL"],
        )
    if provider == "deepseek":
        return AiService(
            mode=current_app.config["AI_MODE"],
            api_key=current_app.config["DEEPSEEK_API_KEY"],
            base_url=current_app.config["DEEPSEEK_BASE_URL"],
            model=current_app.config["DEEPSEEK_MODEL"],
        )
    return AiService(
        mode=current_app.config["AI_MODE"],
        api_key=current_app.config["OPENAI_API_KEY"],
        base_url=current_app.config["OPENAI_BASE_URL"],
        model=current_app.config["OPENAI_MODEL"],
    )


def upsert_profile(candidate: Candidate, payload: dict) -> ResumeProfile:
    profile = candidate.profile or ResumeProfile(candidate_id=candidate.id)
    profile.name = payload["name"]
    profile.phone = payload["phone"]
    profile.email = payload["email"]
    profile.city = payload["city"]
    profile.education = payload["education"]
    profile.work_experience = payload["work_experience"]
    profile.skills = payload["skills"]
    profile.projects = payload["projects"]
    db.session.add(profile)
    return profile


def normalize_profile(payload: dict) -> dict:
    return {
        "name": str(payload.get("name") or ""),
        "phone": str(payload.get("phone") or ""),
        "email": str(payload.get("email") or ""),
        "city": str(payload.get("city") or ""),
        "education": ensure_list(payload.get("education")),
        "work_experience": ensure_list(payload.get("work_experience")),
        "skills": [str(skill) for skill in ensure_list(payload.get("skills"))],
        "projects": ensure_list(payload.get("projects")),
    }


def ensure_list(value):
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
