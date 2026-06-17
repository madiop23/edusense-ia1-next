"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);

  // Pour l'instant, école fixe (on branchera le vrai schoolId plus tard)
  const schoolId = "ecole-demo";

  // 1. LIRE — charger les classes au démarrage
  const loadClasses = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "classes"), where("schoolId", "==", schoolId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setClasses(list);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  // 2. CRÉER — ajouter une classe
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, "classes"), {
        name: name,
        level: level,
        schoolId: schoolId,
        createdAt: new Date(),
      });
      setName("");
      setLevel("");
      loadClasses(); // recharger la liste
    } catch (err) {
      console.error("Erreur ajout:", err);
    }
  };

  // 3. SUPPRIMER — retirer une classe
  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette classe ?")) return;
    try {
      await deleteDoc(doc(db, "classes", id));
      loadClasses();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Bannière */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des classes</h1>
        <p className="text-green-100 text-sm">Créez et gérez les classes de l'établissement.</p>
      </div>

      {/* Formulaire d'ajout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Ajouter une classe</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Terminale S1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="Ex: Terminale"
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

      {/* Liste des classes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Classes existantes</h2>
          <span className="text-sm text-gray-500">{classes.length} classe(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : classes.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune classe. Ajoutez-en une ci-dessus.</p>
        ) : (
          <div className="divide-y">
            {classes.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.level || "Niveau non précisé"}</p>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
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