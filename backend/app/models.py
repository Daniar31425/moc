from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class LessonRequest(BaseModel):
    topic: str = Field(min_length=2, max_length=120)
    learner_type: Literal["school_student", "university_student"]
    difficulty: Literal["beginner", "intermediate", "advanced"]
    language: Literal["ru", "kk"] = "ru"

    @field_validator("topic")
    @classmethod
    def normalize_topic(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("topic must contain at least 2 visible characters")
        return normalized


class Quiz(BaseModel):
    question: str
    options: list[str]
    correct_option_index: int
    explanation: str

    @model_validator(mode="after")
    def validate_options(self) -> "Quiz":
        if len(self.options) != 3:
            raise ValueError("quiz must contain exactly 3 options")
        if not 0 <= self.correct_option_index < len(self.options):
            raise ValueError("correct_option_index must point to an option")
        if any(not option.strip() for option in self.options):
            raise ValueError("quiz options must not be empty")
        return self


class LessonContent(BaseModel):
    title: str
    explanation: str
    example: str
    quiz: Quiz
    takeaway: str


class LessonResponse(LessonContent):
    lesson_id: str
    generated_by: Literal["mock", "openai"]

