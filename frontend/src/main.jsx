import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 30000);

function App() {
  const [form, setForm] = useState({
    topic: "Законы Ньютона",
    learner_type: "school_student",
    difficulty: "beginner",
    language: "ru",
  });
  const [lesson, setLesson] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError("");
    setLesson(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/lessons/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Не удалось создать урок");
      setLesson(data);
      setStatus("success");
    } catch (requestError) {
      setError(
        requestError.name === "AbortError"
          ? "Сервер не ответил за 30 секунд. Попробуйте ещё раз."
          : requestError.message,
      );
      setStatus("error");
    } finally {
      clearTimeout(timeout);
    }
  };

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">HackAlem AI · MVP</p>
        <h1>AlemCourse</h1>
        <p>Одна тема — понятный микроурок под ваш уровень.</p>
      </section>

      <form onSubmit={submit}>
        <label>
          Тема
          <input name="topic" value={form.topic} onChange={update} minLength="2" required />
        </label>
        <label>
          Кто учится
          <select name="learner_type" value={form.learner_type} onChange={update}>
            <option value="school_student">Школьник</option>
            <option value="university_student">Студент</option>
          </select>
        </label>
        <label>
          Сложность
          <select name="difficulty" value={form.difficulty} onChange={update}>
            <option value="beginner">Начальная</option>
            <option value="intermediate">Средняя</option>
            <option value="advanced">Продвинутая</option>
          </select>
        </label>
        <button disabled={status === "loading"}>
          {status === "loading" ? "Создаём урок…" : "Создать микроурок"}
        </button>
      </form>

      {status === "error" && <p className="error" role="alert">{error}</p>}

      {lesson && (
        <article>
          <span className="badge">{lesson.generated_by === "mock" ? "Mock" : "OpenAI"}</span>
          <h2>{lesson.title}</h2>
          <p>{lesson.explanation}</p>
          <h3>Пример</h3>
          <p>{lesson.example}</p>
          <h3>Проверь себя</h3>
          <p>{lesson.quiz.question}</p>
          <ol>{lesson.quiz.options.map((option) => <li key={option}>{option}</li>)}</ol>
          <p className="takeaway">Главное: {lesson.takeaway}</p>
        </article>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

