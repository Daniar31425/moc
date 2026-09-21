# API contract — AlemCourse

Версия: `v1`, зафиксирована архитектурным коммитом. Этот файл — единственный источник истины для интеграции frontend и backend.

## Общие правила

- Локальный backend: `http://localhost:8000`.
- Frontend-переменная: `VITE_API_BASE_URL=http://localhost:8000`.
- Таймаут запроса frontend: `30000` мс (`VITE_API_TIMEOUT_MS`).
- Формат данных: JSON, UTF-8; заголовок `Content-Type: application/json`.
- CORS разрешён только для `http://localhost:5173` и `http://127.0.0.1:5173`.
- Разрешённые методы CORS: `GET`, `POST`, `OPTIONS`; заголовок: `Content-Type`; cookies/credentials не используются.
- Все имена маршрутов, полей и типы считаются замороженными после первого коммита.

## Единый формат ошибки

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Проверьте поля запроса.",
    "request_id": "65a50f46-1169-46a0-a83e-d54af0686d91",
    "details": []
  }
}
```

Поля: `code`, `message`, `request_id` — обязательные строки; `details` — необязательный массив или объект. Возможные коды: `VALIDATION_ERROR`, `OPENAI_UNAVAILABLE`, `OPENAI_TIMEOUT`, `INTERNAL_ERROR`.

## GET `/api/v1/health`

Назначение: проверка доступности backend перед демонстрацией.

Запрос: без тела и без обязательных полей.

Успешный ответ, `200 OK`:

```json
{
  "status": "ok",
  "service": "alemcourse-api",
  "mode": "mock"
}
```

Все поля обязательны и имеют тип `string`. `mode`: `mock` или `openai`.

Ошибка, `500 Internal Server Error`: единый формат ошибки с кодом `INTERNAL_ERROR`.

Пример:

```bash
curl http://localhost:8000/api/v1/health
```

## POST `/api/v1/lessons/generate`

Назначение: создать один адаптивный микроурок с объяснением, примером и одним проверочным вопросом.

### JSON-запрос

| Поле | Тип | Обязательное | Допустимые значения / правило |
|---|---|---:|---|
| `topic` | `string` | да | 2–120 символов |
| `learner_type` | `string` | да | `school_student`, `university_student` |
| `difficulty` | `string` | да | `beginner`, `intermediate`, `advanced` |
| `language` | `string` | нет | `ru`, `kk`; по умолчанию `ru` |

Пример запроса:

```json
{
  "topic": "Законы Ньютона",
  "learner_type": "school_student",
  "difficulty": "beginner",
  "language": "ru"
}
```

### Успешный ответ

`200 OK`:

```json
{
  "lesson_id": "e958f41b-41fc-4551-8c94-9aef23a6e45f",
  "title": "Законы Ньютона: микроурок",
  "explanation": "Краткое объяснение, адаптированное под ученика.",
  "example": "Один понятный практический пример.",
  "quiz": {
    "question": "Какой закон описывает инерцию?",
    "options": ["Первый", "Второй", "Третий"],
    "correct_option_index": 0,
    "explanation": "Первый закон Ньютона описывает сохранение скорости без внешней силы."
  },
  "takeaway": "Короткий итог урока.",
  "generated_by": "openai"
}
```

| Поле | Тип | Правило |
|---|---|---|
| `lesson_id` | `string` | UUID, обязательное |
| `title` | `string` | обязательное |
| `explanation` | `string` | обязательное, готовый текст для UI |
| `example` | `string` | обязательное |
| `quiz` | `object` | обязательное |
| `quiz.question` | `string` | обязательное |
| `quiz.options` | `string[]` | ровно 3 варианта |
| `quiz.correct_option_index` | `integer` | `0..2` |
| `quiz.explanation` | `string` | обязательное |
| `takeaway` | `string` | обязательное |
| `generated_by` | `string` | `mock` или `openai` |

Это и есть формат результата OpenAI API, который backend нормализует и возвращает интерфейсу. Сырые объекты OpenAI, идентификаторы провайдера, токены и промпт frontend не получает.

### Ошибки и HTTP-коды

- `200` — урок создан.
- `422` — неверные или отсутствующие поля; `VALIDATION_ERROR`.
- `502` — OpenAI API недоступен или вернул некорректный результат; `OPENAI_UNAVAILABLE`.
- `504` — истёк серверный таймаут OpenAI; `OPENAI_TIMEOUT`.
- `500` — непредвиденная серверная ошибка; `INTERNAL_ERROR`.

Пример ошибки:

```json
{
  "error": {
    "code": "OPENAI_TIMEOUT",
    "message": "Генерация заняла слишком много времени. Повторите запрос.",
    "request_id": "f6ef02ef-825e-4f41-a5c5-07381fdcab2c"
  }
}
```

## Правило изменения контракта

1. Данияр сначала изменяет этот файл.
2. Данияр сообщает Канату точный список маршрутов, полей или типов, которые изменились.
3. Только после этого синхронно обновляются backend и frontend.
4. Изменение отражается в `docs/hourly-report.md`.

