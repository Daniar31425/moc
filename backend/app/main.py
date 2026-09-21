from typing import Literal
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


class LessonRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=120)
    learner_type: Literal["school_student", "university_student"]
    difficulty: Literal["beginner", "intermediate", "advanced"]
    language: Literal["ru", "kk"] = "ru"


class Quiz(BaseModel):
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str


class LessonResponse(BaseModel):
    lesson_id: str
    title: str
    explanation: str
    example: str
    quiz: Quiz
    takeaway: str
    generated_by: Literal["mock", "openai"]


app = FastAPI(
    title="AlemCourse API",
    version="0.1.0",
    description="API skeleton for one adaptive micro-lesson scenario.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Проверьте поля запроса.",
                "request_id": str(uuid4()),
                "details": exc.errors(),
            }
        },
    )


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "alemcourse-api", "mode": "mock"}


@app.post("/api/v1/lessons/generate", response_model=LessonResponse)
async def generate_lesson(payload: LessonRequest) -> LessonResponse:
    audience = (
        "школьника"
        if payload.learner_type == "school_student"
        else "студента"
    )
    difficulty = {
        "beginner": "начального",
        "intermediate": "среднего",
        "advanced": "продвинутого",
    }[payload.difficulty]

    return LessonResponse(
        lesson_id=str(uuid4()),
        title=f"{payload.topic}: микроурок",
        explanation=(
            f"Это временный урок по теме «{payload.topic}» для {audience} "
            f"{difficulty} уровня. На следующем этапе этот блок сгенерирует OpenAI."
        ),
        example=f"Пример применения темы «{payload.topic}» появится здесь.",
        quiz=Quiz(
            question="Какова цель этого микроурока?",
            options=[
                "Объяснить тему на выбранном уровне",
                "Показать рекламу",
                "Создать длинный учебник",
            ],
            correct_option_index=0,
            explanation="Микроурок адаптирует объяснение к типу ученика и сложности.",
        ),
        takeaway="Одна тема, короткое объяснение, пример и проверочный вопрос.",
        generated_by="mock",
    )

