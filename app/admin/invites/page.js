"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function InvitesPage() {
  const [students, setStudents] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [message, setMessage] = useState("");

  const codesRef = collection(db, "inviteCodes");

  const loadData = async () => {
    setLoading(true);
    try {
      // Élèves de l'école
      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Codes existants (filtrés par école)
      const codesSnap = await getDocs(codesRef);
      const list = codesSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => c.schoolId === SCHOOL_ID);
      setCodes(list);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Générer un code aléatoire (6 caractères)
  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      setMessage("❌ Choisissez un élève.");
      return;
    }
    setMessage("");

    // Date d'expiration : dans 30 jours
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);

    try {
      const newCode = generateCode();
      await addDoc(codesRef, {
        code: newCode,
        schoolId: SCHOOL_ID,
        studentId: selectedStudent,
        expiresAt: expiry,
        status: "active",
        createdAt: new Date(),
      });
      setSelectedStudent("");
      setMessage(`✅ Code généré : ${newCode}`);
      loadData();
    } catch (err) {
      console.error("Erreur génération:", err);
      setMessage("❌ Erreur lors de la génération.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce code ?")) return;
    await deleteDoc(doc(db, "inviteCodes", id));
    loadData();
  };

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Élève inconnu";
  };

  const statusBadge = (status) => {
    const map = {
      active: { label: "Actif", color: "bg-green-100 text-green-700" },
      used: { label: "Utilisé", color: "bg-gray-100 text-gray-600" },
      expired: { label: "Expiré", color: "bg-red-100 text-red-700" },
    };
    return map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Codes d'invitation parents</h1>
        <p className="text-green-100 text-sm">Générez un code pour lier un parent à un élève.</p>
      </div>

      {/* Générer un code */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Générer un code</h2>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}

        <form onSubmit={handleGenerate} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Élève concerné</label>
            <select value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir un élève --</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </div>
          <button type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
            Générer le code
          </button>
        </form>
      </div>

      {/* Liste des codes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Codes générés</h2>
          <span className="text-sm text-gray-500">{codes.length} code(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : codes.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun code généré.</p>
        ) : (
          <div className="divide-y">
            {codes.map((c) => {
              const badge = statusBadge(c.status);
              return (
                <div key={c.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="font-mono font-bold text-lg bg-green-50 text-green-800 px-3 py-1 rounded-lg tracking-widest">
                      {c.code}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{studentName(c.studentId)}</p>
                      <p className="text-xs text-gray-400">Pour le parent de cet élève</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                    <button onClick={() => handleDelete(c.id)}
                            className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}