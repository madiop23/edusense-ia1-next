"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherDashboard() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ classes: 0, grades: 0, assignments: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Nom de l'enseignant
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Enseignant");
        }

        // Mes classes (via affectations)
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const myClassIds = new Set();
        for (const c of classesSnap.docs) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            if (a.data().teacherId === user.uid) myClassIds.add(c.id);
          });
        }

        // Notes saisies par moi
        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        const myGrades = gradesSnap.docs.filter((d) => d.data().recordedBy === user.uid);

        // Devoirs créés par moi
        const assignmentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "assignments"));
        const myAssignments = assignmentsSnap.docs.filter((d) => d.data().teacherId === user.uid);

        setStats({
          classes: myClassIds.size,
          grades: myGrades.length,
          assignments: myAssignments.length,
        });
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const cards = [
    { label: "Mes classes", value: stats.classes, icon: "🏫", ring: "bg-green-50 text-green-600" },
    { label: "Notes saisies", value: stats.grades, icon: "📝", ring: "bg-emerald-50 text-emerald-600" },
    { label: "Devoirs créés", value: stats.assignments, icon: "📚", ring: "bg-teal-50 text-teal-600" },
  ];

  const shortcuts = [
    { label: "Saisir une note", icon: "📝", href: "/teacher/grades" },
    { label: "Faire l'appel", icon: "✅", href: "/teacher/attendance" },
    { label: "Créer un devoir", icon: "📚", href: "/teacher/assignments" },
    { label: "Mon emploi du temps", icon: "🗓️", href: "/teacher/timetable" },
    { label: "Messages", icon: "✉️", href: "/teacher/messages" },
    { label: "Alertes décrochage", icon: "⚠️", href: "/teacher/alerts" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease]">

      {/* Bannière */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-10 right-16 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="relative">
          <p className="text-green-100 text-sm mb-1">Espace enseignant</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-green-100 text-sm">Bienvenue dans votre espace de travail.</p>
        </div>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <div key={i}
               style={{ animationDelay: `${i * 80}ms` }}
               className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-[fadeUp_0.5s_ease_both]">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${c.ring} group-hover:scale-110 transition-transform duration-300`}>
              {c.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800 tabular-nums">
              {loading ? <span className="inline-block w-8 h-8 rounded-lg bg-gray-100 animate-pulse"></span> : c.value}
            </p>
            <p className="text-sm text-gray-500 font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Raccourcis */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-green-500"></span>
          Accès rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shortcuts.map((s, i) => (
            <Link key={i} href={s.href}
                  className="group flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-green-50 border border-transparent hover:border-green-200 transition-all duration-200 text-sm font-medium text-gray-700 hover:text-green-800">
              <span className="text-xl group-hover:scale-110 transition-transform duration-200">{s.icon}</span>
              {s.label}
              <span className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200 text-green-500">→</span>
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