"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherSubmissionsPage() {
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [submissionsByAssignment, setSubmissionsByAssignment] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  // Notation en cours
  const [gradingId, setGradingId] = useState(null); // submission id
  const [scoreInput, setScoreInput] = useState("");
  const [feedbackInput, setFeedbackInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = async (uid) => {
    try {
      // Matières et élèves (pour les noms)
      const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
      setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Devoirs de cet enseignant
      const aSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "assignments"));
      const myAssignments = aSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => a.teacherId === uid);
      setAssignments(myAssignments);

      // Rendus pour chaque devoir
      const subsMap = {};
      for (const a of myAssignments) {
        const subSnap = await getDocs(
          collection(db, "schools", SCHOOL_ID, "assignments", a.id, "submissions")
        );
        subsMap[a.id] = subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      setSubmissionsByAssignment(subsMap);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      loadData(user.uid);
    });
    return () => unsub();
  }, []);

    const handleAIGrade = async (assignment, submission) => {
        setAiLoading(true);
        try {
        const response = await fetch("/api/grade-submission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            assignmentTitle: assignment.title,
            assignmentDescription: assignment.description,
            studentAnswer: submission.note || "",
            maxScore: 20,
            }),
        });
        const data = await response.json();
        if (data.score !== null && data.score !== undefined) {
            setScoreInput(data.score.toString());
        }
        if (data.feedback) {
            setFeedbackInput(data.feedback);
        }
        } catch (err) {
        console.error("Erreur IA:", err);
        } finally {
        setAiLoading(false);
        }
    };

  const handleGrade = async (assignmentId, submissionId) => {
    if (scoreInput === "") return;
    try {
      await updateDoc(
        doc(db, "schools", SCHOOL_ID, "assignments", assignmentId, "submissions", submissionId),
        {
          score: parseFloat(scoreInput),
          feedback: feedbackInput,
          status: "graded",
          gradedBy: currentUid,
          gradedAt: new Date(),
        }
      );
      setGradingId(null);
      setScoreInput("");
      setFeedbackInput("");
      loadData(currentUid); // recharger
    } catch (err) {
      console.error("Erreur notation:", err);
    }
  };

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Élève";
  };
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Rendus des élèves</h1>
        <p className="text-green-100 text-sm">Corrigez et notez les devoirs rendus.</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun devoir créé. Créez un devoir d'abord.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const subs = submissionsByAssignment[a.id] || [];
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b">
                  <h2 className="font-semibold text-gray-800">{a.title}</h2>
                  <p className="text-xs text-gray-400">
                    {subjectName(a.subjectId)} — {subs.length} rendu(s)
                  </p>
                </div>

                {subs.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400">Aucun rendu pour ce devoir.</p>
                ) : (
                  <div className="divide-y">
                    {subs.map((s) => (
                      <div key={s.id} className="px-6 py-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-sm">{studentName(s.studentId)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              s.status === "graded" ? "bg-green-100 text-green-700" :
                              s.status === "late" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {s.status === "graded" ? "Noté" : s.status === "late" ? "En retard" : "Rendu"}
                            </span>
                          </div>
                          {s.status === "graded" && (
                            <span className="text-sm font-bold text-green-700">{s.score}/20</span>
                          )}
                        </div>

                        {/* Réponse de l'élève */}
                        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap mb-2">
                          {s.note || "(Pas de réponse texte)"}
                        </div>

                        {/* Zone de notation */}
                        {gradingId === s.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input type="number" min="0" max="20" step="0.25" value={scoreInput}
                                     onChange={(e) => setScoreInput(e.target.value)} placeholder="Note /20"
                                     className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                              <input type="text" value={feedbackInput}
                                     onChange={(e) => setFeedbackInput(e.target.value)} placeholder="Remarque (optionnel)"
                                     className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => handleAIGrade(a, s)} disabled={aiLoading}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg transition disabled:opacity-50">
                                {aiLoading ? "Analyse IA..." : "Proposer une note avec l'IA"}
                              </button>
                              <button onClick={() => handleGrade(a.id, s.id)}
                                      className="bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-1.5 rounded-lg transition">
                                Valider la note
                              </button>
                              <button onClick={() => { setGradingId(null); setScoreInput(""); setFeedbackInput(""); }}
                                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-1.5 rounded-lg transition">
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => {
                                    setGradingId(s.id);
                                    setScoreInput(s.score?.toString() || "");
                                    setFeedbackInput(s.feedback || "");
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-lg transition">
                            {s.status === "graded" ? "Modifier la note" : "Noter"}
                          </button>
                        )}
                      </div>
                    ))}
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