import { db } from "./config";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

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
export async function updateCareerData(uid: string, data: Partial<CareerData>) {
  const userRef = doc(db, "users", uid);
  const careerRef = doc(userRef, "profile", "career");

  try {
    const docSnap = await getDoc(careerRef);
    if (docSnap.exists()) {
      await updateDoc(careerRef, {
        ...data,
        lastUpdated: Date.now(),
      });
    } else {
      await setDoc(careerRef, {
        ...data,
        lastUpdated: Date.now(),
      });
    }
    console.log("Career data updated successfully for user:", uid);
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
