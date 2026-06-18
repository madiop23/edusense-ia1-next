"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentFeesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        // Trouver les enfants du parent
        const linksQuery = query(
          collection(db, "parentLinks"),
          where("parentId", "==", user.uid)
        );
        const linksSnap = await getDocs(linksQuery);
        const studentIds = linksSnap.docs.map((d) => d.data().studentId);

        // Charger les factures de ces enfants
        const allInvoices = [];
        const invoicesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "invoices"));
        invoicesSnap.docs.forEach((d) => {
          const inv = { id: d.id, ...d.data() };
          if (studentIds.includes(inv.studentId)) {
            allInvoices.push(inv);
          }
        });
        setInvoices(allInvoices);
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
      paid: { label: "Payé", color: "bg-green-100 text-green-700" },
      pending: { label: "En attente", color: "bg-amber-100 text-amber-700" },
      overdue: { label: "En retard", color: "bg-red-100 text-red-700" },
    };
    return map[status] || { label: status || "—", color: "bg-gray-100 text-gray-700" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Frais de scolarité</h1>
        <p className="text-green-100 text-sm">Consultez les frais et paiements.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Factures</h2>
          <span className="text-sm text-gray-500">{invoices.length} facture(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune facture pour le moment.</p>
        ) : (
          <div className="divide-y">
            {invoices.map((inv) => {
              const badge = statusBadge(inv.status);
              return (
                <div key={inv.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                  <div>
                    <p className="font-medium text-sm">{inv.label || "Frais de scolarité"}</p>
                    <p className="text-xs text-gray-400">{inv.amount ? `${inv.amount} FCFA` : ""}</p>
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