import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ApiError, generateLesson, isLessonEmpty } from "./api.js";
import "./styles.css";

const TOPICS = ["Законы Ньютона", "Фотосинтез", "Производная функции"];
const INITIAL_FORM = { topic: "Законы Ньютона", learner_type: "school_student", difficulty: "beginner", language: "ru" };
const LABELS = {
  learner_type: { school_student: "Школьник", university_student: "Студент" },
  difficulty: { beginner: "Начальная", intermediate: "Средняя", advanced: "Продвинутая" },
};

function LessonCard({ lesson }) {
  const [selected, setSelected] = useState(null);
  const answered = selected !== null;
  const correct = selected === lesson.quiz.correct_option_index;

  return (
    <article className="lesson-card" aria-labelledby="lesson-title">
      <header className="lesson-header">
        <div><p className="kicker">Ваш микроурок готов</p><h2 id="lesson-title">{lesson.title}</h2></div>
        <span className={`badge badge--${lesson.generated_by}`}>{lesson.generated_by === "mock" ? "Демо-режим" : "Создано AI"}</span>
      </header>
      <section className="lesson-section">
        <span className="step">01</span><div><h3>Разберёмся</h3><p>{lesson.explanation}</p></div>
      </section>
      <section className="lesson-section example">
        <span className="step">02</span><div><h3>Живой пример</h3><p>{lesson.example}</p></div>
      </section>
      <section className="quiz">
        <div className="quiz-heading"><span className="step">03</span><div><p className="kicker">Проверь себя</p><h3>{lesson.quiz.question}</h3></div></div>
        <div className="options" role="radiogroup" aria-label="Варианты ответа">
          {lesson.quiz.options.map((option, index) => {
            let className = "option";
            if (answered && index === lesson.quiz.correct_option_index) className += " correct";
            else if (answered && index === selected) className += " wrong";
            return <button className={className} type="button" role="radio" aria-checked={selected === index} disabled={answered} key={`${index}-${option}`} onClick={() => setSelected(index)}><span>{String.fromCharCode(65 + index)}</span>{option}</button>;
          })}
        </div>
        {answered && <div className={`feedback ${correct ? "feedback-success" : "feedback-error"}`} role="status"><strong>{correct ? "Верно!" : "Почти. Посмотрите правильный ответ."}</strong><p>{lesson.quiz.explanation}</p></div>}
      </section>
      <footer className="takeaway"><span aria-hidden="true">✦</span><div><strong>Главное за минуту</strong><p>{lesson.takeaway}</p></div></footer>
    </article>
  );
}

function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [lesson, setLesson] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const resetResult = () => { setStatus("idle"); setLesson(null); setError(null); };
  const update = (event) => { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); resetResult(); };
  const chooseTopic = (topic) => { setForm((current) => ({ ...current, topic })); resetResult(); };

  const submit = async (event) => {
    event?.preventDefault();
    setStatus("loading"); setError(null); setLesson(null);
    try {
      const data = await generateLesson({ ...form, topic: form.topic.trim() });
      if (isLessonEmpty(data)) { setStatus("empty"); return; }
      setLesson(data); setStatus("success");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError : new ApiError("Не удалось получить урок. Попробуйте ещё раз.", { code: "UNKNOWN" }));
      setStatus("error");
    }
  };

  return (
    <main>
      <nav className="topbar" aria-label="Основная навигация"><a className="brand" href="#top"><span className="brand-mark">A</span>AlemCourse</a><span className="mvp-label">HackAlem AI · MVP</span></nav>
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> Учитесь в своём темпе</p>
          <h1>Сложное становится <em>понятным.</em></h1>
          <p className="hero-subtitle">Назовите тему — и получите короткий урок, адаптированный под ваш уровень. Объяснение, пример и самопроверка на одном экране.</p>
          <div className="proof"><span><b>≈ 30 сек</b> на создание</span><span><b>1 экран</b> без лишнего</span><span><b>Ваш уровень</b> сложности</span></div>
        </div>
        <form className="lesson-form" onSubmit={submit} aria-busy={status === "loading"}>
          <div className="form-heading"><span className="form-icon">✦</span><div><h2>Создайте микроурок</h2><p>Три шага до понятного объяснения</p></div></div>
          <label><span>Что хотите понять?</span><input name="topic" value={form.topic} onChange={update} minLength="2" maxLength="120" placeholder="Например, законы Ньютона" autoComplete="off" required disabled={status === "loading"} /></label>
          <div className="suggestions" aria-label="Готовые темы">{TOPICS.map((topic) => <button type="button" key={topic} onClick={() => chooseTopic(topic)} disabled={status === "loading"}>{topic}</button>)}</div>
          <div className="form-grid">
            <label><span>Кто учится</span><select name="learner_type" value={form.learner_type} onChange={update} disabled={status === "loading"}><option value="school_student">Школьник</option><option value="university_student">Студент</option></select></label>
            <label><span>Сложность</span><select name="difficulty" value={form.difficulty} onChange={update} disabled={status === "loading"}><option value="beginner">Начальная</option><option value="intermediate">Средняя</option><option value="advanced">Продвинутая</option></select></label>
          </div>
          <div className="summary">Для: <strong>{LABELS.learner_type[form.learner_type]}</strong><span>·</span>Уровень: <strong>{LABELS.difficulty[form.difficulty]}</strong></div>
          <button className="submit" disabled={status === "loading"}>{status === "loading" ? <><span className="spinner" /> Создаём понятный урок…</> : <>Создать микроурок <span>→</span></>}</button>
        </form>
      </section>
      <section className="result-area" aria-live="polite">
        {status === "idle" && <div className="initial"><span>↑</span><p>Настройте урок и нажмите кнопку — результат появится здесь.</p></div>}
        {status === "loading" && <div className="loading" role="status"><div className="orbit"><span>✦</span></div><h2>Собираем урок под вас</h2><p>Адаптируем объяснение и готовим вопрос для самопроверки…</p><div className="loading-lines"><span /><span /><span /></div></div>}
        {status === "empty" && <div className="state" role="status"><span className="state-icon">○</span><h2>Урок получился пустым</h2><p>Попробуйте сформулировать тему точнее или выбрать готовый пример.</p><button type="button" onClick={resetResult}>Изменить запрос</button></div>}
        {status === "error" && error && <div className="state state-error" role="alert"><span className="state-icon">!</span><p className="kicker">{error.kind === "unavailable" ? "Backend недоступен" : "Не удалось создать урок"}</p><h2>{error.message}</h2>{error.requestId && <p className="request-id">Код запроса: {error.requestId}</p>}<button type="button" onClick={submit}>Попробовать снова</button></div>}
        {status === "success" && lesson && <LessonCard lesson={lesson} />}
      </section>
      <footer className="page-footer"><span>Сделано для HackAlem AI</span><span>Один запрос · Один понятный урок</span></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
