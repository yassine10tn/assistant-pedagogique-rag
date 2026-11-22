import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "EduRAG : Assistant pédagogique",
  description: "Résumés, quiz et chatbot RAG sur vos cours",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={font.className}>
        <div className="grid-bg" />
        <div className="blob" style={{ width: 520, height: 520, background: "#6366f1", top: -160, left: -120 }} />
        <div className="blob" style={{ width: 460, height: 460, background: "#22d3ee", top: 120, right: -160, animationDelay: "-5s" }} />
        <div className="relative z-10">
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}