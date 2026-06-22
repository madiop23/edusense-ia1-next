"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function SchoolAlertsPage() {
  const [analysis, setAnalysis] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiTexts, setAiTexts] = useState({});
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [filterRisk, setFilterRisk] = useState("tous");

  useEffect(() => {
    const load = async () => {
      try {
        // Classes (pour afficher le nom de la classe de chaque élève)
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setClasses(allClasses);

        // TOUS les élèves de l'école (pas de filtre par affectation)
        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        const allStudents = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Notes publiées
        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        const allGrades = gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((g) => g.published);

        // Présences
        const attSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "attendanceSessions"));
        const allSessions = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Calcul du risque (mêmes règles que côté enseignant)
        const results = allStudents.map((student) => {
          const studentGrades = allGrades.filter((g) => g.studentId === student.id);
          const average = studentGrades.length > 0
            ? (studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
            : null;

          let absences = 0;
          allSessions.forEach((session) => {
            const rec = (session.records || []).find((r) => r.studentId === student.id);
            if (rec && (rec.status === "absent" || rec.status === "late")) absences++;
          });

          let risk = "faible";
          const lowAvg = average !== null && average < 10;
          const manyAbs = absences >= 3;
          if (lowAvg && manyAbs) risk = "élevé";
          else if (lowAvg || manyAbs) risk = "moyen";

          return {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            classId: student.classId,
            average: average !== null ? average.toFixed(1) : "—",
            absences,
            risk,
          };
        });

        const order = { "élevé": 0, "moyen": 1, "faible": 2 };
        results.sort((a, b) => order[a.risk] - order[b.risk]);

        setAnalysis(results);
      } catch (err) {
        console.error("Erreur analyse:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
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

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  const riskBadge = (risk) => {
    const map = {
      "élevé": "bg-red-100 text-red-700",
      "moyen": "bg-amber-100 text-amber-700",
      "faible": "bg-green-100 text-green-700",
    };
    return map[risk] || "bg-gray-100 text-gray-700";
  };

  // Filtrer selon le risque sélectionné
  const filtered = filterRisk === "tous" ? analysis : analysis.filter((s) => s.risk === filterRisk);

  // Compteurs pour le résumé
  const counts = {
    élevé: analysis.filter((s) => s.risk === "élevé").length,
    moyen: analysis.filter((s) => s.risk === "moyen").length,
    faible: analysis.filter((s) => s.risk === "faible").length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Alertes — Vue globale de l'école</h1>
        <p className="text-green-100 text-sm">Suivi du décrochage pour tous les élèves.</p>
      </div>

      {/* Cartes résumé */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{counts.élevé}</p>
          <p className="text-xs text-gray-500 mt-1">Risque élevé</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{counts.moyen}</p>
          <p className="text-xs text-gray-500 mt-1">Risque moyen</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{counts.faible}</p>
          <p className="text-xs text-gray-500 mt-1">Risque faible</p>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-2">
        {["tous", "élevé", "moyen", "faible"].map((r) => (
          <button key={r} onClick={() => setFilterRisk(r)}
                  className={`text-sm px-3 py-1.5 rounded-lg transition ${
                    filterRisk === r ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-green-400"
                  }`}>
            {r === "tous" ? "Tous" : `Risque ${r}`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Analyse en cours...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun élève dans cette catégorie.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold text-gray-700">Élèves ({filtered.length})</h2>
          </div>
          <div className="divide-y">
            {filtered.map((s) => (
              <div key={s.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400">
                      {className(s.classId)} · Moyenne : {s.average}/20 · Absences : {s.absences}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${riskBadge(s.risk)}`}>
                    Risque {s.risk}
                  </span>
                </div>

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