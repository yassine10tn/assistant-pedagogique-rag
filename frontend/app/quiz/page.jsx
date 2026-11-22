"use client";

import { useState } from "react";
import { post } from "../../lib/api";
import { Button, Card, PageHeader, Spinner, inputClass } from "../../components/ui";

export default function QuizPage() {
  const [topic, setTopic] = useState("");
  const [n, setN] = useState(3);
  const [difficulty, setDifficulty] = useState("moyen");
  const [questions, setQuestions] = useState([]);
  const [chosen, setChosen] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!topic.trim()) return;
    setLoading(true);
    setError("");
    setQuestions([]);
    setChosen({});
    try {
      const data = await post("/quiz", { topic, n: Number(n), difficulty });
      setQuestions(data.questions);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const answeredCount = Object.keys(chosen).length;
  const score = questions.filter((q, i) => chosen[i] === q.answer).length;
  const done = questions.length > 0 && answeredCount === questions.length;

  function optionStyle(q, i, j) {
    if (chosen[i] === undefined) return "border-white/10 bg-white/5 hover:bg-white/10";
    if (j === q.answer) return "border-emerald-500 bg-emerald-500/20";
    if (j === chosen[i]) return "border-rose-500 bg-rose-500/20";
    return "border-white/10 bg-white/5 opacity-60";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader icon="🧠" title="Quiz" subtitle="Générez des QCM à partir de vos cours et testez-vous." />

      <Card className="space-y-4">
        <input
          className={inputClass}
          placeholder="Sujet (ex : Word2Vec, BERT, TF-IDF)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <div className="flex flex-wrap gap-3">
          <input type="number" min="1" max="10" className={`${inputClass} !w-24`} value={n} onChange={(e) => setN(e.target.value)} />
          <select className={`${inputClass} !w-40`} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option className="bg-slate-900" value="facile">Facile</option>
            <option className="bg-slate-900" value="moyen">Moyen</option>
            <option className="bg-slate-900" value="difficile">Difficile</option>
          </select>
          <Button onClick={run} disabled={loading || !topic.trim()}>Générer le quiz</Button>
        </div>
        {loading && <Spinner label="Génération des questions..." />}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </Card>

      {questions.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>

          {questions.map((q, i) => (
            <Card key={i}>
              <p className="mb-3 font-semibold text-white">
                Q{i + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.choices.map((c, j) => (
                  <button
                    key={j}
                    disabled={chosen[i] !== undefined}
                    onClick={() => setChosen({ ...chosen, [i]: j })}
                    className={`block w-full rounded-xl border px-4 py-2.5 text-left text-sm transition ${optionStyle(q, i, j)}`}
                  >
                    <span className="mr-2 font-semibold text-slate-400">{"ABCD"[j]}.</span>
                    {c}
                  </button>
                ))}
              </div>
              {chosen[i] !== undefined && (
                <p className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-slate-300">💡 {q.explanation}</p>
              )}
            </Card>
          ))}

          {done && (
            <Card className="text-center">
              <p className="text-sm text-slate-400">Votre score</p>
              <p className="text-4xl font-bold text-white">{score} / {questions.length}</p>
              <Button className="mt-4" onClick={run}>Nouveau quiz</Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}