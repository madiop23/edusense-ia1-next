"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function RepresentativesPage() {
  const [reps, setReps] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Sélection en cours
  const [selectedRep, setSelectedRep] = useState("");
  const [selectedClasses, setSelectedClasses] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Représentants (users avec role representative)
      const usersSnap = await getDocs(collection(db, "users"));
      const repsList = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === "representative" && u.schoolId === SCHOOL_ID);
      setReps(repsList);

      // Classes
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quand on choisit un représentant, charger son périmètre actuel
  const handleSelectRep = async (repId) => {
    setSelectedRep(repId);
    setSelectedClasses([]);
    if (!repId) return;
    try {
      const repDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "representatives", repId));
      if (repDoc.exists()) {
        setSelectedClasses(repDoc.data().assignedClassIds || []);
      }
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  // Cocher/décocher une classe
  const toggleClass = (classId) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((c) => c !== classId) : [...prev, classId]
    );
  };

  // Enregistrer le périmètre
  const handleSave = async () => {
    if (!selectedRep) {
      setMessage("❌ Choisissez un représentant.");
      return;
    }
    setMessage("");
    try {
      // representatives/{repId} avec repId = uid du user (conforme SPEC)
      await setDoc(doc(db, "schools", SCHOOL_ID, "representatives", selectedRep), {
        userId: selectedRep,
        assignedClassIds: selectedClasses,
        updatedAt: new Date(),
      }, { merge: true });
      setMessage("✅ Périmètre enregistré !");
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    }
  };

  const repName = (id) => reps.find((r) => r.id === id)?.displayName || "—";

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Affectation des représentants</h1>
        <p className="text-green-100 text-sm">Définissez les classes suivies par chaque responsable.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : reps.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucun représentant. Créez-en un via Utilisateurs (rôle Représentant).
          </p>
        ) : (
          <>
            {/* Choisir un représentant */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Représentant</label>
              <select value={selectedRep} onChange={(e) => handleSelectRep(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">-- Choisir un représentant --</option>
                {reps.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
              </select>
            </div>

            {/* Cocher les classes suivies */}
            {selectedRep && (
              <>
                <p className="text-sm font-medium text-gray-700 mb-2">Classes suivies par {repName(selectedRep)} :</p>
                {classes.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucune classe disponible.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-5">
                    {classes.map((c) => {
                      const checked = selectedClasses.includes(c.id);
                      return (
                        <button key={c.id} onClick={() => toggleClass(c.id)}
                                className={`text-sm px-3 py-2 rounded-lg border transition text-left ${
                                  checked
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-green-400"
                                }`}>
                          {checked ? "✓ " : ""}{c.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                <button onClick={handleSave}
                        className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
                  Enregistrer le périmètre
                </button>
              </>
            )}
          </>
        )}
      </div>

    </div>
  );
}