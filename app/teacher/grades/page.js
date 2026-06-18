"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherGradesPage() {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  // Champs du formulaire
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [score, setScore] = useState("");
  const [examLabel, setExamLabel] = useState("");

  const gradesRef = collection(db, "schools", SCHOOL_ID, "grades");

  // Récupérer l'enseignant connecté
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUid(user.uid);
    });
    return () => unsub();
  }, []);

  // Charger toutes les données
  const loadData = async () => {
    setLoading(true);
    try {
      // Élèves (profils Student)
      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Matières
      const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
      setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Trimestres
      const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
      setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Notes
      const gradesSnap = await getDocs(gradesRef);
      setGrades(gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ajouter une note (brouillon : published = false)
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!studentId || !subjectId || !termId || score === "") return;

    // Retrouver la classe de l'élève (depuis son profil Student)
    const student = students.find((s) => s.id === studentId);
    const classId = student?.classId || "";

    try {
      await addDoc(gradesRef, {
        studentId: studentId,
        subjectId: subjectId,
        classId: classId,
        termId: termId,
        score: parseFloat(score),
        maxScore: 20,
        examLabel: examLabel || "Évaluation",
        published: false,
        recordedBy: currentUid,
        createdAt: new Date(),
      });
      setStudentId("");
      setSubjectId("");
      setTermId("");
      setScore("");
      setExamLabel("");
      loadData();
    } catch (err) {
      console.error("Erreur ajout note:", err);
    }
  };

  // Publier une note (published = true)
  const handlePublish = async (id) => {
    try {
      await updateDoc(doc(db, "schools", SCHOOL_ID, "grades", id), { published: true });
      loadData();
    } catch (err) {
      console.error("Erreur publication:", err);
    }
  };

  // Supprimer
  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette note ?")) return;
    try {
      await deleteDoc(doc(db, "schools", SCHOOL_ID, "grades", id));
      loadData();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  // Helpers d'affichage
  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Élève inconnu";
  };
  const subjectName = (id) => subjects.find((x) => x.id === id)?.name || "Matière inconnue";
  const termName = (id) => terms.find((x) => x.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des notes</h1>
        <p className="text-green-100 text-sm">Saisissez et publiez les notes de vos élèves.</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Saisir une note</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Élève</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir un élève --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir une matière --</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir --</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note /20</label>
            <input type="number" min="0" max="20" step="0.25" value={score}
                   onChange={(e) => setScore(e.target.value)} placeholder="Ex: 15.5"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'évaluation</label>
            <input type="text" value={examLabel} onChange={(e) => setExamLabel(e.target.value)}
                   placeholder="Ex: Devoir 1"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>

          <div className="md:col-span-2">
            <button type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Enregistrer (brouillon)
            </button>
          </div>
        </form>
      </div>

      {/* Liste des notes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Notes enregistrées</h2>
          <span className="text-sm text-gray-500">{grades.length} note(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : grades.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune note. Saisissez-en une ci-dessus.</p>
        ) : (
          <div className="divide-y">
            {grades.map((g) => (
              <div key={g.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    g.score >= 14 ? "bg-green-100 text-green-700" : g.score >= 10 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                  }`}>
                    {g.score}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{studentName(g.studentId)}</p>
                    <p className="text-xs text-gray-400">
                      {subjectName(g.subjectId)} — {g.examLabel} — {termName(g.termId)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {g.published ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Publiée</span>
                  ) : (
                    <button onClick={() => handlePublish(g.id)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition">
                      Publier
                    </button>
                  )}
                  <button onClick={() => handleDelete(g.id)}
                          className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}