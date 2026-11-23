import "./globals.css";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Providers from "../components/Providers";

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata = {
  title: "EduRAG : Assistant pédagogique",
  description: "Résumés, quiz et chatbot RAG sur vos cours",
};

const themeScript = `try{var t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={font.className}>
        <Providers>
          <div className="grid-bg" />
          <div className="blob" style={{ width: 520, height: 520, background: "#6366f1", top: -160, left: -120 }} />
          <div className="blob" style={{ width: 460, height: 460, background: "#22d3ee", top: 120, right: -160, animationDelay: "-5s" }} />
          <div className="relative z-10 flex min-h-screen flex-col">
            <Navbar />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}