export function passwordScore(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) s++;
  return s;
}

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const s = passwordScore(password);
  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Excellent"];
  const colors = ["bg-rose-500", "bg-rose-500", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];
  return (
    <div>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < s ? colors[s] : "bg-white/10"}`} />
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-400">Force : {labels[s]} (8 caractères min., lettres et chiffres)</p>
    </div>
  );
}