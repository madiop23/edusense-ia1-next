"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { createNotification } from "@/lib/notifications";

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  const [selectedClassId, setSelectedClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statuses, setStatuses] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        // Lire les affectations → classes de cet enseignant
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const myClassIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            if (a.data().teacherId === user.uid) myClassIds.add(c.id);
          });
        }
        // Ne garder que les classes affectées
        setClasses(allClasses.filter((c) => myClassIds.has(c.id)));

        // Élèves (tous, on filtrera par classe sélectionnée)
        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const classStudents = students.filter((s) => s.classId === selectedClassId);

  const setStatus = (studentId, status) => {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    if (!selectedClassId) {
      setMessage("❌ Choisissez une classe.");
      return;
    }
    setMessage("");

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

      // Notifier les parents des élèves absents ou en retard
      for (const rec of records) {
        if (rec.status === "absent" || rec.status === "late") {
          const student = classStudents.find((s) => s.id === rec.studentId);
          const studentFullName = student ? `${student.firstName} ${student.lastName}` : "Votre enfant";
          const statutTexte = rec.status === "absent" ? "absent(e)" : "en retard";

          // Chercher les parents rattachés à cet élève
          const linksSnap = await getDocs(
            query(collection(db, "parentLinks"), where("studentId", "==", rec.studentId))
          );
          for (const linkDoc of linksSnap.docs) {
            const parentId = linkDoc.data().parentId;
            await createNotification({
              userId: parentId,
              type: "attendance",
              title: rec.status === "absent" ? "Absence signalée" : "Retard signalé",
              body: `${studentFullName} a été marqué(e) ${statutTexte} le ${date}.`,
              module: "attendance",
              entityId: rec.studentId,
              actionUrl: "",
            });
          }
        }
      }

      setMessage("✅ Appel enregistré avec succès !");
      setStatuses({});
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    }
  };

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

      {!loading && classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune classe affectée. Contactez l'administration.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setStatuses({}); }}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Choisir une classe --</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

          {selectedClassId && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">Élèves</h2>
                <span className="text-sm text-gray-500">{classStudents.length} élève(s)</span>
              </div>

              {classStudents.length === 0 ? (
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
                            <button key={opt.value} onClick={() => setStatus(s.id, opt.value)}
                                    className={`text-xs px-2.5 py-1.5 rounded-lg transition ${
                                      active ? `${opt.color} text-white` : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}>
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
        </>
      )}

    </div>
  );
}