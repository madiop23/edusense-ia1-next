import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { message, history, language } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    // Langue de réponse
    const langInstruction = language === "en"
      ? "Respond in English."
      : "Réponds en français.";

    // Cadrage pédagogique strict
    const systemPrompt = `Tu es un assistant pédagogique bienveillant pour un élève, dans l'application EDU-SENSE IA.

TON RÔLE :
- Aider l'élève à COMPRENDRE, pas faire le travail à sa place.
- Expliquer les concepts avec des exemples simples.
- Guider l'élève par des questions et des pistes de réflexion.
- Encourager et motiver.

RÈGLES STRICTES :
- Ne donne JAMAIS directement la réponse complète d'un devoir ou d'un exercice. Guide plutôt l'élève vers la solution.
- Si l'élève demande "donne-moi la réponse", explique gentiment que tu préfères l'aider à trouver par lui-même, et propose une première étape.
- Reste sur des sujets scolaires (maths, français, sciences, etc.). Si on te pose une question hors-sujet, ramène poliment vers les études.
- Adapte ton langage à un élève (simple et clair).
- N'utilise pas de symboles de formatage (#, *, $). Écris les maths simplement (x², 3/4).

${langInstruction}`;

    // Construire la conversation
    const contents = [];
    // Premier message = instructions système (Gemini n'a pas de "system" séparé en v1beta simple)
    contents.push({ role: "user", parts: [{ text: systemPrompt }] });
    contents.push({ role: "model", parts: [{ text: language === "en" ? "Understood, I'm ready to help!" : "Compris, je suis prêt à aider !" }] });

    // Historique de la conversation
    if (history && history.length > 0) {
      history.forEach((msg) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }],
        });
      });
    }

    // Message actuel
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Réponse Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Aucune réponse générée" }, { status: 500 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("Erreur chatbot:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}