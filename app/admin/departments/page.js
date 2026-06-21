"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  const deptRef = collection(db, "schools", SCHOOL_ID, "departments");

  const loadData = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(deptRef);
      setDepartments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await addDoc(deptRef, { name: name, createdAt: new Date() });
      setName("");
      loadData();
    } catch (err) {
      console.error("Erreur ajout:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce département ?")) return;
    await deleteDoc(doc(db, "schools", SCHOOL_ID, "departments", id));
    loadData();
  };

  const startEdit = (d) => {
    setEditId(d.id);
    setEditName(d.name);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    await updateDoc(doc(db, "schools", SCHOOL_ID, "departments", id), { name: editName });
    cancelEdit();
    loadData();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Départements</h1>
        <p className="text-green-100 text-sm">Regroupez vos matières par pôle (Sciences, Lettres...).</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Ajouter un département</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom du département</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="Ex: Sciences"
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
          <h2 className="font-semibold text-gray-700">Départements existants</h2>
          <span className="text-sm text-gray-500">{departments.length} département(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : departments.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun département.</p>
        ) : (
          <div className="divide-y">
            {departments.map((d) => (
              <div key={d.id} className="px-6 py-3 hover:bg-green-50 transition">
                {editId === d.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                           className="flex-1 min-w-[150px] border border-green-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                    <button onClick={() => handleUpdate(d.id)}
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
                    <p className="font-medium text-sm">{d.name}</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => startEdit(d)}
                              className="text-green-600 hover:text-green-800 text-sm">Modifier</button>
                      <button onClick={() => handleDelete(d.id)}
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