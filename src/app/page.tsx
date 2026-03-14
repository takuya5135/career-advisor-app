"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCareerData, CareerData } from "@/lib/firebase/firestore";
import PDFPreviewModal from "@/components/pdf/PDFPreviewModal";

// キャリアデータから各スコアを計算するヘルパー
function calcProgress(data: CareerData | null) {
  if (!data) return { resume: 0, workHistory: 0, interview: 0, overall: 0 };

  // 履歴書スコア（スキル + 学歴）
  const skillScore = Math.min((data.skills?.length ?? 0) * 20, 100);
  const eduScore = Math.min((data.education?.length ?? 0) * 50, 100);
  const resume = Math.round((skillScore + eduScore) / 2);

  // 職務経歴書スコア（経験 + 強み）
  const expScore = Math.min((data.experience?.length ?? 0) * 25, 100);
  const strScore = Math.min((data.strengths?.length ?? 0) * 25, 100);
  const workHistory = Math.round((expScore + strScore) / 2);

  // 面接スコア（目標＝想定質問）
  const interview = Math.min((data.goals?.length ?? 0) * 20, 100);

  const overall = Math.round((resume + workHistory + interview) / 3);

  return { resume, workHistory, interview, overall };
}

// 不足している項目を分析して改善カードのデータを返す
function buildSuggestions(data: CareerData | null) {
  if (!data) return [];
  const suggestions: { icon: string; title: string; desc: string; href: string }[] = [];

  if (!data.skills || data.skills.length === 0)
    suggestions.push({ icon: "🛠️", title: "スキルを追加しましょう", desc: "AIチャットで「私のスキルは〇〇と〇〇です」と伝えてください。", href: "/chat" });
  else if (data.skills.length < 3)
    suggestions.push({ icon: "🛠️", title: "スキルをもっと詳しく", desc: `現在${data.skills.length}個のスキルが登録されています。具体的なツールや言語も追加しましょう。`, href: "/chat" });

  if (!data.experience || data.experience.length === 0)
    suggestions.push({ icon: "💼", title: "職務経歴を登録しましょう", desc: "これまでの職歴・担当プロジェクトをAIに話してください。", href: "/chat" });
  else if (data.experience.length < 2)
    suggestions.push({ icon: "💼", title: "経歴に具体的な実績を", desc: "「〇〇プロジェクトで〇〇を達成した」という数値・成果の記述が効果的です。", href: "/chat" });

  if (!data.strengths || data.strengths.length === 0)
    suggestions.push({ icon: "✨", title: "自己PRを作りましょう", desc: "あなたならではの強みをAIと一緒に言語化しましょう。", href: "/chat" });

  if (!data.goals || data.goals.length === 0)
    suggestions.push({ icon: "🎯", title: "面接の想定Q&Aを準備しましょう", desc: "模擬面接モードでキャリア目標について答える練習をしましょう。", href: "/chat" });

  if (!data.education || data.education.length === 0)
    suggestions.push({ icon: "🎓", title: "学歴・資格を追加しましょう", desc: "学歴や取得した資格をAIに教えてください。", href: "/chat" });

  return suggestions;
}

// プログレスバーコンポーネント
function ProgressBar({ value, color = "bg-black dark:bg-white" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-700 ease-out ${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      getCareerData(user.uid).then((data) => {
        setCareerData(data);
        setIsLoading(false);
      });
    } else if (!loading) {
      setIsLoading(false);
    }
  }, [user, loading]);

  // 認証状態が確定するまでローディング表示（チラつき防止）
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  // ログインしていない場合はLPを表示
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black font-sans">
        {/* ヘッダー */}
        <header className="flex h-16 w-full items-center justify-between px-6 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800">
          <div className="text-xl font-bold tracking-tight">CareerAdvisor</div>
          <div className="flex gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-zinc-600 dark:hover:text-zinc-400 flex items-center">
              ログイン
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-black dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-black hover:opacity-80 transition-opacity"
            >
              無料で始める
            </Link>
          </div>
        </header>

        {/* メインヒーロー */}
        <main className="flex flex-1 flex-col items-center justify-center text-center px-4 py-24">
          <div className="max-w-3xl space-y-8">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              あなたのキャリアを、<br />
              <span className="text-zinc-400">AIと共に</span> アップグレード。
            </h1>
            <p className="mx-auto max-w-xl text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed">
              職務経歴書の作成から模擬面接まで。AIがあなた専用のアドバイザーとなり、理想のキャリア形成を24時間サポートします。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link
                href="/signup"
                className="h-14 px-10 flex items-center justify-center rounded-full bg-black dark:bg-zinc-50 text-white dark:text-black font-semibold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                今すぐ試してみる
              </Link>
              <button className="h-14 px-10 flex items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium text-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                詳細を見る
              </button>
            </div>
          </div>
        </main>

        <footer className="py-8 px-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-500">© 2024 career-advisor-app. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  const progress = calcProgress(careerData);
  const suggestions = buildSuggestions(careerData);
  const hasData = careerData !== null;

  // ログイン済みの場合はダッシュボードを表示
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black font-sans">
      {/* サイドバー */}
      <aside className="w-64 hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-6">
          <div className="text-xl font-bold tracking-tight">CareerAdvisor</div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className="flex items-center px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-medium">
            ダッシュボード
          </Link>
          <Link href="/chat" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            AIチャット
          </Link>
          <Link href="/notes" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            マイノート
          </Link>
          <Link href="/companies" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            志望企業
          </Link>
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            アカウント
          </div>
          <div className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate">
            {user.email}
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-lg font-semibold">ダッシュボード</h2>
          <Link href="/chat" className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-medium hover:opacity-80 transition-opacity">
            ＋ AIに話す
          </Link>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">

          {/* 全体スコアカード */}
          <section className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3" />
              </div>
            ) : hasData ? (
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* 円形スコア風 */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-28 h-28 rounded-full border-4 border-black dark:border-white">
                  <span className="text-3xl font-bold">{progress.overall}</span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold">キャリアプロフィール 完成度</h3>
                  <p className="text-zinc-500 text-sm">
                    AIとの会話が増えるほど、あなたの書類が充実していきます。
                  </p>
                  <ProgressBar value={progress.overall} />
                  <p className="text-xs text-zinc-400">
                    最終更新: {careerData?.lastUpdated ? new Date(careerData.lastUpdated).toLocaleString("ja-JP") : "—"}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-2xl font-bold mb-3">ようこそ、アドバイザーへ</h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  まだキャリアデータが登録されていません。AIチャットであなたの経歴を話すと、ここに自動で反映されます。
                </p>
                <Link
                  href="/chat"
                  className="inline-block px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-80 transition-opacity"
                >
                  AIチャットをはじめる →
                </Link>
              </div>
            )}
          </section>

          {/* 3カテゴリ 進捗カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                label: "履歴書", icon: "📄",
                value: progress.resume,
                detail: `スキル: ${careerData?.skills?.length ?? 0}件 / 学歴: ${careerData?.education?.length ?? 0}件`,
                color: "bg-blue-500"
              },
              {
                label: "職務経歴書", icon: "💼",
                value: progress.workHistory,
                detail: `経験: ${careerData?.experience?.length ?? 0}件 / 強み: ${careerData?.strengths?.length ?? 0}件`,
                color: "bg-purple-500"
              },
              {
                label: "面接対策", icon: "🎤",
                value: progress.interview,
                detail: `キャリア目標: ${careerData?.goals?.length ?? 0}件`,
                color: "bg-green-500"
              },
            ].map((card) => (
              <div key={card.label} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{card.icon}</span>
                    <span className="font-semibold">{card.label}</span>
                  </div>
                  <span className="text-2xl font-bold">{card.value}<span className="text-sm font-normal text-zinc-400">%</span></span>
                </div>
                <ProgressBar value={card.value} color={card.color} />
                <p className="text-xs text-zinc-500 flex-1">{card.detail}</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  disabled={!hasData}
                  className="w-full py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  プレビューを表示
                </button>
              </div>
            ))}
          </div>

          {/* 改善カード */}
          {suggestions.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-4 text-zinc-700 dark:text-zinc-300">
                🔍 ブラッシュアップのヒント
              </h3>
              {/* AI企業推薦 */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl shadow-indigo-500/20 mb-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-4 max-w-md">
                    <div className="inline-flex px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase">AI Recommendation</div>
                    <h3 className="text-2xl font-bold leading-tight">あなたに最適な企業をリサーチします</h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      現在のキャリア、スキル、目標に基づいて、狙い目の業界や具体的な企業名をAIがアドバイスします。
                    </p>
                    <Link
                      href="/chat?mode=consult&q=私におすすめの業界や具体的な企業名をアドバイスしてください"
                      className="inline-flex items-center px-6 py-3 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-zinc-100 transition-colors shadow-lg shadow-black/5"
                    >
                      AIに相談する
                    </Link>
                  </div>
                  <div className="hidden sm:block text-6xl">🏢</div>
                </div>
              </div>
              {/* ブラッシュアップのヒント */}
              <div className="space-y-3">
                {suggestions.map((s, i) => (
                  <Link
                    key={i}
                    href={s.href}
                    className="flex items-start gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-black dark:hover:border-white hover:shadow-md transition-all group"
                  >
                    <span className="text-2xl flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm group-hover:text-black dark:group-hover:text-white transition-colors">{s.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{s.desc}</p>
                    </div>
                    <span className="text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* データが揃っている場合のCTA */}
          {hasData && suggestions.length === 0 && (
            <section className="bg-gradient-to-br from-zinc-900 to-zinc-700 dark:from-zinc-100 dark:to-zinc-300 rounded-3xl p-8 text-white dark:text-black text-center">
              <p className="text-3xl mb-2">🎉</p>
              <h3 className="text-xl font-bold mb-2">プロフィールが完成しました！</h3>
              <p className="text-zinc-300 dark:text-zinc-700 text-sm mb-6">マイノートからPDFを書き出して、応募に使いましょう。</p>
              <Link href="/notes" className="inline-block px-6 py-3 bg-white dark:bg-black text-black dark:text-white rounded-full font-medium hover:opacity-80 transition-opacity">
                PDFを書き出す →
              </Link>
            </section>
          )}

        </div>
      </main>

      {/* プレビューモーダル */}
      {careerData && (
        <PDFPreviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={careerData}
          userEmail={user.email || ""}
        />
      )}
    </div>
  );
}
