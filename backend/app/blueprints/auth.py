from flask import Blueprint, request, session

from ..security import access_key_matches
from ..utils.responses import error_response, ok_response

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    access_key = str(payload.get("access_key", ""))

    if not access_key_matches(access_key):
        return error_response("INVALID_ACCESS_KEY", "访问密钥不正确。", status=401)

    session.clear()
    session.permanent = True
    session["authenticated"] = True

    return ok_response({"authenticated": True})


@auth_bp.post("/logout")
def logout():
    session.clear()
    return ok_response({"authenticated": False})


@auth_bp.get("/session")
def current_session():
    return ok_response({"authenticated": bool(session.get("authenticated"))})

