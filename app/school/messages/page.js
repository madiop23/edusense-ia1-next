"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, doc, addDoc, updateDoc, query, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { createNotification } from "@/lib/notifications";

export default function SchoolMessagesPage() {
  const [currentUid, setCurrentUid] = useState("");
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        // Charger tous les users de l'école (le principal peut écrire à tous)
        const usersSnap = await getDocs(collection(db, "users"));
        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const map = {};
        allUsers.forEach((u) => { map[u.id] = u.displayName || u.email || "Utilisateur"; });
        setUsersMap(map);

        // Contacts : tous les users de l'école sauf lui-même
        const roleLabels = {
          teacher: "Enseignant", parent: "Parent", student: "Élève",
          representative: "Responsable", admin: "Admin", school: "Principal",
        };
        const allowedContacts = allUsers
          .filter((u) => u.schoolId === SCHOOL_ID && u.id !== user.uid)
          .map((u) => ({ id: u.id, name: map[u.id], role: roleLabels[u.role] || u.role }));
        setContacts(allowedContacts);

        await loadConversations(user.uid);
      } catch (err) {
        console.error("Erreur chargement:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadConversations = async (uid) => {
    try {
      const convSnap = await getDocs(query(collection(db, "conversations"), where("participantIds", "array-contains", uid)));
      let convs = convSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      convs.sort((a, b) => {
        const ta = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 0;
        const tb = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 0;
        return tb - ta;
      });
      setConversations(convs);
    } catch (err) {
      console.error("Erreur conversations:", err);
    }
  };

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setShowNew(false);
    try {
      const msgsSnap = await getDocs(collection(db, "conversations", conv.id, "messages"));
      let msgs = msgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => {
        const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return ta - tb;
      });
      setMessages(msgs);
    } catch (err) {
      console.error("Erreur messages:", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startConversation = async (contactId) => {
    try {
      const convSnap = await getDocs(query(collection(db, "conversations"), where("participantIds", "array-contains", currentUid)));
      const existing = convSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .find((c) => c.type === "direct" && c.participantIds.includes(contactId));

      if (existing) { openConversation(existing); return; }

      const newConv = {
        schoolId: SCHOOL_ID,
        type: "direct",
        participantIds: [currentUid, contactId].sort(),
        lastMessageAt: new Date(),
        createdBy: currentUid,
      };
      const ref = await addDoc(collection(db, "conversations"), newConv);
      const created = { id: ref.id, ...newConv };
      setConversations((prev) => [created, ...prev]);
      openConversation(created);
    } catch (err) {
      console.error("Erreur création:", err);
    }
  };

 const sendMessage = async () => {
    const body = newMessage.trim();
    if (!body || !activeConv) return;
    setNewMessage("");
    try {
      await addDoc(collection(db, "conversations", activeConv.id, "messages"), {
        senderId: currentUid,
        body: body,
        readBy: [currentUid],
        createdAt: new Date(),
      });
      await updateDoc(doc(db, "conversations", activeConv.id), { lastMessageAt: new Date() });

      // Notifier l'autre participant (conversation directe)
      if (activeConv.type === "direct") {
        const recipientId = activeConv.participantIds.find((id) => id !== currentUid);
        if (recipientId) {
          await createNotification({
            userId: recipientId,
            type: "message",
            title: "Nouveau message",
            body: `Vous avez reçu un message : "${body.length > 50 ? body.substring(0, 50) + "..." : body}"`,
            module: "messaging",
            entityId: activeConv.id,
            actionUrl: "",
          });
        }
      }

      openConversation(activeConv);
    } catch (err) {
      console.error("Erreur envoi:", err);
    }
  };

  const otherName = (conv) => {
    const otherId = conv.participantIds.find((id) => id !== currentUid);
    return usersMap[otherId] || "Conversation";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Messages</h1>
        <p className="text-green-100 text-sm">Communiquez avec les membres de l'établissement.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex" style={{ height: "65vh" }}>

        <div className="w-1/3 border-r flex flex-col">
          <div className="p-3 border-b">
            <button onClick={() => { setShowNew(true); setActiveConv(null); }}
                    className="w-full bg-green-700 hover:bg-green-800 text-white text-sm py-2 rounded-lg transition">
              + Nouveau message
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-gray-400 py-6 text-sm">Chargement...</p>
            ) : conversations.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-xs px-3">Aucune conversation.</p>
            ) : (
              conversations.map((conv) => (
                <button key={conv.id} onClick={() => openConversation(conv)}
                        className={`w-full text-left px-4 py-3 border-b hover:bg-green-50 transition ${
                          activeConv?.id === conv.id ? "bg-green-50" : ""
                        }`}>
                  <p className="font-medium text-sm">{otherName(conv)}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {showNew ? (
            <div className="p-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Choisir un destinataire</h3>
              {contacts.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun contact disponible.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c) => (
                    <button key={c.id} onClick={() => startConversation(c.id)}
                            className="w-full text-left px-4 py-2.5 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition">
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.role}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : activeConv ? (
            <>
              <div className="px-4 py-3 border-b">
                <p className="font-semibold text-sm">{otherName(activeConv)}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">Aucun message.</p>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.senderId === currentUid ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                        m.senderId === currentUid ? "bg-green-700 text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}>
                        {m.body}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t p-3 flex gap-2">
                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                       onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                       placeholder="Votre message..."
                       className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                <button onClick={sendMessage}
                        className="bg-green-700 hover:bg-green-800 text-white px-5 py-2 rounded-xl text-sm transition">
                  Envoyer
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Sélectionnez une conversation ou créez-en une.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}