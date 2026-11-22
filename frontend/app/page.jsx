import Link from "next/link";
import Reveal from "../components/Reveal";

const FEATURES = [
  { icon: "💬", title: "Chat avec citations", text: "Des réponses fiables, chacune avec sa page source.", href: "/chat" },
  { icon: "📝", title: "Résumés", text: "Court, moyen ou détaillé, en un clic.", href: "/summary" },
  { icon: "🧠", title: "Quiz QCM", text: "Des QCM corrigés avec explications et score.", href: "/quiz" },
  { icon: "📚", title: "Vos documents", text: "Glissez vos PDF, l'indexation est automatique.", href: "/documents" },
];

const STATS = [
  { v: "100%", l: "Local et privé" },
  { v: "RAG", l: "Réponses sourcées" },
  { v: "3", l: "Niveaux de résumé" },
  { v: "QCM", l: "Auto-corrigés" },
];

const PIPELINE = ["PDF", "Chunks", "Embeddings", "FAISS", "Llama 3.1", "Réponse + sources"];

export default function Home() {
  return (
    <div className="space-y-28">
      <section className="py-12 text-center">
        <span className="animate-up inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> RAG + LLM local (Llama 3.1)
        </span>
        <h1 className="animate-up mx-auto mt-7 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-7xl" style={{ animationDelay: ".1s" }}>
          Apprenez plus vite avec votre <span className="gradient-text">assistant de cours</span>
        </h1>
        <p className="animate-up mx-auto mt-6 max-w-2xl text-lg text-slate-400" style={{ animationDelay: ".2s" }}>
          Résumés, quiz et réponses fiables avec citation des sources, à partir de vos propres documents.
        </p>
        <div className="animate-up mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: ".3s" }}>
          <Link href="/chat" className="btn-glow rounded-xl px-7 py-3.5 font-semibold text-white transition active:scale-95">Commencer le chat →</Link>
          <Link href="/documents" className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">Ajouter un document</Link>
        </div>
      </section>

      <Reveal>
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-md">
              <div className="gradient-text text-3xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-sm text-slate-400">{s.l}</div>
            </div>
          ))}
        </section>
      </Reveal>

      <section>
        <Reveal><h2 className="mb-8 text-3xl font-bold text-white">Fonctionnalités</h2></Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.href} delay={i * 100}>
              <Link href={f.href} className="group block h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/20">
                <div className="btn-glow flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition group-hover:scale-110 group-hover:rotate-6">{f.icon}</div>
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{f.text}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section>
        <Reveal><h2 className="mb-8 text-3xl font-bold text-white">Sous le capot</h2></Reveal>
        <Reveal delay={100}>
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
            {PIPELINE.map((p, i) => (
              <div key={p} className="flex items-center gap-3">
                <span className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200">{p}</span>
                {i < PIPELINE.length - 1 && <span className="text-cyan-400">→</span>}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="btn-glow rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-extrabold text-white">Prêt à réviser autrement ?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/80">Ajoutez votre cours et posez votre première question.</p>
          <Link href="/documents" className="mt-6 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-indigo-700 transition hover:scale-105">Commencer maintenant</Link>
        </section>
      </Reveal>
    </div>
  );
}