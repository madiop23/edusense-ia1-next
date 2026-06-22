"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentFollowUpPage() {
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiTexts, setAiTexts] = useState({});
  const [aiLoadingId, setAiLoadingId] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Classes (pour les noms)
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 1. Trouver les enfants liés (parentLinks)
        const linksQuery = query(collection(db, "parentLinks"), where("parentId", "==", user.uid));
        const linksSnap = await getDocs(linksQuery);
        const studentIds = linksSnap.docs.map((d) => d.data().studentId);

        // Notes publiées + présences (une seule fois)
        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        const allGrades = gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((g) => g.published);

        const attSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "attendanceSessions"));
        const allSessions = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // 2. Pour chaque enfant, charger profil + calculer
        const results = [];
        for (const sid of studentIds) {
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sid));
          if (!sDoc.exists()) continue;
          const student = { id: sDoc.id, ...sDoc.data() };

          const studentGrades = allGrades.filter((g) => g.studentId === sid);
          const average = studentGrades.length > 0
            ? (studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length)
            : null;

          let absences = 0;
          allSessions.forEach((session) => {
            const rec = (session.records || []).find((r) => r.studentId === sid);
            if (rec && (rec.status === "absent" || rec.status === "late")) absences++;
          });

          let risk = "faible";
          const lowAvg = average !== null && average < 10;
          const manyAbs = absences >= 3;
          if (lowAvg && manyAbs) risk = "élevé";
          else if (lowAvg || manyAbs) risk = "moyen";

          results.push({
            id: sid,
            name: `${student.firstName} ${student.lastName}`,
            classId: student.classId,
            average: average !== null ? average.toFixed(1) : "—",
            absences,
            risk,
          });
        }
        setChildren(results);
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const getAIRecommendation = async (child) => {
    setAiLoadingId(child.id);
    try {
      const response = await fetch("/api/dropout-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: child.name,
          average: child.average,
          absences: child.absences,
          riskLevel: child.risk,
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAiTexts((prev) => ({ ...prev, [child.id]: data.text }));
      }
    } catch (err) {
      console.error("Erreur IA:", err);
    } finally {
      setAiLoadingId(null);
    }
  };

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  // Message rassurant selon le risque
  const statusMessage = (risk) => {
    if (risk === "faible") return { text: "Tout va bien", color: "bg-green-100 text-green-700" };
    if (risk === "moyen") return { text: "À suivre", color: "bg-amber-100 text-amber-700" };
    return { text: "Attention requise", color: "bg-red-100 text-red-700" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Suivi de mon enfant</h1>
        <p className="text-green-100 text-sm">Suivez la scolarité de vos enfants à distance.</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun enfant rattaché.</p>
          <p className="text-xs mt-1">Utilisez un code d'invitation dans "Mes enfants".</p>
        </div>
      ) : (
        <div className="space-y-4">
          {children.map((c) => {
            const status = statusMessage(c.risk);
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold uppercase">
                      {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">Classe : {className(c.classId)}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${status.color}`}>{status.text}</span>
                </div>

                {/* Indicateurs */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800">{c.average}<span className="text-sm text-gray-400">/20</span></p>
                    <p className="text-xs text-gray-500">Moyenne générale</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-800">{c.absences}</p>
                    <p className="text-xs text-gray-500">Absences / retards</p>
                  </div>
                </div>

                {/* Conseil IA pour les cas à suivre */}
                {c.risk !== "faible" && (
                  <div>
                    {aiTexts[c.id] ? (
                      <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800">
                        <span className="font-medium">Conseil : </span>{aiTexts[c.id]}
                      </div>
                    ) : (
                      <button onClick={() => getAIRecommendation(c)} disabled={aiLoadingId === c.id}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                        {aiLoadingId === c.id ? "Analyse..." : "Voir les conseils"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}