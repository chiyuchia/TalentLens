from datetime import datetime

from ..extensions import db


class Candidate(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    upload_batch_id = db.Column(db.String(64), nullable=False, index=True)
    status = db.Column(db.String(32), nullable=False, default="pending")
    original_filename = db.Column(db.String(255), nullable=False)
    pdf_path = db.Column(db.String(512), nullable=False)
    raw_text = db.Column(db.Text, nullable=True)
    parse_status = db.Column(db.String(32), nullable=False, default="uploaded")
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    scores = db.relationship(
        "ScoreResult", back_populates="candidate", cascade="all, delete-orphan", lazy="selectin"
    )


class ResumeProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate.id"), nullable=False, unique=True)
    name = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(80), nullable=True)
    email = db.Column(db.String(255), nullable=True)
    city = db.Column(db.String(120), nullable=True)
    education = db.Column(db.JSON, nullable=False, default=list)
    work_experience = db.Column(db.JSON, nullable=False, default=list)
    skills = db.Column(db.JSON, nullable=False, default=list)
    projects = db.Column(db.JSON, nullable=False, default=list)
    candidate = db.relationship("Candidate", backref=db.backref("profile", uselist=False))


class JobDescription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(160), nullable=False)
    description = db.Column(db.Text, nullable=False)
    required_skills = db.Column(db.JSON, nullable=False, default=list)
    bonus_skills = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    scores = db.relationship(
        "ScoreResult", back_populates="job", cascade="all, delete-orphan", lazy="selectin"
    )


class ScoreResult(db.Model):
    __table_args__ = (db.UniqueConstraint("candidate_id", "job_id", name="uq_score_candidate_job"),)

    id = db.Column(db.Integer, primary_key=True)
    candidate_id = db.Column(db.Integer, db.ForeignKey("candidate.id"), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey("job_description.id"), nullable=False)
    total_score = db.Column(db.Integer, nullable=False)
    skill_score = db.Column(db.Integer, nullable=False)
    experience_score = db.Column(db.Integer, nullable=False)
    education_score = db.Column(db.Integer, nullable=False)
    ai_comment = db.Column(db.Text, nullable=False)
    details = db.Column(db.JSON, nullable=False, default=dict)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    candidate = db.relationship("Candidate", back_populates="scores")
    job = db.relationship("JobDescription", back_populates="scores")
