import os
from datetime import timedelta
from pathlib import Path


class Config:
    ENV = os.getenv("FLASK_ENV", "development")
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
    APP_ACCESS_KEY = os.getenv("APP_ACCESS_KEY", "")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///talentlens.sqlite3")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "instance/uploads")
    AI_MODE = os.getenv("AI_MODE", "mock")
    AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "")
    MOONSHOT_API_KEY = os.getenv("MOONSHOT_API_KEY", "")
    MOONSHOT_BASE_URL = os.getenv("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1")
    MOONSHOT_MODEL = os.getenv("MOONSHOT_MODEL", "moonshot-v1-8k")
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true"
    PERMANENT_SESSION_LIFETIME = timedelta(hours=12)
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024

    @staticmethod
    def validate(config: dict) -> None:
        if config.get("ENV") == "production":
            missing = [
                name
                for name in ("APP_ACCESS_KEY", "SECRET_KEY")
                if not config.get(name) or config.get(name) == "dev-secret-change-me"
            ]
            if missing:
                raise RuntimeError(f"Missing required production settings: {', '.join(missing)}")

    @staticmethod
    def prepare_runtime_paths(app) -> None:
        Path(app.instance_path).mkdir(parents=True, exist_ok=True)

        database_uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if database_uri.startswith("sqlite:///") and database_uri != "sqlite:///:memory:":
            database_path = database_uri.removeprefix("sqlite:///")
            if database_path:
                path = Path(database_path)
                if path.is_absolute():
                    path.parent.mkdir(parents=True, exist_ok=True)
                else:
                    (Path(app.instance_path) / path).parent.mkdir(parents=True, exist_ok=True)
                    path.parent.mkdir(parents=True, exist_ok=True)

        upload_dir = Path(app.config.get("UPLOAD_DIR", "instance/uploads"))
        if not upload_dir.is_absolute():
            upload_dir = Path(app.root_path).parent / upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)
