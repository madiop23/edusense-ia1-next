"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les classes
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Charger les élèves (profils Student)
      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compter / lister les élèves d'une classe
  const studentsOfClass = (classId) => students.filter((s) => s.classId === classId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes classes</h1>
        <p className="text-green-100 text-sm">Consultez les classes et leurs élèves.</p>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune classe disponible.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((c) => {
            const eleves = studentsOfClass(c.id);
            return (
              <div key={c.id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-700">{c.name}</h2>
                    <p className="text-xs text-gray-400">{c.level || "Niveau non précisé"}</p>
                  </div>
                  <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {eleves.length} élève(s)
                  </span>
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