"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { createNotification } from "@/lib/notifications";

export default function AdminInvoicesPage() {
  const [students, setStudents] = useState([]);
  const [terms, setTerms] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentUid, setCurrentUid] = useState("");

  // Création de facture
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  // Enregistrement de paiement
  const [payingId, setPayingId] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");

  const invoicesRef = collection(db, "schools", SCHOOL_ID, "invoices");

  const loadData = async () => {
    setLoading(true);
    try {
      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
      setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const invSnap = await getDocs(invoicesRef);
      setInvoices(invSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) setCurrentUid(user.uid);
    });
    loadData();
    return () => unsub();
  }, []);

 const handleCreate = async (e) => {
    e.preventDefault();
    if (!studentId || !termId || !label.trim() || !amount || !dueDate) {
      setMessage("❌ Remplissez tous les champs.");
      return;
    }
    setMessage("");
    try {
      const total = parseFloat(amount);
      const invoiceRef = await addDoc(invoicesRef, {
        studentId, termId,
        lineItems: [{ label: label, amount: total }],
        total: total,
        amountPaid: 0,
        status: "pending",
        dueDate: new Date(dueDate),
        createdAt: new Date(),
      });

      // Notifier le(s) parent(s) de cet élève
      const linksSnap = await getDocs(
        query(collection(db, "parentLinks"), where("studentId", "==", studentId))
      );
      for (const linkDoc of linksSnap.docs) {
        const parentId = linkDoc.data().parentId;
        await createNotification({
          userId: parentId,
          type: "invoice",
          title: "Nouvelle facture",
          body: `Une facture "${label}" de ${total.toLocaleString()} FCFA a été émise pour ${studentName(studentId)}.`,
          module: "fees",
          entityId: invoiceRef.id,
          actionUrl: "/parent/fees",
        });
      }

      setStudentId(""); setTermId(""); setLabel(""); setAmount(""); setDueDate("");
      setMessage("✅ Facture créée !");
      loadData();
    } catch (err) {
      console.error("Erreur création:", err);
      setMessage("❌ Erreur lors de la création.");
    }
  };

  const handleRecordPayment = async (invoice) => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) {
      setMessage("❌ Entrez un montant valide.");
      return;
    }
    setMessage("");
    try {
      // Enregistrer le paiement
      await addDoc(collection(db, "schools", SCHOOL_ID, "invoices", invoice.id, "payments"), {
        amount: amt,
        method: payMethod,
        reference: "",
        note: "Paiement enregistré par l'administration",
        recordedBy: currentUid,
        paidAt: new Date(),
      });

      // Recalculer statut (règle SPEC)
      const newAmountPaid = (invoice.amountPaid || 0) + amt;
      let newStatus = "pending";
      if (newAmountPaid >= invoice.total) newStatus = "paid";
      else if (newAmountPaid > 0) newStatus = "partial";

      await updateDoc(doc(db, "schools", SCHOOL_ID, "invoices", invoice.id), {
        amountPaid: newAmountPaid,
        status: newStatus,
      });

      setPayingId(null);
      setPayAmount("");
      setMessage("✅ Paiement enregistré !");
      loadData();
    } catch (err) {
      console.error("Erreur paiement:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette facture ?")) return;
    await deleteDoc(doc(db, "schools", SCHOOL_ID, "invoices", id));
    loadData();
  };

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Élève";
  };
  const termName = (id) => terms.find((t) => t.id === id)?.name || "—";

  const statusBadge = (status) => {
    const map = {
      pending: { label: "En attente", color: "bg-amber-100 text-amber-700" },
      partial: { label: "Partiel", color: "bg-blue-100 text-blue-700" },
      paid: { label: "Payé", color: "bg-green-100 text-green-700" },
      overdue: { label: "En retard", color: "bg-red-100 text-red-700" },
    };
    return map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Factures & Paiements</h1>
        <p className="text-green-100 text-sm">Créez les factures et enregistrez les paiements reçus.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Nouvelle facture</h2>
        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Élève</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Élève --</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trimestre</label>
            <select value={termId} onChange={(e) => setTermId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="">-- Trimestre --</option>
              {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé (motif)</label>
            <input type="text" value={label} onChange={(e) => setLabel(e.target.value)}
                   placeholder="Ex: Frais de scolarité T1"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                   placeholder="Ex: 50000"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <button type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Créer la facture
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Factures émises</h2>
          <span className="text-sm text-gray-500">{invoices.length} facture(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : invoices.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune facture.</p>
        ) : (
          <div className="divide-y">
            {invoices.map((inv) => {
              const badge = statusBadge(inv.status);
              const remaining = (inv.total || 0) - (inv.amountPaid || 0);
              return (
                <div key={inv.id} className="px-6 py-4 hover:bg-green-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{studentName(inv.studentId)}</p>
                      <p className="text-xs text-gray-400">
                        {inv.lineItems?.[0]?.label || "Facture"} — {termName(inv.termId)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Payé : {inv.amountPaid?.toLocaleString()} / {inv.total?.toLocaleString()} FCFA — Reste : {remaining.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>{badge.label}</span>
                      <button onClick={() => handleDelete(inv.id)}
                              className="text-red-400 hover:text-red-600 text-sm">Suppr.</button>
                    </div>
                  </div>

                  {/* Enregistrement de paiement */}
                  {inv.status !== "paid" && (
                    <div className="mt-2">
                      {payingId === inv.id ? (
                        <div className="flex flex-wrap gap-2 items-center">
                          <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                                 placeholder="Montant reçu"
                                 className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                            <option value="cash">Espèces</option>
                            <option value="bank_transfer">Virement</option>
                            <option value="check">Chèque</option>
                            <option value="other">Autre</option>
                          </select>
                          <button onClick={() => handleRecordPayment(inv)}
                                  className="bg-green-700 hover:bg-green-800 text-white text-sm px-3 py-1.5 rounded-lg transition">
                            Valider
                          </button>
                          <button onClick={() => { setPayingId(null); setPayAmount(""); }}
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm px-3 py-1.5 rounded-lg transition">
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setPayingId(inv.id); setPayAmount(remaining.toString()); }}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg transition">
                          Enregistrer un paiement
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}