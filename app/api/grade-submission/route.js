import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { assignmentTitle, assignmentDescription, studentAnswer, maxScore } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    const prompt = `Tu es un enseignant qui corrige le devoir d'un élève. Sois juste et bienveillant.

CONSIGNE DU DEVOIR :
${assignmentTitle}
${assignmentDescription}

RÉPONSE DE L'ÉLÈVE :
${studentAnswer}

Évalue cette réponse sur ${maxScore || 20} points.

Réponds UNIQUEMENT au format suivant, sans rien d'autre :
NOTE: [un nombre entre 0 et ${maxScore || 20}]
FEEDBACK: [une remarque constructive de 1 à 2 phrases, en français, qui explique la note et encourage l'élève]

RÈGLES :
- N'utilise pas de LaTeX ni de symboles de formatage (#, *, $).
- Sois objectif : une bonne réponse mérite une bonne note, une réponse incomplète une note moyenne.
- Le feedback doit être utile et encourageant.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      console.error("Réponse Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Aucun contenu généré" }, { status: 500 });
    }

    // Extraire la note et le feedback de la réponse
    const noteMatch = text.match(/NOTE:\s*([\d.,]+)/i);
    const feedbackMatch = text.match(/FEEDBACK:\s*([\s\S]+)/i);

    const score = noteMatch ? parseFloat(noteMatch[1].replace(",", ".")) : null;
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : text;

    return NextResponse.json({ score, feedback });
  } catch (err) {
    console.error("Erreur correction:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}