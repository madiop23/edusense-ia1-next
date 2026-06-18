"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ClassesPage() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLevel, setEditLevel] = useState("");

  // Chemin conforme au SPEC : schools/{schoolId}/classes
  const classesRef = collection(db, "schools", SCHOOL_ID, "classes");

  // LIRE
  const loadClasses = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(classesRef);
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

  // CRÉER
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(classesRef, {
        name: name,
        level: level,
        status: "active",
        createdAt: new Date(),
      });
      setName("");
      setLevel("");
      loadClasses();
    } catch (err) {
      console.error("Erreur ajout:", err);
    }
  };

  // SUPPRIMER
  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette classe ?")) return;
    try {
      await deleteDoc(doc(db, "schools", SCHOOL_ID, "classes", id));
      loadClasses();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  // MODIFICATION
  const startEdit = (c) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditLevel(c.level || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
    setEditLevel("");
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await updateDoc(doc(db, "schools", SCHOOL_ID, "classes", id), {
        name: editName,
        level: editLevel,
      });
      cancelEdit();
      loadClasses();
    } catch (err) {
      console.error("Erreur modification:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des classes</h1>
        <p className="text-green-100 text-sm">Créez et gérez les classes de l'établissement.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Ajouter une classe</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la classe</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="Ex: Terminale S1"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
            <input type="text" value={level} onChange={(e) => setLevel(e.target.value)}
                   placeholder="Ex: Terminale"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
            Ajouter
          </button>
        </form>
      </div>

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
              <div key={c.id} className="px-6 py-3 hover:bg-green-50 transition">
                {editId === c.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                           className="flex-1 min-w-[150px] border border-green-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    <input type="text" value={editLevel} onChange={(e) => setEditLevel(e.target.value)}
                           placeholder="Niveau"
                           className="flex-1 min-w-[100px] border border-green-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    <button onClick={() => handleUpdate(c.id)}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
                      Enregistrer
                    </button>
                    <button onClick={cancelEdit}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg transition">
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.level || "Niveau non précisé"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(c)}
                              className="text-green-600 hover:text-green-800 text-sm">Modifier</button>
                      <button onClick={() => handleDelete(c.id)}
                              className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}