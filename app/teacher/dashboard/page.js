"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function TeacherDashboard() {
  const [name, setName] = useState("");

  useEffect(() => {
    // Récupérer le nom de l'enseignant connecté
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setName(userDoc.data().displayName || "Enseignant");
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
        <p className="text-green-100 text-sm">Bienvenue dans votre espace enseignant.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Mes classes</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Notes saisies</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-xs text-gray-500 uppercase mb-1">Présences</p>
          <p className="text-3xl font-bold text-gray-800">—</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-600">Utilisez le menu de gauche pour gérer vos classes, notes et présences.</p>
      </div>
    </div>
  );
}