import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const API = "http://localhost:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // Enregistre l'utilisateur Google dans la base SQLite du backend
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          await fetch(`${API}/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: user.name || "", email: user.email }),
          });
        } catch {
          // Le login continue même si le backend est hors ligne
        }
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});