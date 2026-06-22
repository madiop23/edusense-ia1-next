import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { studentName, subjectName, grades } = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    // Construire un résumé des notes
    const gradesText = grades && grades.length > 0
      ? grades.map((g) => `${g.examLabel || "Évaluation"}: ${g.score}/${g.maxScore || 20}`).join(", ")
      : "Aucune note enregistrée";

    const prompt = `Tu es un enseignant qui rédige une appréciation pour le bulletin d'un élève.

Élève : ${studentName}
Matière : ${subjectName}
Notes obtenues : ${gradesText}

Rédige une appréciation de bulletin de 1 à 2 phrases en français, professionnelle et bienveillante, qui :
- Reflète le niveau de l'élève d'après ses notes
- Encourage ou conseille selon les résultats

RÈGLES :
- Réponds UNIQUEMENT avec le texte de l'appréciation, sans préambule.
- N'utilise pas de symboles de formatage (#, *, $).
- Reste concis et adapté à un bulletin scolaire.`;

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

    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    console.error("Erreur appréciation:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}