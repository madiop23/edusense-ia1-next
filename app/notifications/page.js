"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState("");

  const loadNotifications = async (uid) => {
    try {
      const q = query(collection(db, "notifications"), where("userId", "==", uid));
      const snap = await getDocs(q);
      let notifs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Trier par date (récent en haut)
      notifs.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });
      setNotifications(notifs);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      loadNotifications(user.uid);
    });
    return () => unsub();
  }, []);

  const markAsRead = async (notif) => {
    if (notif.read) return;
    try {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, "notifications", n.id), { read: true });
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("fr-FR") + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const typeIcon = (type) => {
    const map = {
      grade: "📝", assignment: "📚", invoice: "💳",
      message: "✉️", attendance: "📋", info: "🔔",
    };
    return map[type] || "🔔";
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Notifications</h1>
        <p className="text-green-100 text-sm">
          {unreadCount > 0 ? `${unreadCount} notification(s) non lue(s)` : "Vous êtes à jour"}
        </p>
      </div>

      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button onClick={markAllAsRead}
                  className="text-sm text-green-700 hover:text-green-800 font-medium">
            Tout marquer comme lu
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-400 py-8 text-sm">Chargement...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
          <p>Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div key={notif.id} onClick={() => markAsRead(notif)}
                 className={`bg-white rounded-xl border p-4 cursor-pointer transition hover:shadow-sm ${
                   notif.read ? "border-gray-100" : "border-green-300 bg-green-50"
                 }`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcon(notif.type)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${notif.read ? "font-medium text-gray-700" : "font-semibold text-gray-900"}`}>
                      {notif.title}
                    </p>
                    {!notif.read && <span className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(notif.createdAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}