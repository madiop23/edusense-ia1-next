import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SCHOOL_ID } from "@/lib/school";

// Crée une notification pour un destinataire
export async function createNotification({ userId, type, title, body, module, entityId, actionUrl }) {
  if (!userId) return;
  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      schoolId: SCHOOL_ID,
      type: type || "info",
      title: title || "",
      body: body || "",
      read: false,
      data: {
        module: module || "",
        entityId: entityId || "",
        actionUrl: actionUrl || "",
      },
      createdAt: new Date(),
    });
  } catch (err) {
    console.error("Erreur création notification:", err);
  }
}

// Crée la même notification pour plusieurs destinataires
export async function notifyMany(userIds, payload) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    await createNotification({ ...payload, userId });
  }
}