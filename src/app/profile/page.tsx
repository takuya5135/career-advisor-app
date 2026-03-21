"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  ResumeProfile,
  CareerHistoryEntry,
  QualificationEntry,
  getResumeProfile,
  saveResumeProfile,
} from "@/lib/firebase/firestore";

// デフォルト値
const defaultProfile: ResumeProfile = {
  name: "",
  furigana: "",
  birthday: "",
  gender: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
  careerHistory: [],
  qualifications: [],
  wishes: "",
  selfPR: "",
  lastUpdated: 0,
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ResumeProfile>(defaultProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getResumeProfile(user.uid).then((data) => {
      if (data) setProfile(data);
    });
  }, [user]);

  const handleBasicChange = (field: keyof ResumeProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  // 学歴・職歴の操作
  const addHistory = () => {
    setProfile((prev) => ({
      ...prev,
      careerHistory: [...prev.careerHistory, { year: "", month: "", content: "" }],
    }));
  };
  const updateHistory = (i: number, field: keyof CareerHistoryEntry, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.careerHistory];
      updated[i] = { ...updated[i], [field]: value };
      return { ...prev, careerHistory: updated };
    });
  };
  const removeHistory = (i: number) => {
    setProfile((prev) => ({
      ...prev,
      careerHistory: prev.careerHistory.filter((_, idx) => idx !== i),
    }));
  };

  // 資格・免許の操作
  const addQualification = () => {
    setProfile((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, { year: "", month: "", name: "" }],
    }));
  };
  const updateQualification = (i: number, field: keyof QualificationEntry, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.qualifications];
      updated[i] = { ...updated[i], [field]: value };
      return { ...prev, qualifications: updated };
    });
  };
  const removeQualification = (i: number) => {
    setProfile((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, idx) => idx !== i),
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await saveResumeProfile(user.uid, profile);
      setSavedMsg("保存しました ✓");
      setTimeout(() => setSavedMsg(""), 3000);
    } catch {
      setSavedMsg("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">読み込み中...</div>;

  const inputClass = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1";
  const sectionClass = "bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 space-y-4";

  return (
    <DashboardLayout>
      <div className="flex-1 bg-gray-50 dark:bg-gray-950 min-h-full">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            ← 戻る
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">📋 マイプロフィール（履歴書用）</h1>
        </div>
        <div className="flex items-center gap-3">
          {savedMsg && <span className="text-sm text-green-500 font-medium">{savedMsg}</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "💾 保存"}
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* 基本情報 */}
        <section className={sectionClass}>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">基本情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>氏名</label>
              <input className={inputClass} value={profile.name} onChange={e => handleBasicChange("name", e.target.value)} placeholder="畑 拓也" />
            </div>
            <div>
              <label className={labelClass}>ふりがな</label>
              <input className={inputClass} value={profile.furigana} onChange={e => handleBasicChange("furigana", e.target.value)} placeholder="はた たくや" />
            </div>
            <div>
              <label className={labelClass}>生年月日</label>
              <input className={inputClass} value={profile.birthday} onChange={e => handleBasicChange("birthday", e.target.value)} placeholder="1975年4月15日" />
            </div>
            <div>
              <label className={labelClass}>性別</label>
              <select className={inputClass} value={profile.gender} onChange={e => handleBasicChange("gender", e.target.value)}>
                <option value="">未記入</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>郵便番号</label>
              <input className={inputClass} value={profile.postalCode} onChange={e => handleBasicChange("postalCode", e.target.value)} placeholder="123-4567" />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>現住所（都道府県から）</label>
              <input className={inputClass} value={profile.address} onChange={e => handleBasicChange("address", e.target.value)} placeholder="大阪府大阪市〇〇区〇〇町1-2-3" />
            </div>
            <div>
              <label className={labelClass}>電話番号</label>
              <input className={inputClass} value={profile.phone} onChange={e => handleBasicChange("phone", e.target.value)} placeholder="090-1234-5678" />
            </div>
            <div>
              <label className={labelClass}>メールアドレス</label>
              <input className={inputClass} value={profile.email} onChange={e => handleBasicChange("email", e.target.value)} placeholder="example@email.com" />
            </div>
          </div>
        </section>

        {/* 学歴・職歴 */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">学歴・職歴</h2>
            <button onClick={addHistory} className="text-sm px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors font-medium">
              ＋ 追加
            </button>
          </div>
          <p className="text-xs text-gray-400">時系列順（古い順）に入力してください。「学歴」「職歴」の区切り行も追加できます。</p>
          {profile.careerHistory.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              まだ入力がありません。「＋ 追加」から始めてください。
            </div>
          )}
          <div className="space-y-2">
            {profile.careerHistory.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.year}
                  onChange={e => updateHistory(i, "year", e.target.value)}
                  placeholder="年"
                />
                <input
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-12 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.month}
                  onChange={e => updateHistory(i, "month", e.target.value)}
                  placeholder="月"
                />
                <input
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.content}
                  onChange={e => updateHistory(i, "content", e.target.value)}
                  placeholder="株式会社ローソン入社 / 学歴 / 職歴 ..."
                />
                <button onClick={() => removeHistory(i)} className="text-red-400 hover:text-red-600 text-lg px-1" title="削除">🗑️</button>
              </div>
            ))}
          </div>
        </section>

        {/* 免許・資格 */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">免許・資格</h2>
            <button onClick={addQualification} className="text-sm px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors font-medium">
              ＋ 追加
            </button>
          </div>
          {profile.qualifications.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              まだ入力がありません。「＋ 追加」から始めてください。
            </div>
          )}
          <div className="space-y-2">
            {profile.qualifications.map((entry, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.year}
                  onChange={e => updateQualification(i, "year", e.target.value)}
                  placeholder="年"
                />
                <input
                  className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-12 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.month}
                  onChange={e => updateQualification(i, "month", e.target.value)}
                  placeholder="月"
                />
                <input
                  className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={entry.name}
                  onChange={e => updateQualification(i, "name", e.target.value)}
                  placeholder="普通自動車免許取得"
                />
                <button onClick={() => removeQualification(i)} className="text-red-400 hover:text-red-600 text-lg px-1" title="削除">🗑️</button>
              </div>
            ))}
          </div>
        </section>

        {/* 本人希望 */}
        <section className={sectionClass}>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">本人希望記入欄</h2>
          <p className="text-xs text-gray-400">給料・職種・勤務時間・勤務地などの希望を記入してください。</p>
          <textarea
            className={`${inputClass} h-24 resize-none`}
            value={profile.wishes}
            onChange={e => handleBasicChange("wishes", e.target.value)}
            placeholder="現在の職種・給与を考慮の上、ご検討ください。通勤可能な範囲を希望します。"
          />
        </section>

        {/* 自己PR */}
        <section className={sectionClass}>
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">自己PR</h2>
          <p className="text-xs text-gray-400">あなたの強みや経歴の補足などを自由に記入してください。</p>
          <textarea
            className={`${inputClass} h-32 resize-none`}
            value={profile.selfPR}
            onChange={e => handleBasicChange("selfPR", e.target.value)}
            placeholder="私の強みは、複数のプロジェクトを並行して推進する管理能力です。..."
          />
        </section>

        {/* 保存ボタン（下部） */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 text-white rounded-full text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            {isSaving ? "保存中..." : "💾 プロフィールを保存"}
          </button>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}
