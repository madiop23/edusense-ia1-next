"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc } from "firebase/firestore";
import { db, secondaryAuth } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [classId, setClassId] = useState("");

  // Charger les utilisateurs et les classes
  const loadData = async () => {
    setLoading(true);
    try {
      // Utilisateurs (collection users à la racine, filtrés par schoolId)
      const usersSnap = await getDocs(collection(db, "users"));
      const usersList = usersSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.schoolId === SCHOOL_ID);
      setUsers(usersList);

      // Classes (pour le menu déroulant)
      const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
      setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // CRÉER un utilisateur
  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!email.trim() || !password.trim()) return;

    // Si c'est un élève, une classe est obligatoire
    if (role === "student" && !classId) {
      setMessage("❌ Veuillez choisir une classe pour l'élève.");
      return;
    }

    try {
      // 1. Créer le compte de connexion (app secondaire)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const uid = userCredential.user.uid;

      let studentId = null;

      // 2. Si élève : créer le profil Student dans schools/{id}/students
      if (role === "student") {
        const parts = displayName.trim().split(" ");
        const firstName = parts[0] || displayName;
        const lastName = parts.slice(1).join(" ") || "";

        const studentRef = await addDoc(collection(db, "schools", SCHOOL_ID, "students"), {
          userId: uid,
          admissionNumber: "ADM-" + Date.now(),
          firstName: firstName,
          lastName: lastName,
          classId: classId,
          academicYearId: "annee-courante",
          status: "active",
          createdAt: new Date(),
        });
        studentId = studentRef.id;

        // 2b. Créer l'enrollment (rattachement élève ↔ classe)
        await addDoc(collection(db, "schools", SCHOOL_ID, "classes", classId, "enrollments"), {
          studentId: studentId,
          enrolledAt: new Date(),
          status: "active",
        });
      }

      // 3. Créer le document User (identité)
      await setDoc(doc(db, "users", uid), {
        email: email,
        displayName: displayName,
        role: role,
        schoolId: SCHOOL_ID,
        studentId: studentId,   // null si pas élève
        status: "active",
        createdAt: new Date(),
      });

      // 4. Déconnecter l'app secondaire
      await signOut(secondaryAuth);

      // 5. Réinitialiser
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("teacher");
      setClassId("");
      setMessage("✅ Utilisateur créé avec succès !");
      loadData();
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

  // SUPPRIMER (le profil User)
  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce profil utilisateur ?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      loadData();
    } catch (err) {
      console.error("Erreur suppression:", err);
    }
  };

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

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Gestion des utilisateurs</h1>
        <p className="text-green-100 text-sm">Créez les comptes (enseignants, élèves, parents...).</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Créer un utilisateur</h2>

        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200">{message}</div>
        )}

        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                   placeholder="Ex: SOW Aminata"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="exemple@edusense.com"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
                   placeholder="Min. 6 caractères"
                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
              <option value="teacher">Enseignant</option>
              <option value="student">Élève</option>
              <option value="parent">Parent</option>
              <option value="representative">Représentant</option>
              <option value="school">Principal (école)</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          {/* Menu Classe : visible seulement si rôle = élève */}
          {role === "student" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Classe de l'élève</label>
              <select value={classId} onChange={(e) => setClassId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                <option value="">-- Choisir une classe --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="md:col-span-2">
            <button type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Créer le compte
            </button>
          </div>
        </form>
      </div>

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
                    <p className="text-xs text-gray-400">
                      {u.email}
                      {u.role === "student" && u.classId ? ` — ${className(u.classId)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                  <button onClick={() => handleDelete(u.id)}
                          className="text-red-400 hover:text-red-600 text-sm">Supprimer</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}