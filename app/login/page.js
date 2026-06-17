"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Connexion avec Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Aller chercher le profil dans Firestore (collection users)
      const userDoc = await getDoc(doc(db, "users", uid));

      if (!userDoc.exists()) {
        setError("Profil introuvable. Contactez l'administration.");
        setLoading(false);
        return;
      }

      // 3. Récupérer le rôle
      const userData = userDoc.data();
      const role = userData.role;

      // 4. Rediriger vers le bon dashboard selon le rôle
      switch (role) {
        case "admin":
          router.push("/admin/dashboard");
          break;
        case "school":
          router.push("/school/dashboard");
          break;
        case "representative":
          router.push("/representative/dashboard");
          break;
        case "teacher":
          router.push("/teacher/dashboard");
          break;
        case "parent":
          router.push("/parent/dashboard");
          break;
        case "student":
          router.push("/student/dashboard");
          break;
        default:
          setError("Rôle inconnu.");
      }
    } catch (err) {
      setError("Email ou mot de passe incorrect.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold">
            E
          </div>
          <span className="font-bold text-gray-800 text-lg">
            EDU-SENSE <span className="text-green-600">IA</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Connexion</h1>
        <p className="text-gray-500 text-sm mb-6">Accédez à votre espace</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="exemple@edusense.com"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}