import os

from flask import Flask
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .blueprints.auth import auth_bp
from .blueprints.candidates import candidates_bp
from .blueprints.health import health_bp
from .blueprints.jobs import jobs_bp
from .blueprints.scores import scores_bp
from .blueprints.uploads import uploads_bp
from .config import Config
from .extensions import db
from .utils.responses import error_response


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    Config.validate(app.config)
    Config.prepare_runtime_paths(app)

    origin = app.config.get("FRONTEND_ORIGIN", "")
    if origin:
        CORS(app, origins=[origin], supports_credentials=True)

    db.init_app(app)

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(uploads_bp, url_prefix="/api/uploads")
    app.register_blueprint(candidates_bp, url_prefix="/api/candidates")
    app.register_blueprint(jobs_bp, url_prefix="/api/jobs")
    app.register_blueprint(scores_bp, url_prefix="/api/scores")

    with app.app_context():
        from . import models  # noqa: F401

    @app.cli.command("init-db")
    def init_db_command() -> None:
        db.create_all()
        print("Initialized the TalentLens database.")

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        status_code = error.code or 500
        code = error.name.upper().replace(" ", "_")
        return error_response(code, error.description, status=status_code)

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error: Exception):
        app.logger.exception("Unhandled application error", exc_info=error)
        return error_response(
            "INTERNAL_SERVER_ERROR",
            "服务暂时不可用，请稍后重试。",
            status=500,
        )

    return app
