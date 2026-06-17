"use client";

export default function AdminDashboard() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Tableau de bord — Admin 👋</h1>
        <p className="text-green-100 text-sm">Bienvenue sur EDU-SENSE IA</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <p className="text-gray-600">Utilisez le menu de gauche pour naviguer.</p>
      </div>
    </div>
  );
}