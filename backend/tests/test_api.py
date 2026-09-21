from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_generate_mock_lesson_matches_contract() -> None:
    response = client.post(
        "/api/v1/lessons/generate",
        json={
            "topic": "Законы Ньютона",
            "learner_type": "school_student",
            "difficulty": "beginner",
            "language": "ru",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["generated_by"] == "mock"
    assert len(body["quiz"]["options"]) == 3
    assert body["quiz"]["correct_option_index"] == 0


def test_rejects_unknown_difficulty() -> None:
    response = client.post(
        "/api/v1/lessons/generate",
        json={
            "topic": "Python",
            "learner_type": "university_student",
            "difficulty": "expert",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

