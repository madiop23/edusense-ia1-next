"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, doc, getDoc, addDoc, updateDoc, query, where
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";
import { createNotification } from "@/lib/notifications";
export default function TeacherMessagesPage() {
  const [currentUid, setCurrentUid] = useState("");
  const [contacts, setContacts] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // Broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [myClasses, setMyClasses] = useState([]);
  const [broadcastClassId, setBroadcastClassId] = useState("");
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setCurrentUid(user.uid);
      try {
        const classesSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes"));
        const allClasses = classesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const myClassIds = new Set();
        for (const c of allClasses) {
          const assignSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "classes", c.id, "subjectAssignments"));
          assignSnap.docs.forEach((a) => { if (a.data().teacherId === user.uid) myClassIds.add(c.id); });
        }

        const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
        const myStudents = studentsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => myClassIds.has(s.classId));
        const myStudentIds = myStudents.map((s) => s.id);

        const parentIdsByStudent = {};
        const linksSnap = await getDocs(collection(db, "parentLinks"));
        linksSnap.docs.forEach((d) => {
          const link = d.data();
          if (myStudentIds.includes(link.studentId)) {
            if (!parentIdsByStudent[link.studentId]) parentIdsByStudent[link.studentId] = [];
            parentIdsByStudent[link.studentId].push(link.parentId);
          }
        });

        const usersSnap = await getDocs(collection(db, "users"));
        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const map = {};
        allUsers.forEach((u) => { map[u.id] = u.displayName || u.email || "Utilisateur"; });
        setUsersMap(map);

        const allowedContacts = [];
        myStudents.forEach((s) => {
          if (s.userId && map[s.userId]) {
            allowedContacts.push({ id: s.userId, name: `${s.firstName} ${s.lastName}`, role: "Élève" });
          }
        });
        Object.entries(parentIdsByStudent).forEach(([studentId, parentIds]) => {
          const student = myStudents.find((s) => s.id === studentId);
          parentIds.forEach((pid) => {
            if (map[pid]) {
              allowedContacts.push({ id: pid, name: map[pid], role: `Parent de ${student?.firstName || ""}` });
            }
          });
        });
        setContacts(allowedContacts);

        setMyClasses(allClasses.filter((c) => myClassIds.has(c.id)));

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
    setShowBroadcast(false);
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

  const sendBroadcast = async () => {
    if (!broadcastClassId || !broadcastText.trim()) {
      setBroadcastMsg("Choisissez une classe et écrivez un message.");
      return;
    }
    setBroadcastMsg("");
    try {
      const studentsSnap = await getDocs(collection(db, "schools", SCHOOL_ID, "students"));
      const classStudents = studentsSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.classId === broadcastClassId);

      const participantIds = new Set([currentUid]);
      classStudents.forEach((s) => { if (s.userId) participantIds.add(s.userId); });

      const linksSnap = await getDocs(collection(db, "parentLinks"));
      const studentIds = classStudents.map((s) => s.id);
      linksSnap.docs.forEach((d) => {
        const link = d.data();
        if (studentIds.includes(link.studentId) && link.parentId) {
          participantIds.add(link.parentId);
        }
      });

      const className = myClasses.find((c) => c.id === broadcastClassId)?.name || "Classe";
      const newConv = {
        schoolId: SCHOOL_ID,
        type: "broadcast",
        classId: broadcastClassId,
        title: `Diffusion - ${className}`,
        participantIds: Array.from(participantIds),
        lastMessageAt: new Date(),
        createdBy: currentUid,
      };
      const ref = await addDoc(collection(db, "conversations"), newConv);

      await addDoc(collection(db, "conversations", ref.id, "messages"), {
        senderId: currentUid,
        body: broadcastText,
        readBy: [currentUid],
        createdAt: new Date(),
      });

      setBroadcastText("");
      setBroadcastClassId("");
      setShowBroadcast(false);
      setBroadcastMsg("");
      loadConversations(currentUid);
      alert("Diffusion envoyée à la classe !");
    } catch (err) {
      console.error("Erreur broadcast:", err);
      setBroadcastMsg("Erreur lors de l'envoi.");
    }
  };

  const otherName = (conv) => {
    if (conv.type === "broadcast") return conv.title || "Diffusion";
    const otherId = conv.participantIds.find((id) => id !== currentUid);
    return usersMap[otherId] || "Conversation";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">

      <div className="rounded-2xl p-6 text-white shadow-lg"
           style={{ background: "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)" }}>
        <h1 className="text-2xl font-bold mb-1">Messages</h1>
        <p className="text-green-100 text-sm">Échangez avec les élèves et les parents de vos classes.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex" style={{ height: "65vh" }}>

        <div className="w-1/3 border-r flex flex-col">
          <div className="p-3 border-b">
            <button onClick={() => { setShowNew(true); setShowBroadcast(false); setActiveConv(null); }}
                    className="w-full bg-green-700 hover:bg-green-800 text-white text-sm py-2 rounded-lg transition mb-2">
              + Nouveau message
            </button>
            <button onClick={() => { setShowBroadcast(true); setShowNew(false); setActiveConv(null); }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm py-2 rounded-lg transition">
              📢 Diffusion à une classe
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
                  {conv.type === "broadcast" && <span className="text-xs text-emerald-600">📢 Diffusion</span>}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {showBroadcast ? (
            <div className="p-4">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Diffusion à une classe</h3>
              {broadcastMsg && <p className="text-xs text-red-600 mb-2">{broadcastMsg}</p>}
              <div className="space-y-3">
                <select value={broadcastClassId} onChange={(e) => setBroadcastClassId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none">
                  <option value="">-- Choisir une classe --</option>
                  {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <textarea value={broadcastText} onChange={(e) => setBroadcastText(e.target.value)}
                          rows="5" placeholder="Message à toute la classe (élèves + parents)..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                <button onClick={sendBroadcast}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm transition">
                  Envoyer la diffusion
                </button>
              </div>
            </div>
          ) : showNew ? (
            <div className="p-4 overflow-y-auto">
              <h3 className="font-semibold text-gray-700 mb-3 text-sm">Choisir un destinataire</h3>
              {contacts.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun contact disponible.</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map((c, i) => (
                    <button key={`${c.id}-${i}`} onClick={() => startConversation(c.id)}
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
              {/* Pas de réponse possible sur un broadcast (sens unique) */}
              {activeConv.type !== "broadcast" && (
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
              )}
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