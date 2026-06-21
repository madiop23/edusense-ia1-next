"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SchoolSidebar({ open, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const links = [
    { href: "/school/dashboard", label: "Tableau de bord", icon: "🏠" },
    { href: "/school/classes", label: "Classes", icon: "🏫" },
    { href: "/school/students", label: "Élèves", icon: "🎓" },
    { href: "/school/invites", label: "Codes parents", icon: "🔑" },
  ];

  return (
    <>
      {open && <div onClick={onClose} className="fixed inset-0 bg-black/40 z-30 md:hidden"></div>}
      <aside
        className={`w-64 text-white flex flex-col fixed h-full z-40 transition-transform duration-300
                    ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ background: "linear-gradient(180deg, #14532d 0%, #166534 50%, #15803d 100%)" }}
      >
        <div className="px-6 py-5 border-b border-green-700/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center font-bold">E</div>
            <div>
              <p className="font-bold text-sm">EDU-SENSE</p>
              <p className="text-xs text-green-300">Espace Principal</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-green-200 hover:text-white text-xl">✕</button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition ${
                      active ? "bg-white/20 text-white font-medium" : "text-green-100 hover:bg-white/10 hover:text-white"
                    }`}>
                <span>{link.icon}</span>{link.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-green-700/40">
          <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-200 hover:text-white hover:bg-red-500/20 rounded-xl transition">
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}