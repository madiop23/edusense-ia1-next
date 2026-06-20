"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentChildrenPage() {
  const [children, setChildren] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  // Charger les enfants déjà liés
  const loadChildren = async (uid) => {
    try {
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const linksQuery = query(collection(db, "parentLinks"), where("parentId", "==", uid));
      const linksSnap = await getDocs(linksQuery);
      const studentIds = linksSnap.docs.map((d) => d.data().studentId);

      const kids = [];
      for (const sid of studentIds) {
        const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sid));
        if (sDoc.exists()) kids.push({ id: sDoc.id, ...sDoc.data() });
      }
      setChildren(kids);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUid(user.uid);
        loadChildren(user.uid);
      }
    });
    return () => unsub();
  }, []);

  // Saisir un code d'invitation
  const handleSubmitCode = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!code.trim()) return;

    try {
      // 1. Chercher le code (en majuscules)
      const codeUpper = code.trim().toUpperCase();
      const codesQuery = query(
        collection(db, "inviteCodes"),
        where("code", "==", codeUpper),
        where("schoolId", "==", SCHOOL_ID)
      );
      const codesSnap = await getDocs(codesQuery);

      if (codesSnap.empty) {
        setMessage("❌ Code invalide ou introuvable.");
        return;
      }

      const codeDoc = codesSnap.docs[0];
      const codeData = codeDoc.data();

      // 2. Vérifier que le code est actif
      if (codeData.status !== "active") {
        setMessage("❌ Ce code a déjà été utilisé ou a expiré.");
        return;
      }

      // 3. Créer le parentLink
      await addDoc(collection(db, "parentLinks"), {
        parentId: currentUid,
        studentId: codeData.studentId,
        schoolId: SCHOOL_ID,
        relationship: "guardian",
        verifiedAt: new Date(),
      });

      // 4. Marquer le code comme utilisé
      await updateDoc(doc(db, "inviteCodes", codeDoc.id), {
        status: "used",
        usedBy: currentUid,
        usedAt: new Date(),
      });

      setCode("");
      setMessage("✅ Enfant rattaché avec succès !");
      loadChildren(currentUid);
    } catch (err) {
      console.error("Erreur code:", err);
      setMessage("❌ Erreur lors de la validation du code.");
    }
  };

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Mes enfants</h1>
        <p className="text-green-100 text-sm">Suivez la scolarité de vos enfants.</p>
      </div>

      {/* Saisir un code d'invitation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-1">Rattacher un enfant</h2>
        <p className="text-xs text-gray-400 mb-4">Saisissez le code d'invitation fourni par l'établissement.</p>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}

        <form onSubmit={handleSubmitCode} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Code d'invitation</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                   placeholder="Ex: K7M2P9"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <button type="submit"
                  className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
            Valider
          </button>
        </form>
      </div>

      {/* Liste des enfants */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Enfants rattachés</h2>
          <span className="text-sm text-gray-500">{children.length} enfant(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : children.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">
            Aucun enfant rattaché. Utilisez un code d'invitation ci-dessus.
          </p>
        ) : (
          <div className="divide-y">
            {children.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-3 hover:bg-green-50 transition">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                  {(c.firstName?.[0] || "") + (c.lastName?.[0] || "")}
                </div>
                <div>
                  <p className="font-medium text-sm">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400">Classe : {className(c.classId)} • N° {c.admissionNumber}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}