"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentFeesPage() {
  const [invoices, setInvoices] = useState([]);
  const [terms, setTerms] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const linksSnap = await getDocs(query(collection(db, "parentLinks"), where("parentId", "==", user.uid)));
        const studentIds = linksSnap.docs.map((d) => d.data().studentId);

        const kids = [];
        for (const sid of studentIds) {
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sid));
          if (sDoc.exists()) kids.push({ id: sDoc.id, ...sDoc.data() });
        }
        setStudents(kids);

        const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
        setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const invSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "invoices"));
        const myInvoices = invSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((inv) => studentIds.includes(inv.studentId));
        setInvoices(myInvoices);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Enfant";
  };
  const termName = (id) => terms.find((t) => t.id === id)?.name || "—";

  const statusBadge = (status) => {
    const map = {
      pending: { label: "À payer", color: "bg-amber-100 text-amber-700" },
      partial: { label: "Partiel", color: "bg-blue-100 text-blue-700" },
      paid: { label: "Payé", color: "bg-green-100 text-green-700" },
      overdue: { label: "En retard", color: "bg-red-100 text-red-700" },
    };
    return map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  };

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Frais scolaires</h1>
        <p className="text-green-100 text-sm">Consultez les factures de vos enfants et leur statut.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
        Pour régler une facture, présentez-vous à l'administration de l'établissement. Le statut sera mis à jour après enregistrement du paiement.
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune facture pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const badge = statusBadge(inv.status);
            const remaining = (inv.total || 0) - (inv.amountPaid || 0);
            return (
              <div key={inv.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{inv.lineItems?.[0]?.label || "Facture"}</p>
                    <p className="text-xs text-gray-400">
                      {studentName(inv.studentId)} — {termName(inv.termId)} — échéance {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-gray-800">{inv.total?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total (FCFA)</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-green-700">{inv.amountPaid?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Payé</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-lg font-bold text-red-600">{remaining.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Reste</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}