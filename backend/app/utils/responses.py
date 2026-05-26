from typing import Any

from flask import jsonify


def ok_response(data: Any | None = None, status: int = 200):
    payload = {"data": data if data is not None else {}}
    return jsonify(payload), status


def error_response(code: str, message: str, *, status: int = 400, details: Any | None = None):
    payload = {"error": {"code": code, "message": message, "details": details}}
    return jsonify(payload), status

