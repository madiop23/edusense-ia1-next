"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import SchoolSidebar from "@/components/SchoolSidebar";

export default function SchoolLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <SchoolSidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}