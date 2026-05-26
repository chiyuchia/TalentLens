from pathlib import Path

from flask import current_app


def backend_root() -> Path:
    return Path(current_app.root_path).parent


def resolve_storage_path(value: str | Path) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return backend_root() / path


def upload_dir_path() -> Path:
    path = resolve_storage_path(current_app.config["UPLOAD_DIR"])
    path.mkdir(parents=True, exist_ok=True)
    return path

