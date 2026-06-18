"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SchoolDashboard() {
  const [name, setName] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Principal");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Bonjour, {name} 👋</h1>
        <p className="text-green-100 text-sm">Pilotez votre établissement.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-600">Gérez les classes et les élèves de votre école via le menu.</p>
      </div>
    </div>
  );
}