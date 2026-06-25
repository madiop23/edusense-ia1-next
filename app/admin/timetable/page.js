"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
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

export default function AdminTimetablePage() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]); // subjectAssignments de la classe
  const [usersMap, setUsersMap] = useState({});

  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [slots, setSlots] = useState({}); // clé "jour-période" -> { subjectId, teacherId, room }
  const [timetableId, setTimetableId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Charger classes, trimestres, matières, users
  useEffect(() => {
    const load = async () => {
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
      setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
      setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const usersSnap = await getDocs(collection(db, "users"));
      const map = {};
      usersSnap.docs.forEach((d) => {
        const u = d.data();
        map[d.id] = u.displayName || u.email || "Enseignant";
      });
      setUsersMap(map);
    };
    load();
  }, []);

  // Quand on choisit une classe : charger ses affectations (matière -> prof) + l'emploi du temps existant
  useEffect(() => {
    if (!classId) {
      setAssignments([]);
      return;
    }
    const loadClassData = async () => {
      // Affectations de la classe
      const assignSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes", classId, "subjectAssignments"));
      setAssignments(assignSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    loadClassData();
  }, [classId]);

  // Charger l'emploi du temps existant pour classe + trimestre
  useEffect(() => {
    if (!classId || !termId) {
      setSlots({});
      setTimetableId(null);
      return;
    }
    const loadTimetable = async () => {
      const q = query(
        collection(db, "schools", SCHOOL_ID, "timetables"),
        where("classId", "==", classId),
        where("termId", "==", termId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const ttDoc = snap.docs[0];
        setTimetableId(ttDoc.id);
        const data = ttDoc.data();
        const slotsMap = {};
        (data.slots || []).forEach((s) => {
          slotsMap[`${s.dayOfWeek}-${s.periodIndex}`] = {
            subjectId: s.subjectId,
            teacherId: s.teacherId,
            room: s.room || "",
          };
        });
        setSlots(slotsMap);
      } else {
        setTimetableId(null);
        setSlots({});
      }
    };
    loadTimetable();
  }, [classId, termId]);

  // Trouver le prof affecté à une matière (auto-suggestion SPEC)
  const teacherForSubject = (subjectId) => {
    const a = assignments.find((x) => x.subjectId === subjectId);
    return a ? a.teacherId : "";
  };

  // Quand on choisit une matière dans une cellule
  const handleCellChange = (day, periodIndex, subjectId) => {
    const key = `${day}-${periodIndex}`;
    if (!subjectId) {
      const newSlots = { ...slots };
      delete newSlots[key];
      setSlots(newSlots);
      return;
    }
    const teacherId = teacherForSubject(subjectId); // auto-suggéré
    setSlots({ ...slots, [key]: { subjectId, teacherId, room: slots[key]?.room || "" } });
  };

  const handleRoomChange = (day, periodIndex, room) => {
    const key = `${day}-${periodIndex}`;
    if (!slots[key]) return;
    setSlots({ ...slots, [key]: { ...slots[key], room } });
  };

  // Enregistrer
  const handleSave = async () => {
    if (!classId || !termId) {
      setMessage("Choisissez une classe et un trimestre.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      // Construire le tableau slots[]
      const slotsArray = [];
      Object.entries(slots).forEach(([key, val]) => {
        const [day, periodIndexStr] = key.split("-");
        const periodIndex = parseInt(periodIndexStr);
        const period = PERIODS.find((p) => p.index === periodIndex);
        slotsArray.push({
          dayOfWeek: day,
          periodIndex: periodIndex,
          startTime: period?.start || "",
          endTime: period?.end || "",
          subjectId: val.subjectId,
          teacherId: val.teacherId || "",
          room: val.room || "",
        });
      });

      if (timetableId) {
        await updateDoc(doc(db, "schools", SCHOOL_ID, "timetables", timetableId), { slots: slotsArray });
      } else {
        const ref = await addDoc(collection(db, "schools", SCHOOL_ID, "timetables"), {
          classId, termId, slots: slotsArray, createdAt: new Date(),
        });
        setTimetableId(ref.id);
      }
      setMessage("✅ Emploi du temps enregistré !");
    } catch (err) {
      console.error("Erreur:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "";

  // Matières disponibles pour cette classe (celles qui ont une affectation)
  const availableSubjects = assignments.length > 0
    ? subjects.filter((s) => assignments.some((a) => a.subjectId === s.id))
    : subjects;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Emploi du temps</h1>
        <p className="text-green-100 text-sm">Construisez la grille hebdomadaire par classe et trimestre.</p>
      </div>

      {/* Sélecteurs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir une classe --</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir un trimestre --</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {message && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}
      </div>

      {/* Grille */}
      {classId && termId && (
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
                    const key = `${day}-${period.index}`;
                    const slot = slots[key];
                    return (
                      <td key={key} className="border border-gray-200 p-1 align-top" style={{ minWidth: "140px" }}>
                        <select value={slot?.subjectId || ""}
                                onChange={(e) => handleCellChange(day, period.index, e.target.value)}
                                className="w-full border border-gray-200 rounded px-1 py-1 text-xs mb-1 focus:ring-1 focus:ring-green-500 outline-none">
                          <option value="">—</option>
                          {availableSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        {slot && (
                          <>
                            <div className="text-xs text-green-700 px-1">
                              {usersMap[slot.teacherId] || "Pas de prof"}
                            </div>
                            <input type="text" value={slot.room || ""} placeholder="Salle"
                                   onChange={(e) => handleRoomChange(day, period.index, e.target.value)}
                                   className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs mt-1 focus:ring-1 focus:ring-green-500 outline-none" />
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSave} disabled={loading}
                  className="mt-4 bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition disabled:opacity-50">
            {loading ? "Enregistrement..." : "Enregistrer l'emploi du temps"}
          </button>
        </div>
      )}

    </div>
  );
}