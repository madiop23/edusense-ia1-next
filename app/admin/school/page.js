"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function SchoolProfilePage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [gradeMax, setGradeMax] = useState(20);
  const [timezone, setTimezone] = useState("Africa/Dakar");

  const schoolDocRef = doc(db, "schools", SCHOOL_ID);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(schoolDocRef);
        if (snap.exists()) {
          const d = snap.data();
          setName(d.name || "");
          setEmail(d.email || "");
          setPhone(d.phone || "");
          setCity(d.address?.city || "");
          setCountry(d.address?.country || "");
          setGradeMax(d.settings?.gradingScale?.max || 20);
          setTimezone(d.settings?.timezone || "Africa/Dakar");
        }
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      // setDoc avec merge: crée ou met à jour sans écraser les autres champs
      await setDoc(schoolDocRef, {
        name: name,
        email: email,
        phone: phone,
        address: { city: city, country: country },
        settings: {
          gradingScale: { min: 0, max: parseFloat(gradeMax) },
          attendanceStatuses: ["present", "absent", "late", "excused"],
          timezone: timezone,
        },
        status: "active",
        updatedAt: new Date(),
      }, { merge: true });
      setMessage("✅ Profil enregistré avec succès !");
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      setMessage("❌ Erreur lors de l'enregistrement.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Profil de l'établissement</h1>
        <p className="text-green-100 text-sm">Configurez les informations de votre école.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {message && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-gray-50 border border-gray-200 font-medium">{message}</div>
        )}

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'école</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="Ex: Lycée EDU-SENSE"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                       placeholder="contact@ecole.com"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                       placeholder="+221 ..."
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                       placeholder="Ex: Dakar"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pays</label>
                <input type="text" value={country} onChange={(e) => setCountry(e.target.value)}
                       placeholder="Ex: Sénégal"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note maximale (barème)</label>
                <input type="number" value={gradeMax} onChange={(e) => setGradeMax(e.target.value)}
                       placeholder="20"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
            </div>

            <button type="submit"
                    className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
              Enregistrer
            </button>
          </form>
        )}
      </div>

    </div>
  );
}