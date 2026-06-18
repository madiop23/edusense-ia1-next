"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Charger les classes (pour afficher le nom de la classe de l'enfant)
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Trouver les liens parent → enfants (parentLinks)
        const linksQuery = query(
          collection(db, "parentLinks"),
          where("parentId", "==", user.uid)
        );
        const linksSnap = await getDocs(linksQuery);
        const studentIds = linksSnap.docs.map((d) => d.data().studentId);

        // Pour chaque enfant lié, charger son profil Student
        const kids = [];
        for (const sid of studentIds) {
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sid));
          if (sDoc.exists()) {
            kids.push({ id: sDoc.id, ...sDoc.data() });
          }
        }
        setChildren(kids);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes enfants</h1>
        <p className="text-green-100 text-sm">Suivez la scolarité de vos enfants.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Enfants rattachés</h2>
          <span className="text-sm text-gray-500">{children.length} enfant(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : children.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucun enfant rattaché. Utilisez votre code d'invitation pour lier votre enfant.
          </p>
        ) : (
          <div className="divide-y">
            {children.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-3 hover:bg-green-50 transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                  {(c.firstName?.[0] || "") + (c.lastName?.[0] || "")}
                </div>
                <div>
                  <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400">Classe : {className(c.classId)} • N° {c.admissionNumber}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}