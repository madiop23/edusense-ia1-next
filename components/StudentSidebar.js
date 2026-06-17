"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function StudentSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const links = [
    { href: "/student/dashboard", label: "Tableau de bord", icon: "🏠" },
    { href: "/student/grades", label: "Mes notes", icon: "⭐" },
    { href: "/student/attendance", label: "Mes présences", icon: "📋" },
    { href: "/student/timetable", label: "Emploi du temps", icon: "📅" },
  ];

  return (
    <aside className="w-64 text-white flex flex-col fixed h-full z-20"
           style={{ background: "linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%)" }}>
      <div className="px-6 py-5 border-b border-green-700/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center font-bold">
            E
          </div>
          <div>
            <p className="font-bold text-sm">EDU-SENSE</p>
            <p className="text-xs text-green-300">Espace Élève</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition ${
                active ? "bg-white/20 text-white font-medium" : "text-green-100 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-green-700/40">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-200 hover:text-white hover:bg-red-500/20 rounded-xl transition"
        >
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  );
}