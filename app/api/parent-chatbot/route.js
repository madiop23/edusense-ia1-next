import { NextResponse } from "next/server";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  try {
    const body = await request.json();
    const message = body.message;
    const history = body.history;
    const language = body.language;
    const childData = body.childData;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Cle API manquante" }, { status: 500 });
    }

    const langInstruction = language === "en" ? "Respond in English." : "Reponds en francais.";

    let childContext = "Aucune donnee disponible.";
    if (childData) {
      childContext = "Nom: " + childData.name + ". Classe: " + childData.className + ". Moyenne: " + childData.average + "/20. Absences: " + childData.absences + ". Notes: " + (childData.gradesDetail || "Aucune note") + ".";
    }

    const systemPrompt = "Tu es un assistant bienveillant qui aide un parent a suivre la scolarite de son enfant. Donnees de l'enfant: " + childContext + " Reponds simplement et avec bienveillance, en 2 a 4 phrases courtes, en utilisant uniquement ces donnees. N'utilise pas de symboles comme etoile ou diese. " + langInstruction;

    const contents = [];
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: "Compris" }] });

    if (history && history.length > 0) {
      const recentHistory = history.slice(-6);
      for (let i = 0; i < recentHistory.length; i++) {
        const msg = recentHistory[i];
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: contents,
            generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
          }),
        }
      );

      const data = await response.json();

      if (data.error && (data.error.code === 503 || data.error.code === 429)) {
        await wait(1500);
        continue;
      }

      if (data.error) {
        return NextResponse.json({ error: data.error.message }, { status: 500 });
      }

      let text = "";
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
        text = data.candidates[0].content.parts[0].text || "";
      }

      if (text) {
        return NextResponse.json({ text: text.trim() });
      }
    }

    return NextResponse.json({ error: "Service IA tres sollicite. Reessayez." }, { status: 503 });
  } catch (err) {
    console.error("Erreur chatbot parent:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}   