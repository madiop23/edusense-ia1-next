"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { db, secondaryAuth } from "@/lib/firebase";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Champs du formulaire
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");

  const schoolId = "ecole-demo";

  // LIRE les utilisateurs
  const loadUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("schoolId", "==", schoolId));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUsers(list);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // CRÉER un utilisateur (via l'app secondaire)
  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password.trim()) return;

    try {
      // 1. Créer le compte via l'app SECONDAIRE (n'affecte pas l'admin)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      // 2. Créer le profil dans Firestore (collection users, document = uid)
      await setDoc(doc(db, "users", uid), {
        email: email,
        displayName: displayName,
        role: role,
        schoolId: schoolId,
        status: "active",
        createdAt: new Date(),
      });

      // 3. Déconnecter l'app secondaire (nettoyage)
      await signOut(secondaryAuth);

      // 4. Réinitialiser le formulaire + recharger
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("teacher");
      setMessage("✅ Utilisateur créé avec succès !");
      loadUsers();
    } catch (err) {
      console.error("Erreur création:", err);
      if (err.code === "auth/email-already-in-use") {
        setMessage("❌ Cet email est déjà utilisé.");
      } else if (err.code === "auth/weak-password") {
        setMessage("❌ Mot de passe trop court (min. 6 caractères).");
      } else {
        setMessage("❌ Erreur lors de la création.");
      }
    }
  };

  // SUPPRIMER (le profil Firestore seulement)
  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce profil utilisateur ?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      loadUsers();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

  // Couleurs des badges de rôle
  const roleBadge = (r) => {
    const colors = {
      admin: "bg-purple-100 text-purple-700",
      school: "bg-blue-100 text-blue-700",
      representative: "bg-amber-100 text-amber-700",
      teacher: "bg-green-100 text-green-700",
      parent: "bg-pink-100 text-pink-700",
      student: "bg-teal-100 text-teal-700",
    };
    return colors[r] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Bannière */}
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des utilisateurs</h1>
        <p className="text-green-100 text-sm">Créez les comptes (enseignants, élèves, parents...).</p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Créer un utilisateur</h2>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200">
            {message}
          </div>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex: NDIAYE Ibrahima"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@edusense.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 caractères"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="teacher">Enseignant</option>
              <option value="student">Élève</option>
              <option value="parent">Parent</option>
              <option value="representative">Représentant</option>
              <option value="school">Principal (école)</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition"
            >
              Créer le compte
            </button>
          </div>
        </form>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Utilisateurs</h2>
          <span className="text-sm text-gray-500">{users.length} utilisateur(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun utilisateur.</p>
        ) : (
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-sm uppercase">
                    {u.displayName ? u.displayName.substring(0, 2) : "??"}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u.displayName || "Sans nom"}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${roleBadge(u.role)}`}>
                    {u.role}
                  </span>
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}