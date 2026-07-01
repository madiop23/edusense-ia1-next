"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentDashboard() {
  const [name, setName] = useState("");
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Parent");
        }

        const linksSnap = await getDocs(
          query(collection(db, "parentLinks"), where("parentId", "==", user.uid))
        );

        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const classMap = {};
        classesSnap.docs.forEach((c) => { classMap[c.id] = c.data().name; });

        const childrenList = [];
        for (const link of linksSnap.docs) {
          const studentId = link.data().studentId;
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", studentId));
          if (sDoc.exists()) {
            const s = sDoc.data();
            childrenList.push({
              id: studentId,
              name: `${s.firstName} ${s.lastName}`,
              className: classMap[s.classId] || "—",
            });
          }
        }
        setChildren(childrenList);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const shortcuts = [
    { label: "Suivi de mon enfant", icon: "📊", href: "/parent/follow-up" },
    { label: "Mes enfants", icon: "👨‍👩‍👧", href: "/parent/children" },
    { label: "Frais & factures", icon: "💳", href: "/parent/fees" },
    { label: "Assistant IA", icon: "🤖", href: "/parent/assistant" },
    { label: "Messages", icon: "✉️", href: "/parent/messages" },
    { label: "Notifications", icon: "🔔", href: "/notifications" },
  ];

  const bannerStyle = { background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" };

  const avatarClass =
    "w-14 h-14 rounded-full flex items-center justify-center " +
    "text-white font-bold text-lg uppercase " +
    "group-hover:scale-110 transition-transform duration-300";

  const cardClass =
    "group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm " +
    "hover:shadow-xl hover:-translate-y-1 transition-all duration-300 " +
    "animate-[fadeUp_0.5s_ease_both] flex items-center gap-4";

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
          <p className="text-green-100 text-sm mb-1">Espace parent</p>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Bonjour, {name} 👋</h1>
          <p className="text-green-100 text-sm">Suivez la scolarité de vos enfants.</p>
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-green-500"></span>
          Mes enfants
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="h-12 w-12 rounded-full bg-gray-100 animate-pulse mb-3"></div>
                <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mb-2"></div>
                <div className="h-3 w-20 bg-gray-100 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 shadow-sm">
            <p>Aucun enfant rattaché pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {children.map((child, i) => (
              <Link key={child.id} href="/parent/follow-up" style={{ animationDelay: `${i * 80}ms` }} className={cardClass}>
                <div className={avatarClass} style={{ background: "linear-gradient(135deg, #4ade80, #16a34a)" }}>
                  {child.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{child.name}</p>
                  <p className="text-sm text-gray-500">Classe {child.className}</p>
                </div>
                <span className="text-green-500 opacity-0 group-hover:opacity-100 transition-all duration-200">→</span>
              </Link>
            ))}
          </div>
        )}
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