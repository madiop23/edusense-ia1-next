"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
    <div
      className="min-h-screen relative flex items-center justify-center px-4 py-10"
      style={{
        backgroundImage: "url('/images/login-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay navy pour garder l'identité de marque et assurer la lisibilité */}
      <div className="absolute inset-0 bg-[#022B63]/75" />

      {/* Contenu */}
      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Logo + slogan, au-dessus de la carte, comme un en-tête de marque */}
        <div className="mb-8 text-center">
          <Image
            src="/logo/edusense-logo-full.png"
            alt="EDU SENSE IA"
            width={260}
            height={83}
            priority
            className="h-auto w-[220px] mx-auto mb-3"
          />
          <p className="text-white/80 text-sm">
            Une gestion intelligente pour une éducation performante
          </p>
        </div>

        {/* Carte de connexion */}
        <div className="w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-[#022B63] text-center mb-1">
            Connexion
          </h1>
          <p className="text-gray-500 text-sm text-center mb-6">
            Accédez à votre espace
          </p>

          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="exemple@edusense.com"
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0AAAFF] focus:border-[#0AAAFF]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#0AAAFF] focus:border-[#0AAAFF]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5FBF56] hover:bg-[#4CAE46] text-white font-semibold py-3 rounded-xl text-sm transition disabled:opacity-50"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Parent avec un code ?{" "}
            <Link
              href="/register/parent"
              className="text-[#0AAAFF] font-medium hover:underline"
            >
              S'inscrire ici
            </Link>
          </p>
        </div>

        <p className="text-white/50 text-xs mt-6">EDU SENSE IA © 2026</p>
      </div>
    </div>
  );
}