"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ParentRegisterPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim() || !code.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);

    try {
      const codeUpper = code.trim().toUpperCase();
      const codesQuery = query(
        collection(db, "inviteCodes"),
        where("code", "==", codeUpper),
        where("schoolId", "==", SCHOOL_ID)
      );
      const codesSnap = await getDocs(codesQuery);

      if (codesSnap.empty) {
        setError("Code d'invitation invalide. Contactez l'établissement.");
        setLoading(false);
        return;
      }

      const codeDoc = codesSnap.docs[0];
      const codeData = codeDoc.data();

      if (codeData.status !== "active") {
        setError("Ce code a déjà été utilisé ou a expiré.");
        setLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        email: email,
        displayName: displayName,
        role: "parent",
        schoolId: SCHOOL_ID,
        status: "active",
        createdAt: new Date(),
      });

      await addDoc(collection(db, "parentLinks"), {
        parentId: uid,
        studentId: codeData.studentId,
        schoolId: SCHOOL_ID,
        relationship: "guardian",
        verifiedAt: new Date(),
      });

      await updateDoc(doc(db, "inviteCodes", codeDoc.id), {
        status: "used",
        usedBy: uid,
        usedAt: new Date(),
      });

      router.push("/parent/dashboard");
    } catch (err) {
      console.error("Erreur inscription:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Cet email est déjà utilisé.");
      } else if (err.code === "auth/weak-password") {
        setError("Mot de passe trop court (min. 6 caractères).");
      } else {
        setError("Erreur lors de l'inscription.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold">
            E
          </div>
          <span className="font-bold text-gray-800 text-lg">
            EDU-SENSE <span className="text-green-600">IA</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">Inscription Parent</h1>
        <p className="text-gray-500 text-sm mb-6">Créez votre compte avec le code fourni par l'établissement.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom complet</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                   placeholder="Ex: SOW Mamadou"
                   className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   required placeholder="exemple@email.com"
                   className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   required placeholder="Min. 6 caractères"
                   className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Code d'invitation</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                   required placeholder="Ex: K7M2P9"
                   className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm uppercase tracking-widest focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition" />
          </div>

          <button type="submit" disabled={loading}
                  className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-xl text-sm transition disabled:opacity-50">
            {loading ? "Inscription..." : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-green-600 font-medium hover:underline">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}