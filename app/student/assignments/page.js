"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, addDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mySubmissions, setMySubmissions] = useState({}); // { assignmentId: submission }
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState("");

  // Soumission en cours
  const [openId, setOpenId] = useState(null); // quel devoir on est en train de soumettre
  const [noteText, setNoteText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // 1. Trouver le profil élève (users/{uid} contient studentId)
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) { setLoading(false); return; }
        const sId = userDoc.data().studentId;
        setStudentId(sId);

        // 2. Trouver la classe de l'élève
        const studentDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sId));
        const myClassId = studentDoc.exists() ? studentDoc.data().classId : null;

        // 3. Matières (pour afficher les noms)
        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 4. Devoirs publiés de SA classe
        const aSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "assignments"));
        const myAssignments = aSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.status === "published" && a.classId === myClassId);
        setAssignments(myAssignments);

        // 5. Pour chaque devoir, vérifier si l'élève a déjà soumis
        const subs = {};
        for (const a of myAssignments) {
          const subSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "assignments", a.id, "submissions")
          );
          const mine = subSnap.docs.map((d) => ({ id: d.id, ...d.data() })).find((s) => s.studentId === sId);
          if (mine) subs[a.id] = mine;
        }
        setMySubmissions(subs);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (assignmentId) => {
    if (!noteText.trim()) {
      setMessage("Écrivez votre réponse avant de soumettre.");
      return;
    }
    setMessage("");
    try {
      // Déterminer si en retard
      const assignment = assignments.find((a) => a.id === assignmentId);
      const due = assignment?.dueAt?.toDate ? assignment.dueAt.toDate() : new Date(assignment.dueAt);
      const isLate = new Date() > due;

      const newSub = {
        studentId: studentId,
        files: [],
        note: noteText,
        submittedAt: new Date(),
        status: isLate ? "late" : "submitted",
      };

      const ref = await addDoc(
        collection(db, "schools", SCHOOL_ID, "assignments", assignmentId, "submissions"),
        newSub
      );

      // Mettre à jour l'état local
      setMySubmissions((prev) => ({ ...prev, [assignmentId]: { id: ref.id, ...newSub } }));
      setOpenId(null);
      setNoteText("");
    } catch (err) {
      console.error("Erreur soumission:", err);
      setMessage("Erreur lors de l'envoi.");
    }
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";
  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes devoirs</h1>
        <p className="text-green-100 text-sm">Consultez et rendez vos devoirs.</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun devoir publié pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => {
            const sub = mySubmissions[a.id];
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h2 className="font-semibold text-gray-800">{a.title}</h2>
                    <p className="text-xs text-gray-400">
                      {subjectName(a.subjectId)} — à rendre le {formatDate(a.dueAt)}
                    </p>
                  </div>
                  {sub ? (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      sub.status === "graded" ? "bg-green-100 text-green-700" :
                      sub.status === "late" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {sub.status === "graded" ? "Noté" : sub.status === "late" ? "Rendu (en retard)" : "Rendu"}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">À rendre</span>
                  )}
                </div>

                {/* Consignes */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap mb-3">
                  {a.description || "Pas de consigne détaillée."}
                </div>

                {/* Si déjà soumis : afficher la réponse + note éventuelle */}
                {sub ? (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-gray-500 mb-1">Votre réponse :</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.note}</p>
                    {sub.status === "graded" && (
                      <div className="mt-3 bg-green-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-green-800">Note : {sub.score}/20</p>
                        {sub.feedback && <p className="text-xs text-green-700 mt-1">Remarque : {sub.feedback}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  // Sinon : bouton/formulaire de soumission
                  <div className="border-t pt-3">
                    {openId === a.id ? (
                      <div>
                        {message && <p className="text-xs text-red-600 mb-2">{message}</p>}
                        <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)}
                                  rows="4" placeholder="Écrivez votre réponse ici..."
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none mb-2" />
                        <div className="flex gap-2">
                          <button onClick={() => handleSubmit(a.id)}
                                  className="bg-green-700 hover:bg-green-800 text-white text-sm px-4 py-2 rounded-lg transition">
                            Envoyer
                          </button>
                          <button onClick={() => { setOpenId(null); setNoteText(""); setMessage(""); }}
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-4 py-2 rounded-lg transition">
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setOpenId(a.id); setNoteText(""); }}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg transition">
                        Rendre ce devoir
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