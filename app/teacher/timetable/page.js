"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const PERIODS = [
  { index: 1, start: "08:00", end: "09:00" },
  { index: 2, start: "09:00", end: "10:00" },
  { index: 3, start: "10:15", end: "11:15" },
  { index: 4, start: "11:15", end: "12:15" },
  { index: 5, start: "14:00", end: "15:00" },
  { index: 6, start: "15:00", end: "16:00" },
];

export default function TeacherTimetablePage() {
  const [mySlots, setMySlots] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState("");
  const [currentUid, setCurrentUid] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
        const termsList = termsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTerms(termsList);
        if (termsList.length > 0) setTermId(termsList[0].id);
      } catch (err) {
        console.error("Erreur:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!termId || !currentUid) {
      setMySlots([]);
      return;
    }
    const loadMySlots = async () => {
      const q = query(
        collection(db, "schools", SCHOOL_ID, "timetables"),
        where("termId", "==", termId)
      );
      const snap = await getDocs(q);
      const collected = [];
      snap.docs.forEach((ttDoc) => {
        const data = ttDoc.data();
        (data.slots || []).forEach((s) => {
          if (s.teacherId === currentUid) {
            collected.push({ ...s, classId: data.classId });
          }
        });
      });
      setMySlots(collected);
    };
    loadMySlots();
  }, [termId, currentUid]);

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "";
  const className = (id) => classes.find((c) => c.id === id)?.name || "";

  const getSlot = (day, periodIndex) =>
    mySlots.find((s) => s.dayOfWeek === day && s.periodIndex === periodIndex);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mon emploi du temps</h1>
        <p className="text-green-100 text-sm">Tous vos cours de la semaine.</p>
      </div>

      {terms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {terms.map((t) => (
            <button key={t.id} onClick={() => setTermId(t.id)}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${
                      termId === t.id ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"
                    }`}>
              {t.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : mySlots.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun cours programmé pour ce trimestre.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2 bg-gray-50 text-xs">Période</th>
                {DAYS.map((day) => (
                  <th key={day} className="border border-gray-200 p-2 bg-gray-50 text-xs">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period.index}>
                  <td className="border border-gray-200 p-2 text-center text-xs bg-gray-50">
                    <div className="font-medium">P{period.index}</div>
                    <div className="text-gray-400">{period.start}-{period.end}</div>
                  </td>
                  {DAYS.map((day) => {
                    const slot = getSlot(day, period.index);
                    return (
                      <td key={`${day}-${period.index}`} className="border border-gray-200 p-2 align-top text-center" style={{ minWidth: "130px" }}>
                        {slot ? (
                          <div className="bg-green-50 rounded-lg p-2">
                            <div className="font-medium text-green-800 text-xs">{subjectName(slot.subjectId)}</div>
                            <div className="text-xs text-gray-600 mt-1">{className(slot.classId)}</div>
                            {slot.room && <div className="text-xs text-gray-400">Salle {slot.room}</div>}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}