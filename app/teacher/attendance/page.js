"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  // Sélections
  const [selectedClassId, setSelectedClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // aujourd'hui
  const [statuses, setStatuses] = useState({}); // { studentId: "present" | "absent" | ... }
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUid(user.uid);
    });
    return () => unsub();
  }, []);

  // Charger classes et élèves
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

  // Élèves de la classe sélectionnée
  const classStudents = students.filter((s) => s.classId === selectedClassId);

  // Changer le statut d'un élève
  const setStatus = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  // Enregistrer la session de présence
  const handleSave = async () => {
    if (!selectedClassId) {
      setMessage("❌ Choisissez une classe.");
      return;
    }
    setMessage("");

    // Construire les records (par défaut "present" si non défini)
    const records = classStudents.map((s) => ({
      studentId: s.id,
      status: statuses[s.id] || "present",
      note: "",
    }));

    try {
      await addDoc(collection(db, "schools", SCHOOL_ID, "attendanceSessions"), {
        classId: selectedClassId,
        date: date,
        takenBy: currentUid,
        records: records,
        createdAt: new Date(),
      });
      setMessage("✅ Appel enregistré avec succès !");
      setStatuses({});
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    }
  };

  // Boutons de statut
  const statusOptions = [
    { value: "present", label: "Présent", color: "bg-green-600" },
    { value: "absent", label: "Absent", color: "bg-red-500" },
    { value: "late", label: "Retard", color: "bg-amber-500" },
    { value: "excused", label: "Excusé", color: "bg-blue-500" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Faire l'appel</h1>
        <p className="text-green-100 text-sm">Enregistrez les présences d'une classe.</p>
      </div>

      {/* Sélection classe + date */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
            <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setStatuses({}); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir une classe --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200">{message}</div>
      )}

      {/* Liste des élèves avec sélecteur de statut */}
      {selectedClassId && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Élèves</h2>
            <span className="text-sm text-gray-500">{classStudents.length} élève(s)</span>
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
          ) : classStudents.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucun élève dans cette classe.</p>
          ) : (
            <div className="divide-y">
              {classStudents.map((s) => (
                <div key={s.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                      {(s.firstName?.[0] || "") + (s.lastName?.[0] || "")}
                    </div>
                    <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                  </div>
                  <div className="flex gap-1">
                    {statusOptions.map((opt) => {
                      const active = (statuses[s.id] || "present") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setStatus(s.id, opt.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                            active ? `${opt.color} text-white` : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {classStudents.length > 0 && (
            <div className="px-6 py-4 border-t">
              <button onClick={handleSave}
                      className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
                Enregistrer l'appel
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}