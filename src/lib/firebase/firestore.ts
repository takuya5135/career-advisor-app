import { db } from "./config";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

export interface CareerData {
  skills?: string[];
  experience?: string[];
  education?: string[];
  strengths?: string[];
  goals?: string[];
  lastUpdated: number;
}

/**
 * ユーザーのキャリアデータを保存・更新する
 */
export async function updateCareerData(uid: string, data: Partial<CareerData>): Promise<CareerData> {
  const userRef = doc(db, "users", uid);
  const careerRef = doc(userRef, "profile", "career");

  try {
    const docSnap = await getDoc(careerRef);
    const now = Date.now();
    let finalData: CareerData;

    if (docSnap.exists()) {
      const existing = docSnap.data() as CareerData;
      finalData = {
        ...existing,
        ...data,
        lastUpdated: now,
      };
      await updateDoc(careerRef, {
        ...data,
        lastUpdated: now,
      });
    } else {
      finalData = {
        ...data,
        lastUpdated: now,
      } as CareerData;
      await setDoc(careerRef, finalData);
    }
    console.log("Career data updated successfully for user:", uid);
    return finalData;
  } catch (error) {
    console.error("Error updating career data:", error);
    throw error;
  }
}

/**
 * ユーザーのキャリアデータを取得する
 */
export async function getCareerData(uid: string): Promise<CareerData | null> {
  const careerRef = doc(db, "users", uid, "profile", "career");
  try {
    const docSnap = await getDoc(careerRef);
    if (docSnap.exists()) {
      return docSnap.data() as CareerData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching career data:", error);
    return null;
  }
}

/**
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  sessionId: string;
  mode: "consult" | "interview";
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

/**
 * チャットセッションをFirestoreに保存・更新する
 */
export async function saveChatSession(
  uid: string,
  sessionId: string,
  messages: ChatMessage[],
  mode: "consult" | "interview"
): Promise<void> {
  const sessionRef = doc(db, "users", uid, "sessions", sessionId);
  try {
    const docSnap = await getDoc(sessionRef);
    const now = Date.now();
    if (docSnap.exists()) {
      await updateDoc(sessionRef, {
        messages,
        updatedAt: now,
      });
    } else {
      await setDoc(sessionRef, {
        sessionId,
        mode,
        createdAt: now,
        updatedAt: now,
        messages,
      });
    }
  } catch (error) {
    console.error("Error saving chat session:", error);
    // 保存失敗はUI側に影響させない（サイレントに失敗）
  }
}

/**
 * ユーザーの全チャットセッションを取得する（最新順）
 */
export async function getChatSessions(uid: string): Promise<ChatSession[]> {
  try {
    const sessionsRef = collection(db, "users", uid, "sessions");
    const q = query(sessionsRef, orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ChatSession);
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return [];
  }
}
