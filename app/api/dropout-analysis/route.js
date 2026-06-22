import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { studentName, average, absences, riskLevel } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    const prompt = `Tu es un conseiller pédagogique. Analyse la situation d'un élève et donne une recommandation courte.

Élève : ${studentName}
Moyenne générale : ${average}/20
Nombre d'absences/retards : ${absences}
Niveau de risque détecté : ${riskLevel}

Rédige en français, en 1 à 2 phrases :
- Un constat bref de la situation
- Une recommandation concrète pour aider l'élève

RÈGLES :
- Réponds UNIQUEMENT avec le texte, sans préambule.
- Pas de symboles de formatage (#, *, $).
- Ton bienveillant et constructif.`;

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
      return NextResponse.json({ error: "Aucun contenu généré" }, { status: 500 });
    }

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("Erreur analyse:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}