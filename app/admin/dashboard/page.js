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
    { label: "Classes", value: stats.classes, icon: "🏫", href: "/admin/classes", color: "from-green-400 to-green-600" },
    { label: "Matières", value: stats.subjects, icon: "📚", href: "/admin/subjects", color: "from-emerald-400 to-emerald-600" },
    { label: "Élèves", value: stats.students, icon: "🎓", href: "/admin/users", color: "from-teal-400 to-teal-600" },
    { label: "Enseignants", value: stats.teachers, icon: "👨‍🏫", href: "/admin/users", color: "from-lime-500 to-green-600" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Bannière */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Bonjour, {name} 👋</h1>
        <p className="text-green-100 text-sm">Voici un aperçu de votre établissement.</p>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Link key={i} href={c.href}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition group">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-xl mb-3`}>
              {c.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800">{loading ? "…" : c.value}</p>
            <p className="text-sm text-gray-500 group-hover:text-green-600 transition">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Raccourcis */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link href="/admin/classes" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition text-sm font-medium text-green-800">
            🏫 Gérer les classes
          </Link>
          <Link href="/admin/subjects" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition text-sm font-medium text-green-800">
            📚 Gérer les matières
          </Link>
          <Link href="/admin/terms" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition text-sm font-medium text-green-800">
            📆 Années & Trimestres
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition text-sm font-medium text-green-800">
            👥 Gérer les utilisateurs
          </Link>
        </div>
      </div>

    </div>
  );
}