"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function StudentAttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Récupérer le studentId
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const studentId = userDoc.exists() ? userDoc.data().studentId : null;
        if (!studentId) {
          setLoading(false);
          return;
        }

        // Charger toutes les sessions de présence, puis extraire celles de l'élève
        const sessionsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "attendanceSessions"));
        const myRecords = [];
        sessionsSnap.docs.forEach((d) => {
          const session = d.data();
          const rec = (session.records || []).find((r) => r.studentId === studentId);
          if (rec) {
            myRecords.push({
              date: session.date,
              status: rec.status,
              note: rec.note || "",
            });
          }
        });
        setRecords(myRecords);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const statusBadge = (status) => {
    const map = {
      present: { label: "Présent", color: "bg-green-100 text-green-700" },
      absent: { label: "Absent", color: "bg-red-100 text-red-700" },
      late: { label: "Retard", color: "bg-amber-100 text-amber-700" },
      excused: { label: "Excusé", color: "bg-blue-100 text-blue-700" },
    };
    return map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes présences</h1>
        <p className="text-green-100 text-sm">Consultez votre historique de présence.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-700">Historique</h2>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : records.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune présence enregistrée pour le moment.</p>
        ) : (
          <div className="divide-y">
            {records.map((r, i) => {
              const badge = statusBadge(r.status);
              return (
                <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                  <div>
                    <p className="font-medium text-sm">{r.date}</p>
                    {r.note && <p className="text-xs text-gray-400">{r.note}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}