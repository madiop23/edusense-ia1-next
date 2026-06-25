"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { createNotification } from "@/lib/notifications";

export default function TeacherAssignmentsPage() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [termId, setTermId] = useState("");
  const [dueAt, setDueAt] = useState("");

  // Assistant IA
  const [aiTopic, setAiTopic] = useState("");
  const [aiLevel, setAiLevel] = useState("");
  const [aiType, setAiType] = useState("Exercices");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const assignmentsRef = collection(db, "schools", SCHOOL_ID, "assignments");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const myClassIds = new Set();
        const mySubjectIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(
            collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments")
          );
          assignSnap.docs.forEach((a) => {
            const data = a.data();
            if (data.teacherId === user.uid) {
              myClassIds.add(c.id);
              mySubjectIds.add(data.subjectId);
            }
          });
        }
        setClasses(allClasses.filter((c) => myClassIds.has(c.id)));

        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => mySubjectIds.has(s.id)));

        const termsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "terms"));
        setTerms(termsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        const aSnap = await getDocs(assignmentsRef);
        setAssignments(aSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.teacherId === user.uid));
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const reload = async () => {
    const aSnap = await getDocs(assignmentsRef);
    setAssignments(aSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.teacherId === currentUid));
  };

  // GÉNÉRER AVEC L'IA
  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      setAiError("Indiquez un sujet pour l'IA.");
      return;
    }
    setAiError("");
    setAiLoading(true);

    const subjectLabel = subjects.find((s) => s.id === subjectId)?.name || "Matière générale";

    try {
      const response = await fetch("/api/generate-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subjectLabel,
          level: aiLevel || "Niveau secondaire",
          topic: aiTopic,
          type: aiType,
        }),
      });

      const data = await response.json();

      if (data.text) {
        setDescription(data.text);
        if (!title) setTitle(`${aiType} : ${aiTopic}`);
        setAiError("");
      } else {
        setAiError("L'IA n'a pas pu générer de contenu. Réessayez.");
      }
    } catch (err) {
      console.error("Erreur IA:", err);
      setAiError("Erreur lors de la génération.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !classId || !subjectId || !termId || !dueAt) return;
    try {
      await addDoc(assignmentsRef, {
        title, description,
        classId, subjectId, termId,
        teacherId: currentUid,
        dueAt: new Date(dueAt),
        maxScore: 20,
        status: "draft",
        createdAt: new Date(),
      });
      setTitle(""); setDescription(""); setClassId(""); setSubjectId(""); setTermId(""); setDueAt("");
      reload();
    } catch (err) {
      console.error("Erreur ajout:", err);
    }
  };

  const handlePublish = async (id) => {
    try {
      await updateDoc(doc(db, "schools", SCHOOL_ID, "assignments", id), { status: "published" });

      // Retrouver le devoir pour notifier les élèves de sa classe
      const assignment = assignments.find((a) => a.id === id);
      if (assignment) {
        const studentsSnap = await getDocs(
          query(collection(db, "schools", SCHOOL_ID, "students"), where("classId", "==", assignment.classId))
        );
        for (const sDoc of studentsSnap.docs) {
          const student = sDoc.data();
          if (student.userId) {
            await createNotification({
              userId: student.userId,
              type: "assignment",
              title: "Nouveau devoir publié",
              body: `Un nouveau devoir "${assignment.title}" a été publié.`,
              module: "academics",
              entityId: assignment.id,
              actionUrl: "/student/assignments",
            });
          }
        }
      }

      reload();
    } catch (err) {
      console.error("Erreur publication devoir:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce devoir ?")) return;
    await deleteDoc(doc(db, "schools", SCHOOL_ID, "assignments", id));
    reload();
  };

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "—";
  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Devoirs</h1>
        <p className="text-green-100 text-sm">Créez vos devoirs, avec l'aide de l'IA si besoin.</p>
      </div>

      {!loading && classes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune classe affectée. Contactez l'administration.</p>
        </div>
      ) : (
        <>
          {/* Assistant IA — version sobre */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-700 mb-1">Assistant IA</h2>
            <p className="text-xs text-gray-400 mb-4">Générez une proposition de devoir, modifiable avant publication.</p>

            {aiError && (
              <div className="mb-3 px-4 py-2 rounded-lg text-sm bg-red-50 border border-red-200 text-red-700">{aiError}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                       placeholder="Ex: Les fractions"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau</label>
                <input type="text" value={aiLevel} onChange={(e) => setAiLevel(e.target.value)}
                       placeholder="Ex: 6ème"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={aiType} onChange={(e) => setAiType(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option>Exercices</option>
                  <option>Devoir maison</option>
                  <option>Questions de cours</option>
                  <option>Problème</option>
                </select>
              </div>
            </div>

            <button onClick={handleGenerateAI} disabled={aiLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-xl text-sm transition disabled:opacity-50">
              {aiLoading ? "Génération en cours..." : "Générer avec l'IA"}
            </button>
          </div>

          {/* Formulaire devoir */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Nouveau devoir</h2>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                       placeholder="Ex: Exercices chapitre 3"
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / Consignes</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                          rows="8" placeholder="Décrivez le devoir (ou utilisez l'IA ci-dessus)..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classe</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Classe --</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Matière</label>
                <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Matière --</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Date limite</label>
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <button type="submit"
                        className="bg-green-700 hover:bg-green-800 text-white font-medium py-2 px-6 rounded-xl text-sm transition">
                  Créer (brouillon)
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Liste des devoirs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mes devoirs</h2>
          <span className="text-sm text-gray-500">{assignments.length} devoir(s)</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucun devoir créé.</p>
        ) : (
          <div className="divide-y">
            {assignments.map((a) => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-green-50 transition">
                <div>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-gray-400">
                    {className(a.classId)} — {subjectName(a.subjectId)} — à rendre le {formatDate(a.dueAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {a.status === "published" ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Publié</span>
                  ) : (
                    <button onClick={() => handlePublish(a.id)}
                            className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition">
                      Publier
                    </button>
                  )}
                  <button onClick={() => handleDelete(a.id)}
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