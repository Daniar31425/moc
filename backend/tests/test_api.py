import asyncio
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app import lesson_service
from app.config import Settings, get_settings
from app.errors import OpenAITimeoutError
from app.main import app
from app.models import LessonContent, Quiz


client = TestClient(app)


@pytest.fixture(autouse=True)
def mock_mode(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("USE_MOCK", "true")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_health() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["mode"] == "mock"


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


def test_rejects_blank_topic() -> None:
    response = client.post(
        "/api/v1/lessons/generate",
        json={
            "topic": "   ",
            "learner_type": "school_student",
            "difficulty": "beginner",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_openai_mode_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("USE_MOCK", "false")
    get_settings.cache_clear()

    response = client.post(
        "/api/v1/lessons/generate",
        json={
            "topic": "Алгоритмы",
            "learner_type": "university_student",
            "difficulty": "intermediate",
        },
    )

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "OPENAI_UNAVAILABLE"


def test_timeout_uses_contract_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def timeout(*args, **kwargs):
        raise OpenAITimeoutError()

    monkeypatch.setattr("app.main.generate_lesson_service", timeout)

    response = client.post(
        "/api/v1/lessons/generate",
        json={
            "topic": "Алгоритмы",
            "learner_type": "university_student",
            "difficulty": "advanced",
        },
    )

    assert response.status_code == 504
    assert response.json()["error"]["code"] == "OPENAI_TIMEOUT"


def test_openai_structured_result_matches_contract(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict[str, object] = {}
    parsed = LessonContent(
        title="Алгоритмы: микроурок",
        explanation="Алгоритм — это конечная последовательность шагов.",
        example="Сортировка списка по возрастанию.",
        quiz=Quiz(
            question="Что обязательно для алгоритма?",
            options=["Конечность", "Случайность", "Неясность"],
            correct_option_index=0,
            explanation="Алгоритм должен завершаться за конечное число шагов.",
        ),
        takeaway="Алгоритм задаёт точные и конечные шаги решения.",
    )

    class FakeResponses:
        async def parse(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(output_parsed=parsed)

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured["client"] = kwargs
            self.responses = FakeResponses()

        async def close(self):
            captured["closed"] = True

    monkeypatch.setattr(lesson_service, "AsyncOpenAI", FakeAsyncOpenAI)
    settings = Settings(
        openai_api_key="test-key",
        openai_model="test-model",
        openai_timeout_seconds=12,
        use_mock=False,
    )
    payload = lesson_service.LessonRequest(
        topic="Алгоритмы",
        learner_type="university_student",
        difficulty="intermediate",
        language="ru",
    )

    result = asyncio.run(lesson_service.generate_lesson(payload, settings))

    assert result.generated_by == "openai"
    assert result.quiz.correct_option_index == 0
    assert captured["model"] == "test-model"
    assert captured["text_format"] is LessonContent
    assert captured["max_output_tokens"] == 1200
    assert captured["store"] is False
    assert captured["closed"] is True
