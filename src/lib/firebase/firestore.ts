import { db } from "./config";
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, orderBy, query } from "firebase/firestore";

export interface CareerData {
  name?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  strengths?: string[];
  goals?: string[];
  lastUpdated: number;
}

export interface CompanyData {
  id: string;
  name: string;
  industry?: string;
  jobDescription?: string;
  corporatePhilosophy?: string;
  interviewNotes?: string;
  status: 'considering' | 'applied' | 'interviewing' | 'offered' | 'rejected';
  matchingAnalysis?: {
    score: number;
    reasons: string[];
    gaps: string[];
  };
  customDocuments?: {
    selfPR: string;
    interviewQA: string;
    reverseQuestions: string;
  };
  createdAt: number;
  updatedAt: number;
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
      
      // data内の配列（空配列も含む）で既存データを上書きして消去しないよう、マージ処理を行う
      const mergedData: Partial<CareerData> = { ...data };
      const categories = ['skills', 'experience', 'education', 'strengths', 'goals'] as const;
      
      categories.forEach(key => {
        if (data[key] !== undefined) {
          const existingArr = Array.isArray(existing[key]) ? existing[key] as string[] : [];
          const newArr = Array.isArray(data[key]) ? data[key] as string[] : [];
          // 既存の配列と新しい配列を結合し、空文字を排除して重複をなくす
          mergedData[key] = Array.from(new Set([...existingArr, ...newArr])).filter(item => item && item.trim() !== "");
        }
      });

      finalData = {
        ...existing,
        ...mergedData,
        lastUpdated: now,
      };
      
      // マージ済みのデータでドキュメントを更新
      await updateDoc(careerRef, {
        ...mergedData,
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
 * 企業データを保存・更新する
 */
export async function saveCompanyData(uid: string, companyData: Partial<CompanyData> & { name: string }) {
  const companyId = companyData.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const companyRef = doc(db, "users", uid, "companies", companyId);

  try {
    const now = Date.now();
    const finalData = {
      ...companyData,
      id: companyId,
      updatedAt: now,
      createdAt: companyData.createdAt || now,
    };
    await setDoc(companyRef, finalData, { merge: true });
    return finalData as CompanyData;
  } catch (error) {
    console.error("Error saving company data:", error);
    throw error;
  }
}

/**
 * ユーザーの全企業リストを取得する
 */
export async function getCompanies(uid: string): Promise<CompanyData[]> {
  const companiesRef = collection(db, "users", uid, "companies");
  try {
    const q = query(companiesRef, orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data() as CompanyData);
  } catch (error) {
    console.error("Error getting companies:", error);
    return [];
  }
}

/**
 * 特定の企業データを取得する
 */
export async function getCompany(uid: string, companyId: string): Promise<CompanyData | null> {
  const companyRef = doc(db, "users", uid, "companies", companyId);
  try {
    const docSnap = await getDoc(companyRef);
    if (docSnap.exists()) {
      return docSnap.data() as CompanyData;
    }
    return null;
  } catch (error) {
    console.error("Error getting company:", error);
    return null;
  }
}

/**
 * 企業データを削除する
 */
export async function deleteCompany(uid: string, companyId: string) {
  const companyRef = doc(db, "users", uid, "companies", companyId);
  try {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(companyRef);
  } catch (error) {
    console.error("Error deleting company:", error);
    throw error;
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
