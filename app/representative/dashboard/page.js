"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";

export default function RepresentativeDashboard() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Responsable");
        }
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const shortcuts = [
    { label: "Mes classes", icon: "🏫", href: "/representative/classes" },
    { label: "Messages", icon: "✉️", href: "/representative/messages" },
    { label: "Notifications", icon: "🔔", href: "/notifications" },
  ];

  const bannerStyle = { background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" };

  const shortcutClass =
    "group flex items-center gap-3 p-4 rounded-xl bg-gray-50 " +
    "hover:bg-green-50 border border-transparent hover:border-green-200 " +
    "transition-all duration-200 text-sm font-medium text-gray-700 hover:text-green-800";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease]">

      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lg" style={bannerStyle}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-10 right-16 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="relative">
          <p className="text-green-100 text-sm mb-1">Espace responsable</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-green-100 text-sm">Suivez votre périmètre.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-green-500"></span>
          Accès rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shortcuts.map((s, i) => (
            <Link key={i} href={s.href} className={shortcutClass}>
              <span className="text-xl group-hover:scale-110 transition-transform duration-200">{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}