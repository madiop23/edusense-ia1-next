"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherAlertsPage() {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiTexts, setAiTexts] = useState({}); // { studentId: texte IA }
  const [aiLoadingId, setAiLoadingId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // 1. Classes affectées au prof
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myClassIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            if (a.data().teacherId === user.uid) myClassIds.add(c.id);
          });
        }

        // 2. Élèves de ses classes
        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        const myStudents = studentsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => myClassIds.has(s.classId));

        // 3. Notes publiées
        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        const allGrades = gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((g) => g.published);

        // 4. Sessions de présence
        const attSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "attendanceSessions"));
        const allSessions = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 5. Calculer le risque pour chaque élève (RÈGLES)
        const results = myStudents.map((student) => {
          // Moyenne des notes
          const studentGrades = allGrades.filter((g) => g.studentId === student.id);
          const average = studentGrades.length > 0
            ? (studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
            : null;

          // Absences + retards
          let absences = 0;
          allSessions.forEach((session) => {
            const rec = (session.records || []).find((r) => r.studentId === student.id);
            if (rec && (rec.status === "absent" || rec.status === "late")) absences++;
          });

          // Règle de risque
          let risk = "faible";
          const lowAvg = average !== null && average < 10;
          const manyAbs = absences >= 3;
          if (lowAvg && manyAbs) risk = "élevé";
          else if (lowAvg || manyAbs) risk = "moyen";

          return {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            average: average !== null ? average.toFixed(1) : "—",
            absences,
            risk,
          };
        });

        // Trier : risque élevé en premier
        const order = { "élevé": 0, "moyen": 1, "faible": 2 };
        results.sort((a, b) => order[a.risk] - order[b.risk]);

        setAnalysis(results);
      } catch (err) {
        console.error("Erreur analyse:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const getAIRecommendation = async (student) => {
    setAiLoadingId(student.id);
    try {
      const response = await fetch("/api/dropout-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student.name,
          average: student.average,
          absences: student.absences,
          riskLevel: student.risk,
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAiTexts((prev) => ({ ...prev, [student.id]: data.text }));
      }
    } catch (err) {
      console.error("Erreur IA:", err);
    } finally {
      setAiLoadingId(null);
    }
  };

  const riskBadge = (risk) => {
    const map = {
      "élevé": "bg-red-100 text-red-700",
      "moyen": "bg-amber-100 text-amber-700",
      "faible": "bg-green-100 text-green-700",
    };
    return map[risk] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Alertes — Suivi des élèves</h1>
        <p className="text-green-100 text-sm">Détection des élèves en difficulté (notes + absences).</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Analyse en cours...</p>
      ) : analysis.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun élève à analyser (pas de classe affectée).</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-700">Élèves ({analysis.length})</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Risque élevé : moyenne &lt; 10 et 3+ absences · Moyen : l'un des deux
            </p>
          </div>
          <div className="divide-y">
            {analysis.map((s) => (
              <div key={s.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">Moyenne : {s.average}/20 · Absences/retards : {s.absences}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${riskBadge(s.risk)}`}>
                    Risque {s.risk}
                  </span>
                </div>

                {/* Recommandation IA (seulement pour risque moyen/élevé) */}
                {s.risk !== "faible" && (
                  <div className="mt-2">
                    {aiTexts[s.id] ? (
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">{aiTexts[s.id]}</div>
                    ) : (
                      <button onClick={() => getAIRecommendation(s)} disabled={aiLoadingId === s.id}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                        {aiLoadingId === s.id ? "Analyse IA..." : "Recommandation IA"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}