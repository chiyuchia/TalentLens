from flask import Blueprint

from ..utils.responses import ok_response

health_bp = Blueprint("health", __name__)


@health_bp.get("/api/health")
def health_check():
    return ok_response({"status": "ok"})

