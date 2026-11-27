import Link from "next/link";
import Reveal from "../components/Reveal";

/* ---------- Icônes SVG (style Lucide, sans dépendance) ---------- */
function Icon({ children, className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
const I = {
  chat: <Icon><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 21 12Z" /><path d="M8.5 11h7M8.5 14h4" /></Icon>,
  summary: <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Icon>,
  quiz: <Icon><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" /></Icon>,
  docs: <Icon><path d="M4 5a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M12 10v6M9 13h6" /></Icon>,
  shield: <Icon><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6Z" /><path d="m9 12 2 2 4-4" /></Icon>,
  chart: <Icon><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Icon>,
  bolt: <Icon><path d="M13 2 4 14h7l-1 8 9-12h-7Z" /></Icon>,
  quote: <Icon><path d="M7 7h4v4H7zM13 7h4v4h-4z" /><path d="M7 11c0 3-1 4-3 5M13 11c0 3-1 4-3 5" /></Icon>,
  file: <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></Icon>,
  split: <Icon><path d="M4 7h16M4 12h10M4 17h13" /></Icon>,
  vector: <Icon><circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 11l8-4M8 13l8 4" /></Icon>,
  db: <Icon><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></Icon>,
  brain: <Icon><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V4a3 3 0 0 0-2 0ZM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1V4a3 3 0 0 1 2 0Z" /></Icon>,
  check: <Icon className="h-4 w-4"><path d="m5 12 5 5 9-10" /></Icon>,
  arrow: <Icon className="h-4 w-4"><path d="M5 12h14M13 6l6 6-6 6" /></Icon>,
};

const FEATURES = [
  { icon: I.chat, title: "Chat avec citations", text: "Chaque réponse indique le document et la page d'où elle provient.", href: "/chat" },
  { icon: I.summary, title: "Résumés", text: "Court, moyen ou détaillé, même pour de longs documents.", href: "/summary" },
  { icon: I.quiz, title: "Quiz QCM", text: "Des questions corrigées, avec explications et score final.", href: "/quiz" },
  { icon: I.docs, title: "Vos documents", text: "Téléversez vos PDF : découpage et indexation automatiques.", href: "/documents" },
];

const STATS = [
  { icon: I.quote, v: "[Source n]", l: "Réponses sourcées" },
  { icon: I.summary, v: "3 niveaux", l: "de résumé" },
  { icon: I.quiz, v: "QCM", l: "auto-corrigés" },
  { icon: I.shield, v: "Hors sujet", l: "détecté et refusé" },
];

const PIPELINE = [
  { icon: I.file, t: "PDF", d: "Extraction du texte" },
  { icon: I.split, t: "Chunks", d: "800 caractères" },
  { icon: I.vector, t: "Embeddings", d: "multilingual-e5" },
  { icon: I.db, t: "FAISS", d: "Recherche vectorielle" },
  { icon: I.brain, t: "LLM", d: "Llama / Qwen" },
  { icon: I.quote, t: "Réponse", d: "Avec sources" },
];

const WHY = [
  { icon: I.shield, t: "Réponses fiables", d: "Le modèle répond uniquement à partir de vos documents, et refuse quand l'information est absente." },
  { icon: I.bolt, t: "Réponse en direct", d: "Le texte s'affiche mot à mot, avec rendu Markdown, et vous pouvez l'arrêter à tout moment." },
  { icon: I.chart, t: "Qualité mesurée", d: "Un module d'évaluation compare modèles et seuils sur des questions dans et hors du cours." },
];

const FAQ = [
  { q: "D'où viennent les réponses ?", a: "Uniquement des documents indexés. Chaque réponse cite le fichier et la page." },
  { q: "Que se passe-t-il si la réponse n'est pas dans mes cours ?", a: "Le chatbot répond qu'il ne trouve pas l'information, au lieu d'inventer." },
  { q: "Quels formats sont acceptés ?", a: "Les PDF contenant du texte (les PDF scannés ne sont pas pris en charge)." },
  { q: "Puis-je changer de modèle ?", a: "Oui, un administrateur peut choisir le modèle et le seuil de pertinence." },
];

const Check = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-slate-300">
    <span className="mt-0.5 text-cyan-400">{I.check}</span>
    {children}
  </li>
);

export default function Home() {
  return (
    <div className="space-y-28">
      {/* HERO */}
      <section className="grid items-center gap-12 py-10 lg:grid-cols-2">
        <div>
          <span className="animate-up inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 text-xs text-cyan-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" /> Assistant pédagogique · RAG + LLM
          </span>
          <h1 className="animate-up mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl" style={{ animationDelay: ".1s" }}>
            Posez vos questions à <span className="gradient-text">vos propres cours</span>
          </h1>
          <p className="animate-up mt-5 max-w-xl text-lg text-slate-400" style={{ animationDelay: ".2s" }}>
            Réponses citant leurs sources, résumés à trois niveaux et quiz corrigés, générés à partir de vos documents.
          </p>
          <ul className="animate-up mt-6 space-y-2" style={{ animationDelay: ".25s" }}>
            <Check>Chaque réponse cite le document et la page</Check>
            <Check>Refus clair quand l'information est absente</Check>
            <Check>Résumés, quiz et chat au même endroit</Check>
          </ul>
          <div className="animate-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: ".3s" }}>
            <Link href="/chat" className="btn-glow inline-flex items-center gap-2 rounded-xl px-7 py-3.5 font-semibold transition active:scale-95">Commencer le chat {I.arrow}</Link>
            <Link href="/documents" className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">Ajouter un document</Link>
          </div>
        </div>

        {/* Aperçu du chat */}
        <div className="animate-up" style={{ animationDelay: ".35s" }}>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-indigo-500/10 backdrop-blur-md">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
              <span className="ml-2 text-xs text-slate-500">EduRAG · Chat</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-end"><div className="btn-glow max-w-[85%] rounded-2xl px-4 py-2.5">Qu'est-ce que le Masked Language Modeling ?</div></div>
              <div className="max-w-[92%] rounded-2xl bg-white/10 px-4 py-3 text-slate-200">
                Le MLM consiste à masquer aléatoirement une partie des mots d'une phrase et à entraîner le modèle à les prédire. <span className="text-cyan-300">[Source 1]</span>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs text-indigo-300 ring-1 ring-indigo-400/30">Chapitre 4 - BERT, p.14</span>
                </div>
              </div>
              <div className="flex justify-end"><div className="btn-glow max-w-[85%] rounded-2xl px-4 py-2.5">Comment faire un couscous ?</div></div>
              <div className="max-w-[92%] rounded-2xl bg-white/10 px-4 py-3 text-slate-300">Je ne trouve pas la réponse dans les documents.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CHIFFRES */}
      <Reveal>
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center backdrop-blur-md">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">{s.icon}</div>
              <div className="gradient-text text-xl font-extrabold">{s.v}</div>
              <div className="mt-0.5 text-sm text-slate-400">{s.l}</div>
            </div>
          ))}
        </section>
      </Reveal>

      {/* FONCTIONNALITÉS */}
      <section>
        <Reveal>
          <h2 className="text-3xl font-bold text-white">Tout pour réviser</h2>
          <p className="mt-2 text-slate-400">Quatre outils, un seul espace de travail.</p>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.href} delay={i * 100}>
              <Link href={f.href} className="group block h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1.5 hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/20">
                <div className="btn-glow flex h-12 w-12 items-center justify-center rounded-xl transition group-hover:scale-110">{f.icon}</div>
                <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{f.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-cyan-300 opacity-0 transition group-hover:opacity-100">Ouvrir {I.arrow}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* POURQUOI */}
      <section>
        <Reveal><h2 className="mb-8 text-3xl font-bold text-white">Pourquoi EduRAG</h2></Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {WHY.map((w, i) => (
            <Reveal key={w.t} delay={i * 100}>
              <div className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">{w.icon}</div>
                <h3 className="mt-4 font-semibold text-white">{w.t}</h3>
                <p className="mt-1.5 text-sm text-slate-400">{w.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PIPELINE */}
      <section>
        <Reveal>
          <h2 className="text-3xl font-bold text-white">Comment ça marche</h2>
          <p className="mt-2 text-slate-400">Du PDF à la réponse sourcée.</p>
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {PIPELINE.map((p, i) => (
              <div key={p.t} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur-md">
                <span className="absolute -top-2 left-3 rounded-full bg-indigo-500 px-2 text-[10px] font-bold text-white">{i + 1}</span>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">{p.icon}</div>
                <div className="mt-2 text-sm font-semibold text-white">{p.t}</div>
                <div className="text-xs text-slate-400">{p.d}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl">
        <Reveal><h2 className="mb-6 text-center text-3xl font-bold text-white">Questions fréquentes</h2></Reveal>
        <div className="space-y-3">
          {FAQ.map((f) => (
            <Reveal key={f.q}>
              <details className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md open:border-indigo-400/40">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-white">
                  {f.q}
                  <span className="text-cyan-300 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Reveal>
        <section className="btn-glow rounded-3xl p-10 text-center">
          <h2 className="text-3xl font-extrabold">Prêt à réviser autrement ?</h2>
          <p className="mx-auto mt-2 max-w-xl opacity-90">Ajoutez votre cours et posez votre première question.</p>
          <Link href="/documents" className="mt-6 inline-block rounded-xl bg-white px-7 py-3 font-semibold text-indigo-700 transition hover:scale-105">Commencer maintenant</Link>
        </section>
      </Reveal>
    </div>
  );
}
