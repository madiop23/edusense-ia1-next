"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function RepresentativeClassesPage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const countStudents = (classId) => students.filter((s) => s.classId === classId).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Classes suivies</h1>
        <p className="text-green-100 text-sm">Les classes de votre périmètre.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Classes</h2>
          <span className="text-sm text-gray-500">{classes.length} classe(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : classes.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune classe.</p>
        ) : (
          <div className="divide-y">
            {classes.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.level || "Niveau non précisé"}</p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                  {countStudents(c.id)} élève(s)
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}