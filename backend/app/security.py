from collections.abc import Callable
from functools import wraps
from hmac import compare_digest
from typing import Any

from flask import current_app, session

from .utils.responses import error_response


def access_key_matches(candidate: str) -> bool:
    expected = current_app.config.get("APP_ACCESS_KEY", "")
    if not expected:
        return False
    return compare_digest(candidate, expected)


def require_auth(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if not session.get("authenticated"):
            return error_response("UNAUTHORIZED", "请先登录。", status=401)
        return view(*args, **kwargs)

    return wrapped

