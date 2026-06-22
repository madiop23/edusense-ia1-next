"use client";

import { useState, useRef, useEffect } from "react";

export default function StudentAssistantPage() {
  const [messages, setMessages] = useState([
    { role: "model", text: "Bonjour ! Je suis ton assistant. Pose-moi une question sur tes cours et je t'aiderai à comprendre." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState("fr");
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Lecture vocale d'un texte
  const speak = (text) => {
    if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // arrêter une lecture en cours
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "en" ? "en-US" : "fr-FR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Reconnaissance vocale (parler)
  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "en" ? "en-US" : "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e) => {
      console.error("Erreur reconnaissance:", e.error);
      setListening(false);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Envoyer automatiquement après reconnaissance
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
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(1);
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, language }),
      });
      const data = await response.json();

      if (data.text) {
        setMessages([...newMessages, { role: "model", text: data.text }]);
        speak(data.text); // lecture vocale de la réponse
      } else {
        setMessages([...newMessages, { role: "model", text: "Désolé, je n'ai pas pu répondre. Réessaie." }]);
      }
    } catch (err) {
      console.error("Erreur:", err);
      setMessages([...newMessages, { role: "model", text: "Une erreur est survenue. Réessaie." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Assistant IA</h1>
        <p className="text-green-100 text-sm">Écris ou parle, je t'aide à comprendre tes cours.</p>
      </div>

      {/* Contrôles : langue + voix */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setLanguage("fr")}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  language === "fr" ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}>
          Français
        </button>
        <button onClick={() => setLanguage("en")}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  language === "en" ? "bg-green-700 text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}>
          English
        </button>

        <div className="flex-1"></div>

        {/* Activer/désactiver la voix */}
        <button onClick={() => { setVoiceEnabled(!voiceEnabled); window.speechSynthesis?.cancel(); }}
                className={`text-sm px-3 py-1.5 rounded-lg transition ${
                  voiceEnabled ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                }`}>
          {voiceEnabled ? "🔊 Voix activée" : "🔇 Voix coupée"}
        </button>
      </div>

      {/* Zone de conversation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: "55vh" }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-green-700 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}>
                {msg.text}
                {/* Bouton réécouter pour les messages de l'assistant */}
                {msg.role === "model" && i > 0 && (
                  <button onClick={() => speak(msg.text)}
                          className="block mt-1 text-xs text-gray-400 hover:text-green-600">
                    🔊 Réécouter
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl text-sm">
                L'assistant réfléchit...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Zone de saisie */}
        <div className="border-t p-3 flex gap-2 items-center">
          {/* Bouton micro */}
          <button onClick={listening ? stopListening : startListening}
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition flex-shrink-0 ${
                    listening ? "bg-red-500 text-white animate-pulse" : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                  title={listening ? "Arrêter" : "Parler"}>
            🎤
          </button>

          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                 onKeyDown={handleKeyDown}
                 placeholder={listening ? "Parle maintenant..." : (language === "en" ? "Ask your question..." : "Pose ta question...")}
                 className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
          <button onClick={() => handleSend()} disabled={loading}
                  className="bg-green-700 hover:bg-green-800 text-white font-medium px-5 py-2 rounded-xl text-sm transition disabled:opacity-50">
            Envoyer
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Astuce : clique sur le micro pour parler. La reconnaissance vocale fonctionne mieux sur Google Chrome.
      </p>

    </div>
  );
}