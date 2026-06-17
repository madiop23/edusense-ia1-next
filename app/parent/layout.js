"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import ParentSidebar from "@/components/ParentSidebar";

export default function ParentLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <ParentSidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}