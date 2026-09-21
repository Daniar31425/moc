import { createMockLesson } from "./mock.js";

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000);
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "false").toLowerCase() === "true";

export class ApiError extends Error {
  constructor(message, { code = "INTERNAL_ERROR", requestId = "", kind = "api" } = {}) {
    super(message); this.name = "ApiError"; this.code = code; this.requestId = requestId; this.kind = kind;
  }
}

function validateLesson(data) {
  const quiz = data?.quiz;
  const valid = typeof data?.lesson_id === "string" && typeof data?.title === "string" &&
    typeof data?.explanation === "string" && typeof data?.example === "string" &&
    typeof data?.takeaway === "string" && ["mock", "openai"].includes(data?.generated_by) &&
    typeof quiz?.question === "string" && Array.isArray(quiz?.options) && quiz.options.length === 3 &&
    quiz.options.every((option) => typeof option === "string") &&
    Number.isInteger(quiz?.correct_option_index) && quiz.correct_option_index >= 0 && quiz.correct_option_index <= 2 &&
    typeof quiz?.explanation === "string";
  if (!valid) throw new ApiError("Сервер вернул результат в неизвестном формате.", { code: "INVALID_RESPONSE" });
  return data;
}

export function isLessonEmpty(lesson) {
  return [lesson.title, lesson.explanation, lesson.example, lesson.takeaway, lesson.quiz.question].some((value) => value.trim().length === 0);
}

export async function generateLesson(payload) {
  if (USE_MOCK) return createMockLesson(payload);
  if (!API_BASE_URL) {
    throw new ApiError("Не задан адрес backend. Добавьте VITE_API_BASE_URL в .env.local.", {
      code: "BACKEND_URL_MISSING",
      kind: "unavailable",
    });
  }
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/lessons/generate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal,
    });
    let data;
    try { data = await response.json(); }
    catch { throw new ApiError("Сервер вернул ответ, который не удалось прочитать.", { code: "INVALID_RESPONSE" }); }
    if (!response.ok) throw new ApiError(data?.error?.message ?? "Не удалось создать урок.", { code: data?.error?.code, requestId: data?.error?.request_id });
    return validateLesson(data);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === "AbortError") throw new ApiError("Сервер отвечает слишком долго. Попробуйте ещё раз.", { code: "CLIENT_TIMEOUT", kind: "unavailable" });
    throw new ApiError("Не удалось связаться с backend. Проверьте, что сервер запущен.", { code: "BACKEND_UNAVAILABLE", kind: "unavailable" });
  } finally { window.clearTimeout(timeout); }
}
