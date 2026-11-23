import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const API = "http://localhost:8000";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google,
    // La page de login vérifie le mot de passe auprès du backend ; ici on valide seulement le token reçu.
    Credentials({
      credentials: { token: {} },
      async authorize(credentials) {
        try {
          const res = await fetch(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${credentials.token}` },
          });
          if (!res.ok) return null;
          const u = await res.json();
          return { id: u.id, name: u.name, email: u.email, role: u.role, accessToken: credentials.token };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update" && session?.name) token.name = session.name;
      if (account?.provider === "google") {
        try {
          const res = await fetch(`${API}/auth/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Internal-Secret": process.env.INTERNAL_API_SECRET || "",
            },
            body: JSON.stringify({ name: user?.name || "", email: user?.email }),
          });
          if (res.ok) {
            const u = await res.json();
            token.accessToken = u.token;
            token.role = u.role;
            token.uid = u.id;
          }
        } catch {}
      } else if (user) {
        token.accessToken = user.accessToken;
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.role = token.role;
      session.user.id = token.uid;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});