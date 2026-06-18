"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function StudentTimetablePage() {
  const [slots, setSlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const studentId = userDoc.exists() ? userDoc.data().studentId : null;
        if (!studentId) {
          setLoading(false);
          return;
        }

        // Trouver la classe de l'élève
        const studentDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", studentId));
        const classId = studentDoc.exists() ? studentDoc.data().classId : null;

        // Charger les matières (pour les noms)
        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Charger l'emploi du temps de la classe
        const timetablesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "timetables"));
        const myTimetable = timetablesSnap.docs
          .map((d) => d.data())
          .find((t) => t.classId === classId);

        setSlots(myTimetable?.slots || []);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const subjectName = (id) => subjects.find((x) => x.id === id)?.name || "Matière";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mon emploi du temps</h1>
        <p className="text-green-100 text-sm">Vos cours de la semaine.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : slots.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun emploi du temps disponible pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {slots
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
              .map((slot, i) => (
                <div key={i} className="flex items-center gap-4 bg-green-50 rounded-lg p-3 hover:bg-green-100 transition">
                  <div className="w-24 text-xs font-semibold text-green-800">{days[slot.dayOfWeek]}</div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{subjectName(slot.subjectId)}</p>
                    <p className="text-xs text-gray-500">
                      {slot.startTime} - {slot.endTime}{slot.room ? ` • Salle ${slot.room}` : ""}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

    </div>
  );
}