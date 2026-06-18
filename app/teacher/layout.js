"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherSidebar from "@/components/TeacherSidebar";

export default function TeacherLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <TeacherSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} className="text-green-700 text-2xl">☰</button>
          <span className="font-bold text-gray-800">EDU-SENSE <span className="text-green-600">IA</span></span>
        </div>
        <main className="md:ml-64 p-4 md:p-8 pt-20 md:pt-8">{children}</main>
      </div>
    </ProtectedRoute>
  );
}