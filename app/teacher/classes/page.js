"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [myAssignments, setMyAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Charger toutes les classes, élèves, matières
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Pour chaque classe, lire les affectations et garder celles de CET enseignant
        const mine = [];
        const myClassIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            const data = a.data();
            if (data.teacherId === user.uid) {
              mine.push({ id: a.id, classId: c.id, ...data });
              myClassIds.add(c.id);
            }
          });
        }
        setMyAssignments(mine);

        // Ne garder que les classes où l'enseignant est affecté
        setClasses(allClasses.filter((c) => myClassIds.has(c.id)));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const studentsOfClass = (classId) => students.filter((s) => s.classId === classId);
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";

  // Matières que CET enseignant enseigne dans une classe donnée
  const mySubjectsInClass = (classId) =>
    myAssignments.filter((a) => a.classId === classId).map((a) => subjectName(a.subjectId));

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes classes</h1>
        <p className="text-green-100 text-sm">Les classes où vous enseignez.</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Vous n'êtes affecté à aucune classe pour le moment.</p>
          <p className="text-xs mt-1">Contactez l'administration pour vos affectations.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((c) => {
            const eleves = studentsOfClass(c.id);
            const mesMatieres = mySubjectsInClass(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-700">{c.name}</h2>
                      <p className="text-xs text-gray-400">{c.level || "Niveau non précisé"}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      {eleves.length} élève(s)
                    </span>
                  </div>
                  {/* Matières enseignées par ce prof dans cette classe */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mesMatieres.map((m, i) => (
                      <span key={i} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {eleves.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400">Aucun élève dans cette classe.</p>
                ) : (
                  <div className="divide-y">
                    {eleves.map((e) => (
                      <div key={e.id} className="px-6 py-3 flex items-center gap-3 hover:bg-green-50 transition">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                          {(e.firstName?.[0] || "") + (e.lastName?.[0] || "")}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-gray-400">N° {e.admissionNumber}</p>
                        </div>
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