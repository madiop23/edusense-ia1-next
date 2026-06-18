"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function SchoolStudentsPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Élèves de l'établissement</h1>
        <p className="text-green-100 text-sm">Liste de tous les élèves inscrits.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Élèves</h2>
          <span className="text-sm text-gray-500">{students.length} élève(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : students.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun élève inscrit.</p>
        ) : (
          <div className="divide-y">
            {students.map((s) => (
              <div key={s.id} className="px-6 py-3 flex items-center gap-3 hover:bg-green-50 transition">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                  {(s.firstName?.[0] || "") + (s.lastName?.[0] || "")}
                </div>
                <div>
                  <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                  <p className="text-xs text-gray-400">Classe : {className(s.classId)} • N° {s.admissionNumber}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}