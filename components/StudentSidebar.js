"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function StudentSidebar({ open, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const links = [
    { href: "/student/dashboard", label: "Tableau de bord", icon: "🏠" },
    { href: "/notifications", label: "Notifications", icon: "🔔" },
    { href: "/student/grades", label: "Mes notes", icon: "⭐" },
    { href: "/student/attendance", label: "Mes présences", icon: "📋" },
    { href: "/student/timetable", label: "Emploi du temps", icon: "📅" },
    { href: "/student/assignments", label: "Mes devoirs", icon: "📝" },
    { href: "/student/assistant", label: "Assistant IA", icon: "💬" },
    { href: "/student/messages", label: "Messages", icon: "✉️" },
  ];

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 bg-black/40 z-30 md:hidden"></div>}
      <aside
        className={`w-64 text-white flex flex-col fixed h-full z-40 transition-transform duration-300
                    ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ background: "linear-gradient(180deg, #022B63 0%, #043a7f 55%, #0AAAFF 100%)" }}
      >
        <div className="px-6 py-5 border-b border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0AAAFF] to-[#5FBF56] rounded-xl flex items-center justify-center font-bold">E</div>
            <div>
              <p className="font-bold text-sm">EDU-SENSE</p>
              <p className="text-xs text-[#7FD1FF]">Espace Élève</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/70 hover:text-white text-xl">✕</button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition ${
                      active ? "bg-white/20 text-white font-medium" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}>
                <span>{link.icon}</span>{link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/15">
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-red-500/20 rounded-xl transition">
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}