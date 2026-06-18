"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import RepresentativeSidebar from "@/components/RepresentativeSidebar";

export default function RepresentativeLayout({ children }) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <RepresentativeSidebar />
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}