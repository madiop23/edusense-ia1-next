"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

/* ---------- Compteur anime (declenche au scroll) ---------- */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done.current) {
            done.current = true;
            const duration = 1500;
            const start = performance.now();
            const step = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              setValue(Math.floor(progress * target));
              if (progress < 1) requestAnimationFrame(step);
              else setValue(target);
            };
            requestAnimationFrame(step);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/* ---------- Wrapper d apparition au scroll ---------- */
function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const stats = [
    { n: 5, l: "Espaces dedies", i: "fa-users", s: "" },
    { n: 100, l: "IA integree", i: "fa-brain", s: "%" },
    { n: 24, l: "Accessible", i: "fa-clock", s: "/7" },
    { n: 15, l: "Fonctionnalites", i: "fa-star", s: "+" },
  ];

  const features = [
    { i: "fa-star", t: "Gestion des notes", d: "Saisie, validation et calcul automatique des moyennes ponderees par coefficient." },
    { i: "fa-file-alt", t: "Bulletins automatiques", d: "Generation instantanee des bulletins avec rang et appreciation par IA." },
    { i: "fa-calendar-xmark", t: "Suivi des absences", d: "Enregistrement des absences et detection des eleves a risque." },
    { i: "fa-robot", t: "Assistant vocal IA", d: "Un chatbot intelligent qui repond aux questions des eleves par la voix." },
    { i: "fa-calendar", t: "Emploi du temps", d: "Gestion des creneaux et visualisation hebdomadaire pour chaque classe." },
    { i: "fa-credit-card", t: "Paiements en ligne", d: "Suivi des frais de scolarite et paiements pour les parents." },
  ];

  const ia = [
    { i: "fa-triangle-exclamation", t: "Detection du decrochage", d: "L'IA analyse les absences et les notes pour reperer les eleves en difficulte avant qu'il ne soit trop tard." },
    { i: "fa-wand-magic-sparkles", t: "Generation de bulletins", d: "Moyennes, rangs et appreciations personnalisees generes automatiquement." },
    { i: "fa-comments", t: "Chatbot et Quiz intelligents", d: "Assistant vocal et quiz d'auto-evaluation generes en temps reel par l'IA." },
  ];

 const acteurs = [
  { i: "fa-user-shield", t: "Administrateur", d: "Gestion globale" },
  { i: "fa-building-columns", t: "Principal", d: "Direction etablissement" },
  { i: "fa-chalkboard-user", t: "Enseignant", d: "Notes et cours" },
  { i: "fa-user-graduate", t: "Eleve", d: "Suivi et IA" },
  { i: "fa-users", t: "Parent", d: "Suivi enfant" },
  { i: "fa-user-tie", t: "Responsable", d: "Pilotage" },
];

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-lg border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo/edusense-logo-full.png"
              alt="EDU SENSE IA"
              width={240}
              height={76}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#fonctionnalites" className="hover:text-[#0AAAFF] transition">Fonctionnalites</a>
            <a href="#ia" className="hover:text-[#0AAAFF] transition">Intelligence IA</a>
            <a href="#acteurs" className="hover:text-[#0AAAFF] transition">Acteurs</a>
            <a href="#stats" className="hover:text-[#0AAAFF] transition">Chiffres</a>
          </div>
          <Link
            href="/login"
            className="bg-[#5FBF56] hover:bg-[#4CAE46] text-white px-5 py-2.5 rounded-xl text-sm font-medium transition hover:shadow-lg"
          >
            <i className="fas fa-sign-in-alt mr-2"></i>Se connecter
          </Link>
        </div>
      </nav>

      <header className="hero-gradient pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center relative z-10">
          <div className="text-white">
            <Reveal>
              <span className="inline-block bg-white/15 backdrop-blur px-4 py-1.5 rounded-full text-sm mb-6">
                <i className="fas fa-sparkles mr-2"></i>Propulse par l&apos;Intelligence Artificielle
              </span>
            </Reveal>
            <Reveal delay={100}>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
                Revolutionnez la gestion de votre etablissement scolaire
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="text-white/80 text-lg mb-8 leading-relaxed">
                EDU-SENSE IA combine gestion scolaire complete et intelligence artificielle pour detecter le decrochage, generer des bulletins et accompagner chaque eleve.
              </p>
            </Reveal>
            <Reveal delay={300}>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="bg-white text-[#022B63] px-7 py-3.5 rounded-xl font-semibold hover:shadow-2xl transition hover:-translate-y-1"
                >
                  <i className="fas fa-rocket mr-2"></i>Commencer maintenant
                </Link>
                <Link
                  href="#fonctionnalites"
                  className="bg-white/15 backdrop-blur text-white px-7 py-3.5 rounded-xl font-semibold hover:bg-white/25 transition"
                >
                  <i className="fas fa-play mr-2"></i>Decouvrir
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div className="hidden md:flex justify-center">
              <div className="float w-72 h-72 bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 flex items-center justify-center shadow-2xl">
                <i className="fas fa-graduation-cap text-white" style={{ fontSize: "8rem" }}></i>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
          <svg viewBox="0 0 1200 120" className="w-full h-16" preserveAspectRatio="none">
            <path
              d="M0,0V46.29c47.79,22,103.59,32.05,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,30.43,512.34,53,583,72.05c69.27,18.48,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              fill="#ffffff"
            />
          </svg>
        </div>
      </header>

      <section id="stats" className="py-16 px-6 -mt-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((st, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="card-hover bg-white rounded-2xl shadow-md border border-blue-50 p-6 text-center">
                <div className="w-12 h-12 mx-auto bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                  <i className={`fas ${st.i} text-[#0AAAFF] text-lg`}></i>
                </div>
                <p className="text-3xl font-extrabold text-[#022B63]">
                  <Counter target={st.n} suffix={st.s} />
                </p>
                <p className="text-sm text-gray-500 mt-1">{st.l}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="fonctionnalites" className="py-20 px-6 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-[#0AAAFF] font-semibold text-sm uppercase tracking-wide">Fonctionnalites</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#022B63] mt-2">Tout ce dont votre ecole a besoin</h2>
              <p className="text-gray-500 mt-3 max-w-2xl mx-auto">Une plateforme complete qui reunit toutes les facettes de la gestion scolaire moderne.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="card-hover bg-white rounded-2xl p-6 border border-blue-50 shadow-sm h-full">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0AAAFF] to-[#022B63] rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <i className={`fas ${f.i} text-white`}></i>
                  </div>
                  <h3 className="font-bold text-[#022B63] mb-2">{f.t}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="ia" className="py-20 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <Reveal>
              <span className="text-[#0AAAFF] font-semibold text-sm uppercase tracking-wide">Intelligence Artificielle</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#022B63] mt-2 mb-6">Une IA au service de la reussite</h2>
            </Reveal>
            <div className="space-y-5">
              {ia.map((item, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 flex-shrink-0 bg-blue-50 rounded-xl flex items-center justify-center">
                      <i className={`fas ${item.i} text-[#0AAAFF]`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-[#022B63]">{item.t}</h3>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{item.d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={150}>
            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="w-64 h-64 hero-gradient rounded-3xl flex items-center justify-center shadow-2xl"
                  style={{ animation: "pulse2 4s ease-in-out infinite" }}
                >
                  <i className="fas fa-brain text-white" style={{ fontSize: "7rem" }}></i>
                </div>
                <div className="float absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-3">
                  <i className="fas fa-chart-line text-[#5FBF56] text-xl"></i>
                </div>
                <div className="float absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-3" style={{ animationDelay: "1s" }}>
                  <i className="fas fa-graduation-cap text-[#5FBF56] text-xl"></i>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="acteurs" className="py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center mb-14">
              <span className="text-[#0AAAFF] font-semibold text-sm uppercase tracking-wide">Pour tous</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#022B63] mt-2">Un espace pour chaque acteur</h2>
            </div>
          </Reveal>
          <div className="grid grid-cols-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
            {acteurs.map((a, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="card-hover bg-white rounded-2xl p-5 border border-blue-50 shadow-sm text-center h-full">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-[#0AAAFF] to-[#022B63] rounded-2xl flex items-center justify-center mb-3 shadow-md">
                    <i className={`fas ${a.i} text-white text-xl`}></i>
                  </div>
                  <h3 className="font-bold text-[#022B63] text-sm">{a.t}</h3>
                  <p className="text-xs text-gray-400 mt-1">{a.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto hero-gradient rounded-3xl p-12 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Pret a transformer votre etablissement ?</h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">Rejoignez EDU-SENSE IA et offrez a votre ecole les outils intelligents de demain.</p>
            <Link
              href="/login"
              className="inline-block bg-white text-[#022B63] px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition hover:-translate-y-1"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>Acceder a la plateforme
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="bg-[#022B63] text-white/60 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo/edusense-logo-icon.png"
                alt="EDU SENSE IA"
                width={40}
                height={40}
              />
              <div>
                <p className="font-bold text-white">EDU-SENSE <span className="text-[#5FBF56]">IA</span></p>
                <p className="text-xs">Plateforme intelligente de gestion scolaire</p>
              </div>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#fonctionnalites" className="hover:text-[#5FBF56] transition">Fonctionnalites</a>
              <a href="#ia" className="hover:text-[#5FBF56] transition">IA</a>
              <Link href="/login" className="hover:text-[#5FBF56] transition">Connexion</Link>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-sm">
            {"\u00A9"} 2026 EDU-SENSE IA - Projet academique. Tous droits reserves.
          </div>
        </div>
      </footer>
    </div>
  );
}