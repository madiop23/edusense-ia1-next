"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import TeacherSidebar from "@/components/TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <TeacherSidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}