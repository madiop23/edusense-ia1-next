"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function TermsPage() {
  const [years, setYears] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Champs année
  const [yearLabel, setYearLabel] = useState("");

  // Champs trimestre
  const [termName, setTermName] = useState("");
  const [termYearId, setTermYearId] = useState("");

  const yearsRef = collection(db, "schools", SCHOOL_ID, "academicYears");
  const termsRef = collection(db, "schools", SCHOOL_ID, "terms");

  const loadData = async () => {
    setLoading(true);
    try {
      const yearsSnap = await getDocs(yearsRef);
      setYears(yearsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const termsSnap = await getDocs(termsRef);
      setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Ajouter une année scolaire
  const handleAddYear = async (e) => {
    e.preventDefault();
    if (!yearLabel.trim()) return;
    try {
      await addDoc(yearsRef, {
        label: yearLabel,
        createdAt: new Date(),
      });
      setYearLabel("");
      loadData();
    } catch (err) {
      console.error("Erreur ajout année:", err);
    }
  };

  // Ajouter un trimestre
  const handleAddTerm = async (e) => {
    e.preventDefault();
    if (!termName.trim() || !termYearId) return;
    try {
      await addDoc(termsRef, {
        name: termName,
        yearId: termYearId,
        createdAt: new Date(),
      });
      setTermName("");
      setTermYearId("");
      loadData();
    } catch (err) {
      console.error("Erreur ajout trimestre:", err);
    }
  };

  const handleDeleteYear = async (id) => {
    if (!confirm("Supprimer cette année ?")) return;
    await deleteDoc(doc(db, "schools", SCHOOL_ID, "academicYears", id));
    loadData();
  };

  const handleDeleteTerm = async (id) => {
    if (!confirm("Supprimer ce trimestre ?")) return;
    await deleteDoc(doc(db, "schools", SCHOOL_ID, "terms", id));
    loadData();
  };

  const yearLabelOf = (id) => years.find((y) => y.id === id)?.label || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Années & Trimestres</h1>
        <p className="text-green-100 text-sm">Définissez les périodes scolaires.</p>
      </div>

      {/* ANNÉES SCOLAIRES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Années scolaires</h2>
        <form onSubmit={handleAddYear} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
            <input type="text" value={yearLabel} onChange={(e) => setYearLabel(e.target.value)}
                   placeholder="Ex: 2025-2026"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
            Ajouter
          </button>
        </form>
        <div className="divide-y">
          {years.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">Aucune année scolaire.</p>
          ) : (
            years.map((y) => (
              <div key={y.id} className="py-2 flex items-center justify-between">
                <span className="text-sm font-medium">{y.label}</span>
                <button onClick={() => handleDeleteYear(y.id)}
                        className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TRIMESTRES */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Trimestres</h2>
        <form onSubmit={handleAddTerm} className="flex flex-wrap gap-3 items-end mb-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input type="text" value={termName} onChange={(e) => setTermName(e.target.value)}
                   placeholder="Ex: Trimestre 1"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire</label>
            <select value={termYearId} onChange={(e) => setTermYearId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Choisir --</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>{y.label}</option>
              ))}
            </select>
          </div>
          <button type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
            Ajouter
          </button>
        </form>
        <div className="divide-y">
          {loading ? (
            <p className="text-center text-gray-400 py-4 text-sm">Chargement...</p>
          ) : terms.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">Aucun trimestre.</p>
          ) : (
            terms.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{t.name}</span>
                  <span className="text-xs text-gray-400 ml-2">({yearLabelOf(t.yearId)})</span>
                </div>
                <button onClick={() => handleDeleteTerm(t.id)}
                        className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}