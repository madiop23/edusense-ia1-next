"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);

  const schoolId = "ecole-demo";

  // LIRE
  const loadSubjects = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "subjects"), where("schoolId", "==", schoolId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSubjects(list);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  // CRÉER
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, "subjects"), {
        name: name,
        code: code,
        schoolId: schoolId,
        createdAt: new Date(),
      });
      setName("");
      setCode("");
      loadSubjects();
    } catch (err) {
      console.error("Erreur ajout:", err);
    }
  };

  // SUPPRIMER
  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette matière ?")) return;
    try {
      await deleteDoc(doc(db, "subjects", id));
      loadSubjects();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Bannière */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des matières</h1>
        <p className="text-green-100 text-sm">Créez et gérez les matières enseignées.</p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Ajouter une matière</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la matière</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mathématiques"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: MATH"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition"
          >
            Ajouter
          </button>
        </form>
      </div>

      {/* Liste des matières */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Matières existantes</h2>
          <span className="text-sm text-gray-500">{subjects.length} matière(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : subjects.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune matière. Ajoutez-en une ci-dessus.</p>
        ) : (
          <div className="divide-y">
            {subjects.map((s) => (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.code || "Pas de code"}</p>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}