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
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const me = usersList.find((u) => u.id === user.uid);
      setName(me?.displayName || "Admin");

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
    { label: "Classes", value: stats.classes, icon: "🏫", href: "/admin/classes", bg: "bg-[#E6F1FB]", fg: "text-[#0C447C]" },
    { label: "Matieres", value: stats.subjects, icon: "📚", href: "/admin/subjects", bg: "bg-[#EAF3DE]", fg: "text-[#27500A]" },
    { label: "Eleves", value: stats.students, icon: "🎓", href: "/admin/users", bg: "bg-[#E6F1FB]", fg: "text-[#022B63]" },
    { label: "Enseignants", value: stats.teachers, icon: "👨‍🏫", href: "/admin/users", bg: "bg-[#EAF3DE]", fg: "text-[#3B6D11]" },
  ];

  const shortcuts = [
    { label: "Gerer les classes", icon: "🏫", href: "/admin/classes" },
    { label: "Gerer les matieres", icon: "📚", href: "/admin/subjects" },
    { label: "Annees et trimestres", icon: "📆", href: "/admin/terms" },
    { label: "Gerer les utilisateurs", icon: "👥", href: "/admin/users" },
    { label: "Emploi du temps", icon: "🗓️", href: "/admin/timetable" },
    { label: "Factures", icon: "💳", href: "/admin/invoices" },
  ];

  const barData = [
    { label: "Classes", value: stats.classes, color: "#022B63" },
    { label: "Matieres", value: stats.subjects, color: "#0AAAFF" },
    { label: "Eleves", value: stats.students, color: "#5FBF56" },
    { label: "Enseignants", value: stats.teachers, color: "#3FAE8C" },
  ];
  const maxBar = Math.max(1, ...barData.map((b) => b.value));

  const totalPeople = stats.students + stats.teachers;
  const studentsRatio = totalPeople > 0 ? stats.students / totalPeople : 0;
  const circumference = 2 * Math.PI * 42;
  const studentsArc = circumference * studentsRatio;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease]">

      <div
        className="relative overflow-hidden rounded-3xl p-7 text-white shadow-lg"
        style={{ background: "linear-gradient(120deg, #022B63 0%, #054a8f 55%, #0AAAFF 100%)" }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10"></div>
        <div className="absolute -bottom-10 right-16 w-28 h-28 rounded-full bg-white/5"></div>
        <div className="relative">
          <p className="text-white/70 text-sm mb-1">Tableau de bord</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-white/70 text-sm">Voici un apercu de votre etablissement.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <Link
            key={i}
            href={c.href}
            style={{ animationDelay: `${i * 80}ms` }}
            className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-[fadeUp_0.5s_ease_both]"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 ${c.bg} ${c.fg} group-hover:scale-110 transition-transform duration-300`}>
              {c.icon}
            </div>
            <p className="text-3xl font-bold text-gray-800 tabular-nums">
              {loading ? <span className="inline-block w-8 h-8 rounded-lg bg-gray-100 animate-pulse"></span> : c.value}
            </p>
            <p className="text-sm text-gray-500 group-hover:text-[#0AAAFF] transition font-medium mt-0.5">{c.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[#0AAAFF]"></span>
            Repartition par categorie
          </h2>
          <div className="space-y-3">
            {barData.map((b, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{b.label}</span>
                  <span className="font-semibold text-gray-700 tabular-nums">{loading ? "-" : b.value}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: loading ? "0%" : `${Math.max(4, (b.value / maxBar) * 100)}%`,
                      backgroundColor: b.color,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center justify-center">
          <h2 className="font-semibold text-gray-700 mb-4 self-start flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[#5FBF56]"></span>
            Eleves / Enseignants
          </h2>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="42" fill="none" stroke="#E6F1FB" strokeWidth="14" />
            <circle
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke="#022B63"
              strokeWidth="14"
              strokeDasharray={`${loading ? 0 : studentsArc} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
              style={{ transition: "stroke-dasharray 0.7s ease" }}
            />
            <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1f2937">
              {loading ? "-" : totalPeople}
            </text>
            <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#9ca3af">
              personnes
            </text>
          </svg>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#022B63] inline-block"></span>Eleves
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6F1FB] inline-block"></span>Enseignants
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-[#5FBF56]"></span>
          Acces rapide
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shortcuts.map((s, i) => (
            <Link
              key={i}
              href={s.href}
              className="group flex items-center gap-3 p-4 rounded-xl bg-gray-50 hover:bg-[#E6F1FB] border border-transparent hover:border-[#0AAAFF]/30 transition-all duration-200 text-sm font-medium text-gray-700 hover:text-[#022B63]"
            >
              <span className="text-xl group-hover:scale-110 transition-transform duration-200">{s.icon}</span>
              {s.label}
              <span className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-200 text-[#0AAAFF]">→</span>
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