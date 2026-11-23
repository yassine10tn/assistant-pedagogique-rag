const COPYRIGHT_YEAR = 2026;

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/10 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-sm text-slate-500 sm:flex-row">
        <p>EduRAG : assistant pédagogique basé sur RAG et LLM · Projet NLP</p>
        <p>© {COPYRIGHT_YEAR} Yassine Amri. All rights reserved.</p>
      </div>
    </footer>
  );
}