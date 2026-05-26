from io import BytesIO

from app import create_app
from app.extensions import db
from app.models import Candidate, ResumeProfile


def make_client():
    app = create_app(
        {
            "TESTING": True,
            "APP_ACCESS_KEY": "test-key",
            "SECRET_KEY": "test-secret",
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "UPLOAD_DIR": "/tmp/talentlens-test-uploads",
        }
    )
    with app.app_context():
        db.create_all()
    client = app.test_client()
    client.post("/api/auth/login", json={"access_key": "test-key"})
    return client


def test_create_and_list_job():
    client = make_client()

    create_response = client.post(
        "/api/jobs",
        json={
            "title": "Frontend Engineer",
            "description": "Build React applications",
            "required_skills": ["React", "TypeScript"],
            "bonus_skills": ["Python"],
        },
    )

    assert create_response.status_code == 201
    assert create_response.get_json()["data"]["title"] == "Frontend Engineer"

    list_response = client.get("/api/jobs")
    assert len(list_response.get_json()["data"]["items"]) == 1


def test_upload_rejects_non_pdf():
    client = make_client()

    response = client.post(
        "/api/uploads/resumes",
        data={"files": (BytesIO(b"not a pdf"), "resume.txt")},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400


def test_upload_rejects_more_than_five_pdfs():
    client = make_client()

    response = client.post(
        "/api/uploads/resumes",
        data={
            "files": [
                (BytesIO(b"%PDF-1.4\n% test\n"), f"resume-{index}.pdf")
                for index in range(6)
            ]
        },
        content_type="multipart/form-data",
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "TOO_MANY_FILES"


def test_compare_requires_two_or_three_candidates():
    client = make_client()

    response = client.post("/api/candidates/compare", json={"candidate_ids": [1]})

    assert response.status_code == 400


def test_candidate_profile_update_and_list():
    client = make_client()
    with client.application.app_context():
        candidate = Candidate(
            upload_batch_id="batch",
            original_filename="resume.pdf",
            pdf_path="/tmp/resume.pdf",
        )
        db.session.add(candidate)
        db.session.commit()
        candidate_id = candidate.id

    response = client.patch(
        f"/api/candidates/{candidate_id}/profile",
        json={
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "skills": ["Python", "React"],
        },
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["profile"]["name"] == "Ada Lovelace"

    list_response = client.get("/api/candidates?q=ada")
    assert list_response.get_json()["data"]["total"] == 1


def test_candidate_list_filters_by_multiple_skills():
    client = make_client()
    profiles = [
        ("Ada Lovelace", ["React", "TypeScript"]),
        ("Grace Hopper", ["Python", "React"]),
        ("Linus Torvalds", ["Python", "Go"]),
    ]

    with client.application.app_context():
        for name, skills in profiles:
            candidate = Candidate(
                upload_batch_id="batch",
                original_filename=f"{name}.pdf",
                pdf_path=f"/tmp/{name}.pdf",
            )
            db.session.add(candidate)
            db.session.flush()
            db.session.add(
                ResumeProfile(candidate_id=candidate.id, name=name, skills=skills)
            )
        db.session.commit()

    response = client.get("/api/candidates?skill=React&skill=TypeScript")
    data = response.get_json()["data"]

    assert data["total"] == 1
    assert data["items"][0]["name"] == "Ada Lovelace"

    comma_response = client.get("/api/candidates?skills=React,Python")
    comma_data = comma_response.get_json()["data"]

    assert comma_data["total"] == 1
    assert comma_data["items"][0]["name"] == "Grace Hopper"


def test_candidate_list_filters_by_keyword_fields_and_terms():
    client = make_client()
    profiles = [
        {
            "name": "Ada Lovelace",
            "city": "Beijing",
            "skills": ["React", "TypeScript"],
            "education": [{"school": "清华大学", "major": "Computer Science"}],
        },
        {
            "name": "Grace Hopper",
            "city": "New York",
            "skills": ["Python", "COBOL"],
            "education": [{"school": "Yale University", "major": "Mathematics"}],
        },
        {
            "name": "Alan Turing",
            "city": "London",
            "skills": ["Cryptography"],
            "education": [{"school": "Princeton University", "major": "Mathematics"}],
        },
    ]

    with client.application.app_context():
        for profile in profiles:
            candidate = Candidate(
                upload_batch_id="batch",
                original_filename=f"{profile['name']}.pdf",
                pdf_path=f"/tmp/{profile['name']}.pdf",
            )
            db.session.add(candidate)
            db.session.flush()
            db.session.add(ResumeProfile(candidate_id=candidate.id, **profile))
        db.session.commit()

    school_response = client.get("/api/candidates", query_string={"q": "清华"})
    school_data = school_response.get_json()["data"]

    assert school_data["total"] == 1
    assert school_data["items"][0]["name"] == "Ada Lovelace"

    combined_response = client.get("/api/candidates", query_string={"q": "React 清华"})
    combined_data = combined_response.get_json()["data"]

    assert combined_data["total"] == 1
    assert combined_data["items"][0]["name"] == "Ada Lovelace"

    mismatch_response = client.get("/api/candidates", query_string={"q": "React Yale"})
    assert mismatch_response.get_json()["data"]["total"] == 0


def test_score_candidate_against_job():
    client = make_client()
    with client.application.app_context():
        candidate = Candidate(
            upload_batch_id="batch",
            original_filename="resume.pdf",
            pdf_path="/tmp/resume.pdf",
        )
        db.session.add(candidate)
        db.session.flush()
        db.session.add(
            ResumeProfile(
                candidate_id=candidate.id,
                name="Ada Lovelace",
                skills=["React", "TypeScript"],
            )
        )
        db.session.commit()
        candidate_id = candidate.id

    job_response = client.post(
        "/api/jobs",
        json={
            "title": "Frontend Engineer",
            "description": "React role",
            "required_skills": ["React", "TypeScript"],
        },
    )
    job_id = job_response.get_json()["data"]["id"]

    score_response = client.post(
        "/api/scores", json={"candidate_id": candidate_id, "job_ids": [job_id]}
    )

    assert score_response.status_code == 201
    assert score_response.get_json()["data"]["items"][0]["total_score"] >= 0


def test_candidate_pdf_preview_uses_backend_relative_path(tmp_path):
    client = make_client()
    pdf_path = tmp_path / "resume.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n% test\n")

    with client.application.app_context():
        candidate = Candidate(
            upload_batch_id="batch",
            original_filename="resume.pdf",
            pdf_path=str(pdf_path),
        )
        db.session.add(candidate)
        db.session.commit()
        candidate_id = candidate.id

    response = client.get(f"/api/candidates/{candidate_id}/pdf")

    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
