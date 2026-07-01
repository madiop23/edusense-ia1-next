"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function AdminDashboard() {
  const [name, setName] = useState("");
  const [stats, setStats] = useState({ classes: 0, subjects: 0, students: 0, teachers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      // Nom de l'admin
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const me = usersList.find((u) => u.id === user.uid);
      setName(me?.displayName || "Admin");

      // Stats
      try {
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        const teachers = usersList.filter((u) => u.role === "teacher" && u.schoolId === SCHOOL_ID);

        setStats({
          classes: classesSnap.size,
          subjects: subjectsSnap.size,
          students: studentsSnap.size,
          teachers: teachers.length,
        });
      } catch (err) {
        console.error("Erreur stats:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const cards = [
    { label: "Classes", value: stats.classes, icon: "🏫", href: "/admin/classes", ring: "bg-green-50 text-green-600" },
    { label: "Matières", value: stats.subjects, icon: "📚", href: "/admin/subjects", ring: "bg-emerald-50 text-emerald-600" },
    { label: "Élèves", value: stats.students, icon: "🎓", href: "/admin/users", ring: "bg-teal-50 text-teal-600" },
    { label: "Enseignants", value: stats.teachers, icon: "👨‍🏫", href: "/admin/users", ring: "bg-lime-50 text-lime-600" },
  ];

  const shortcuts = [
    { label: "Gérer les classes", icon: "🏫", href: "/admin/classes" },
    { label: "Gérer les matières", icon: "📚", href: "/admin/subjects" },
    { label: "Années & Trimestres", icon: "📆", href: "/admin/terms" },
    { label: "Gérer les utilisateurs", icon: "👥", href: "/admin/users" },
    { label: "Emploi du temps", icon: "🗓️", href: "/admin/timetable" },
    { label: "Factures", icon: "💳", href: "/admin/invoices" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease]">

      {/* Bannière */}
      <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        {/* cercles décoratifs */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-10 right-16 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="relative">
          <p className="text-green-100 text-sm mb-1">Tableau de bord</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-green-100 text-sm">Voici un aperçu de votre établissement.</p>
        </div>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Link key={i} href={c.href}
                style={{ animationDelay: `${i * 80}ms` }}
                className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-[fadeUp_0.5s_ease_both]">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${c.ring} group-hover:scale-110 transition-transform duration-300`}>
              {c.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800 tabular-nums">
              {loading ? <span className="inline-block w-8 h-8 rounded-lg bg-gray-100 animate-pulse"></span> : c.value}
            </p>
            <p className="text-sm text-gray-500 group-hover:text-green-600 transition font-medium mt-0.5">{c.label}</p>
          </Link>
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