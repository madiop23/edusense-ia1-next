"use client";

import { useState, useRef, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

export default function ParentAssistantPage() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Charger les enfants + leurs données
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const classes = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const subjectsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "subjects"));
        const subjects = subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const gradesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "grades"));
        const allGrades = gradesSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((g) => g.published);

        const attSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "attendanceSessions"));
        const allSessions = attSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const linksQuery = query(collection(db, "parentLinks"), where("parentId", "==", user.uid));
        const linksSnap = await getDocs(linksQuery);
        const studentIds = linksSnap.docs.map((d) => d.data().studentId);

        const kids = [];
        for (const sid of studentIds) {
          const sDoc = await getDoc(doc(db, "schools", SCHOOL_ID, "students", sid));
          if (!sDoc.exists()) continue;
          const student = { id: sDoc.id, ...sDoc.data() };

          const studentGrades = allGrades.filter((g) => g.studentId === sid);
          const average = studentGrades.length > 0
            ? (studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length).toFixed(1)
            : "—";

          // Détail des notes par matière
          const gradesDetail = studentGrades.map((g) => {
            const subjName = subjects.find((s) => s.id === g.subjectId)?.name || "Matière";
            return `${subjName}: ${g.score}/20`;
          }).join(", ");

          let absences = 0;
          allSessions.forEach((session) => {
            const rec = (session.records || []).find((r) => r.studentId === sid);
            if (rec && (rec.status === "absent" || rec.status === "late")) absences++;
          });

          kids.push({
            id: sid,
            name: `${student.firstName} ${student.lastName}`,
            className: classes.find((c) => c.id === student.classId)?.name || "—",
            average,
            absences,
            gradesDetail,
          });
        }
        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChild(kids[0]);
          setMessages([{ role: "model", text: `Bonjour ! Je peux vous renseigner sur la scolarité de ${kids[0].name}. Que voulez-vous savoir ?` }]);
        }
      } catch (err) {
        console.error("Erreur:", err);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = (text) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : "fr-FR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée. Utilisez Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setTimeout(() => handleSend(transcript), 300);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading || !selectedChild) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(1);
      const response = await fetch("/api/parent-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, language, childData: selectedChild }),
      });
      const data = await response.json();
      if (data.text) {
        setMessages([...newMessages, { role: "model", text: data.text }]);
        speak(data.text);
      } else {
        setMessages([...newMessages, { role: "model", text: "Désolé, je n'ai pas pu répondre." }]);
      }
    } catch (err) {
      console.error("Erreur:", err);
      setMessages([...newMessages, { role: "model", text: "Une erreur est survenue." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Changer d'enfant
  const handleSelectChild = (child) => {
    setSelectedChild(child);
    setMessages([{ role: "model", text: `Vous consultez maintenant ${child.name}. Que voulez-vous savoir ?` }]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Assistant IA</h1>
        <p className="text-green-100 text-sm">Posez vos questions sur la scolarité de votre enfant.</p>
      </div>

      {children.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucun enfant rattaché. Utilisez un code d'invitation dans "Mes enfants".</p>
        </div>
      ) : (
        <>
          {/* Sélecteur d'enfant (si plusieurs) */}
          {children.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <button key={c.id} onClick={() => handleSelectChild(c)}
                        className={`text-sm px-3 py-1.5 rounded-lg transition ${
                          selectedChild?.id === c.id ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"
                        }`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Contrôles langue + voix */}
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => setLanguage("fr")}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${language === "fr" ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              Français
            </button>
            <button onClick={() => setLanguage("en")}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${language === "en" ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
              English
            </button>
            <div className="flex-1"></div>
            <button onClick={() => { setVoiceEnabled(!voiceEnabled); window.speechSynthesis?.cancel(); }}
                    className={`text-sm px-3 py-1.5 rounded-lg transition ${voiceEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              {voiceEnabled ? "🔊 Voix activée" : "🔇 Voix coupée"}
            </button>
          </div>

          {/* Conversation */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: "52vh" }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user" ? "bg-green-700 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    {msg.text}
                    {msg.role === "model" && i > 0 && (
                      <button onClick={() => speak(msg.text)} className="block mt-1 text-xs text-gray-400 hover:text-green-600">
                        🔊 Réécouter
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl text-sm">L'assistant réfléchit...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3 flex gap-2 items-center">
              <button onClick={listening ? stopListening : startListening}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition flex-shrink-0 ${
                        listening ? "bg-red-500 text-white animate-pulse" : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}>
                🎤
              </button>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                     onKeyDown={handleKeyDown}
                     placeholder={listening ? "Parlez maintenant..." : (language === "en" ? "Your question..." : "Votre question...")}
                     className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
              <button onClick={() => handleSend()} disabled={loading}
                      className="bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2 rounded-xl text-sm transition disabled:opacity-50">
                Envoyer
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Cliquez sur le micro pour parler. Fonctionne mieux sur Google Chrome.
          </p>
        </>
      )}

    </div>
  );
}