"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function StudentGradesPage() {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // 1. Récupérer le profil User pour avoir le studentId
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const studentId = userDoc.exists() ? userDoc.data().studentId : null;

        if (!studentId) {
          setLoading(false);
          return;
        }

        // 2. Charger les matières et trimestres (pour afficher les noms)
        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
        setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 3. Charger les notes de CET élève, PUBLIÉES uniquement
        const gradesQuery = query(
          collection(db, "schools", SCHOOL_ID, "grades"),
          where("studentId", "==", studentId),
          where("published", "==", true)
        );
        const gradesSnap = await getDocs(gradesQuery);
        setGrades(gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const subjectName = (id) => subjects.find((x) => x.id === id)?.name || "Matière";
  const termName = (id) => terms.find((x) => x.id === id)?.name || "—";

  // Calcul de la moyenne générale
  const moyenne = grades.length > 0
    ? (grades.reduce((sum, g) => sum + g.score, 0) / grades.length).toFixed(2)
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes notes</h1>
        <p className="text-green-100 text-sm">
          {moyenne ? `Moyenne générale : ${moyenne}/20` : "Consultez vos résultats publiés."}
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Résultats</h2>
          <span className="text-sm text-gray-500">{grades.length} note(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : grades.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune note publiée pour le moment.</p>
        ) : (
          <div className="divide-y">
            {grades.map((g) => (
              <div key={g.id} className="px-6 py-3 flex items-center gap-4 hover:bg-green-50 transition">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                  g.score >= 14 ? "bg-green-100 text-green-700" : g.score >= 10 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                }`}>
                  {g.score}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{subjectName(g.subjectId)}</p>
                  <p className="text-xs text-gray-400">{g.examLabel} — {termName(g.termId)}</p>
                </div>
                <span className="text-sm text-gray-500">{g.score}/{g.maxScore}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}