"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function AssignmentsPage() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Champs du formulaire
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // Classes
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      const classesList = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClasses(classesList);

      // Matières
      const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
      setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Enseignants (users avec role teacher)
      const usersSnap = await getDocs(collection(db, "users"));
      const teachersList = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === "teacher" && u.schoolId === SCHOOL_ID);
      setTeachers(teachersList);

      // Affectations : on parcourt chaque classe et on lit ses subjectAssignments
      const allAssignments = [];
      for (const c of classesList) {
        const assignSnap = await getDocs(
          collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
        );
        assignSnap.docs.forEach((a) => {
          allAssignments.push({ id: a.id, classId: c.id, ...a.data() });
        });
      }
      setAssignments(allAssignments);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!classId || !subjectId || !teacherId) {
      setMessage("❌ Remplissez tous les champs.");
      return;
    }
    setMessage("");
    try {
      // Créer l'affectation dans la sous-collection de la classe (conforme SPEC)
      await addDoc(
        collection(db, "schools", SCHOOL_ID, "classes", classId, "subjectAssignments"),
        {
          subjectId: subjectId,
          teacherId: teacherId,
          classId: classId,
          createdAt: new Date(),
        }
      );
      setClassId("");
      setSubjectId("");
      setTeacherId("");
      setMessage("✅ Affectation créée !");
      loadData();
    } catch (err) {
      console.error("Erreur ajout:", err);
      setMessage("❌ Erreur lors de la création.");
    }
  };

  const handleDelete = async (assignment) => {
    if (!confirm("Supprimer cette affectation ?")) return;
    try {
      await deleteDoc(
        doc(db, "schools", SCHOOL_ID, "classes", assignment.classId, "subjectAssignments", assignment.id)
      );
      loadData();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  // Helpers d'affichage
  const className = (id) => classes.find((c) => c.id === id)?.name || "—";
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";
  const teacherName = (id) => teachers.find((t) => t.id === id)?.displayName || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Affectations enseignants</h1>
        <p className="text-green-100 text-sm">Affectez un enseignant à une matière dans une classe.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Nouvelle affectation</h2>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Classe --</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant</label>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Enseignant --</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
            </select>
          </div>
          <div className="md:col-span-3">
            <button type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Affecter
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Affectations existantes</h2>
          <span className="text-sm text-gray-500">{assignments.length} affectation(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune affectation.</p>
        ) : (
          <div className="divide-y">
            {assignments.map((a) => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div>
                  <p className="font-medium text-sm">{teacherName(a.teacherId)}</p>
                  <p className="text-xs text-gray-400">
                    {subjectName(a.subjectId)} — {className(a.classId)}
                  </p>
                </div>
                <button onClick={() => handleDelete(a)}
                        className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}