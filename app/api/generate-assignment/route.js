import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { subject, level, topic, type } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    // Construire le prompt pour Gemini
    const prompt = `Tu es un enseignant expérimenté. Génère un devoir/exercice pour des élèves.
Matière : ${subject}
Niveau : ${level}
Sujet : ${topic}
Type : ${type}

Réponds en français avec :
1. Un titre court pour le devoir
2. Une consigne claire
3. Les exercices/questions (3 à 5 questions adaptées au niveau)

RÈGLES D'ÉCRITURE IMPORTANTES :
- N'utilise PAS de notation LaTeX (pas de symboles $, pas de \\frac, pas de ^, pas de \\times).
- Écris les formules mathématiques en notation simple et lisible : par exemple "x²" pour x au carré, "3/4" pour les fractions, "5x + 15" pour les expressions.
- Pour les exposants, utilise les caractères ² ³ ou écris "au carré", "puissance 3".
- Pour les multiplications, utilise le signe × ou *.
- Le texte doit être directement lisible par un élève, sans aucun code ni symbole de formatage.
- N'utilise pas de symboles Markdown comme #, *, ** ou --- pour le formatage.

Ne mets pas les corrigés. Structure ta réponse clairement avec des numéros d'exercices.`;

    // Appeler l'API Gemini
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

    // Extraire le texte généré
    const generatedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!generatedText) {
      console.error("Réponse Gemini:", JSON.stringify(data));
      return NextResponse.json({ error: "Aucun contenu généré" }, { status: 500 });
    }

    return NextResponse.json({ text: generatedText });
  } catch (err) {
    console.error("Erreur génération:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}