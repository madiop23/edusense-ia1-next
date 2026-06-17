"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Firebase nous dit si quelqu'un est connecté ou non
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Connecté → on autorise l'affichage
        setAuthorized(true);
        setLoading(false);
      } else {
        // Pas connecté → retour au login
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Pendant la vérification, on affiche un petit écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si autorisé, on affiche le contenu de la page
  return authorized ? children : null;
}