"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherAppreciationsPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [appreciationText, setAppreciationText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        // Affectations → classes et matières du prof
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const myClassIds = new Set();
        const mySubjectIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            const data = a.data();
            if (data.teacherId === user.uid) {
              myClassIds.add(c.id);
              mySubjectIds.add(data.subjectId);
            }
          });
        }

        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => myClassIds.has(s.classId)));

        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => mySubjectIds.has(s.id)));

        const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
        setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        setGrades(gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((g) => g.recordedBy === user.uid));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Notes de l'élève dans la matière + trimestre sélectionnés
  const relevantGrades = () =>
    grades.filter((g) => g.studentId === studentId && g.subjectId === subjectId && (!termId || g.termId === termId));

  const handleGenerate = async () => {
    if (!studentId || !subjectId) {
      setMessage("Choisissez un élève et une matière.");
      return;
    }
    setMessage("");
    setAiLoading(true);

    const student = students.find((s) => s.id === studentId);
    const subject = subjects.find((s) => s.id === subjectId);

    try {
      const response = await fetch("/api/generate-appreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: student ? `${student.firstName} ${student.lastName}` : "Élève",
          subjectName: subject?.name || "Matière",
          grades: relevantGrades(),
        }),
      });
      const data = await response.json();
      if (data.text) {
        setAppreciationText(data.text);
      } else {
        setMessage("L'IA n'a pas pu générer d'appréciation.");
      }
    } catch (err) {
      console.error("Erreur IA:", err);
      setMessage("Erreur lors de la génération.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!studentId || !subjectId || !appreciationText.trim()) {
      setMessage("Complétez l'appréciation avant d'enregistrer.");
      return;
    }
    try {
      await addDoc(collection(db, "schools", SCHOOL_ID, "appreciations"), {
        studentId, subjectId, termId,
        teacherId: currentUid,
        text: appreciationText,
        createdAt: new Date(),
      });
      setMessage("✅ Appréciation enregistrée !");
      setAppreciationText("");
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      setMessage("Erreur lors de l'enregistrement.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Appréciations</h1>
        <p className="text-green-100 text-sm">Rédigez les appréciations, avec l'aide de l'IA.</p>
      </div>

      {!loading && students.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune classe affectée.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {message && (
            <div className="mb-4 px-4 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200">{message}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Élève</label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">-- Élève --</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">-- Matière --</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
              <select value={termId} onChange={(e) => setTermId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">-- Tous --</option>
                {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          {/* Aperçu des notes prises en compte */}
          {studentId && subjectId && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
              <span className="font-medium">Notes prises en compte : </span>
              {relevantGrades().length > 0
                ? relevantGrades().map((g) => `${g.score}/20`).join(", ")
                : "Aucune note pour cette sélection"}
            </div>
          )}

          <button onClick={handleGenerate} disabled={aiLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-xl text-sm transition disabled:opacity-50 mb-4">
            {aiLoading ? "Génération..." : "Générer une appréciation avec l'IA"}
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Appréciation</label>
            <textarea value={appreciationText} onChange={(e) => setAppreciationText(e.target.value)}
                      rows="4" placeholder="L'appréciation générée apparaîtra ici (modifiable)..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none mb-3" />
            <button onClick={handleSave}
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Enregistrer l'appréciation
            </button>
          </div>
        </div>
      )}

    </div>
  );
}