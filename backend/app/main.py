from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.errors import LessonServiceError
from app.lesson_service import generate_lesson as generate_lesson_service
from app.models import LessonRequest, LessonResponse


app = FastAPI(
    title="AlemCourse API",
    version="0.1.0",
    description="API skeleton for one adaptive micro-lesson scenario.",
)

initial_settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        {
            initial_settings.frontend_origin,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    ),
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
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


@app.exception_handler(LessonServiceError)
async def lesson_service_exception_handler(
    request: Request, exc: LessonServiceError
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "request_id": str(uuid4()),
            }
        },
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "Внутренняя ошибка сервера.",
                "request_id": str(uuid4()),
            }
        },
    )


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    mode = "mock" if get_settings().use_mock else "openai"
    return {"status": "ok", "service": "alemcourse-api", "mode": mode}


@app.post("/api/v1/lessons/generate", response_model=LessonResponse)
async def generate_lesson(payload: LessonRequest) -> LessonResponse:
    return await generate_lesson_service(payload, get_settings())
