"use client";

import Link from "next/link";

export default function Home() {
  const features = [
    { icon: "⭐", title: "Gestion des notes", desc: "Saisie et suivi des évaluations par matière." },
    { icon: "📋", title: "Suivi des présences", desc: "Enregistrement et consultation des absences." },
    { icon: "🏫", title: "Gestion des classes", desc: "Organisation des classes, matières et élèves." },
    { icon: "👥", title: "Multi-rôles", desc: "Espaces dédiés : admin, enseignant, élève, parent." },
    { icon: "💳", title: "Frais & paiements", desc: "Suivi des frais de scolarité." },
    { icon: "📅", title: "Emploi du temps", desc: "Visualisation des créneaux par classe." },
  ];

  const roles = [
    { icon: "🛡️", label: "Administrateur" },
    { icon: "🏛️", label: "Principal" },
    { icon: "👨‍🏫", label: "Enseignant" },
    { icon: "🎓", label: "Élève" },
    { icon: "👨‍👩‍👧", label: "Parent" },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-green-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white font-bold">
              E
            </div>
            <span className="font-bold text-gray-800">
              EDU-SENSE <span className="text-green-600">IA</span>
            </span>
          </div>
          <Link href="/login"
                className="bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition">
            Se connecter
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="pt-32 pb-20 px-6 text-white"
              style={{ background: "linear-gradient(135deg, #14532d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-sm mb-6">
            ✨ Plateforme intelligente de gestion scolaire
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
            Gérez votre établissement scolaire en toute simplicité
          </h1>
          <p className="text-green-50 text-lg mb-8 max-w-2xl mx-auto">
            EDU-SENSE IA réunit la gestion des notes, présences, classes et bien plus, dans une plateforme moderne et intuitive.
          </p>
          <Link href="/login"
                className="inline-block bg-white text-green-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-2xl transition">
            Accéder à la plateforme →
          </Link>
        </div>
      </header>

      {/* FONCTIONNALITÉS */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-green-600 font-semibold text-sm uppercase">Fonctionnalités</span>
            <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Tout ce dont votre école a besoin</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-green-50 shadow-sm hover:shadow-lg transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-800 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACTEURS */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-green-600 font-semibold text-sm uppercase">Pour tous</span>
            <h2 className="text-3xl font-extrabold text-gray-800 mt-2">Un espace pour chaque acteur</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
            {roles.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-green-50 shadow-sm text-center hover:shadow-lg transition">
                <div className="text-3xl mb-2">{r.icon}</div>
                <p className="font-medium text-gray-800 text-sm">{r.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto rounded-3xl p-10 text-center text-white shadow-xl"
             style={{ background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)" }}>
          <h2 className="text-3xl font-extrabold mb-4">Prêt à commencer ?</h2>
          <p className="text-green-50 mb-8">Connectez-vous pour accéder à votre espace.</p>
          <Link href="/login"
                className="inline-block bg-white text-green-700 px-8 py-3.5 rounded-xl font-semibold hover:shadow-2xl transition">
            Se connecter
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-6 text-center text-sm">
        © 2026 EDU-SENSE IA — Projet académique. Tous droits réservés.
      </footer>

    </div>
  );
}