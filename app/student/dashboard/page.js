"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function StudentDashboard() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ moyenne: "—", notes: 0, devoirs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Profil élève
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const studentId = userDoc.exists() ? userDoc.data().studentId : null;
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Élève");
        }

        if (studentId) {
          // Récupérer la classe de l'élève
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", studentId));
          const classId = sDoc.exists() ? sDoc.data().classId : null;

          // Notes publiées de l'élève
          const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
          const myGrades = gradesSnap.docs
            .map((d) => d.data())
            .filter((g) => g.studentId === studentId && g.published);

          // Calcul de la moyenne
          let moyenne = "—";
          if (myGrades.length > 0) {
            const total = myGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0);
            moyenne = (total / myGrades.length).toFixed(1);
          }

          // Devoirs publiés de sa classe
          let devoirsCount = 0;
          if (classId) {
            const assignSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "assignments"));
            devoirsCount = assignSnap.docs.filter(
              (d) => d.data().classId === classId && d.data().status === "published"
            ).length;
          }

          setStats({ moyenne, notes: myGrades.length, devoirs: devoirsCount });
        }
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const cards = [
    { label: "Moyenne générale", value: stats.moyenne, icon: "📊", ring: "bg-green-50 text-green-600", suffix: "/20" },
    { label: "Notes reçues", value: stats.notes, icon: "📝", ring: "bg-emerald-50 text-emerald-600", suffix: "" },
    { label: "Devoirs", value: stats.devoirs, icon: "📚", ring: "bg-teal-50 text-teal-600", suffix: "" },
  ];

  const shortcuts = [
    { label: "Mes notes", icon: "📝", href: "/student/grades" },
    { label: "Mes devoirs", icon: "📚", href: "/student/assignments" },
    { label: "Mon emploi du temps", icon: "🗓️", href: "/student/timetable" },
    { label: "Mes présences", icon: "✅", href: "/student/attendance" },
    { label: "Assistant IA", icon: "🤖", href: "/student/assistant" },
    { label: "Messages", icon: "✉️", href: "/student/messages" },
  ];

  const bannerStyle = { background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" };

  const cardClass =
    "group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm " +
    "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 " +
    "animate-[fadeUp_0.5s_ease_both]";

  const iconClass =
    "w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 " +
    "group-hover:scale-110 transition-transform duration-300";

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
          <p className="text-green-100 text-sm mb-1">Espace élève</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-green-100 text-sm">Voici un aperçu de ta scolarité.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div key={i} style={{ animationDelay: `${i * 80}ms` }} className={cardClass}>
            <div className={iconClass + " " + c.ring}>{c.icon}</div>
            <p className="text-3xl font-bold text-gray-800 tabular-nums">
              {loading ? (
                <span className="inline-block w-8 h-8 rounded-lg bg-gray-100 animate-pulse"></span>
              ) : (
                <>{c.value}<span className="text-lg text-gray-400">{c.suffix}</span></>
              )}
            </p>
            <p className="text-sm text-gray-500 font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
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
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}