"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getCareerData, CareerData } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

export default function NotesPage() {
  const { user, loading, logout } = useAuth();
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [PDFComponents, setPDFComponents] = useState<{
    PDFDownloadLink: any;
    ResumeDocument: any;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのみPDF関連ライブラリをロード
    const loadPDF = async () => {
      try {
        const libName = ["@", "react-pdf", "/", "renderer"].join("");
        const [{ PDFDownloadLink }, { ResumeDocument }] = await Promise.all([
          import(libName),
          import("@/components/pdf/ResumeDocument")
        ]);
        setPDFComponents({ PDFDownloadLink, ResumeDocument });
      } catch (err) {
        console.error("PDF component load error:", err);
      }
    };

    if (user) {
      loadPDF();
    }
  }, [user]);

  const fetchNotes = async () => {
    if (user) {
      setIsRefreshing(true);
      const data = await getCareerData(user.uid);
      setCareerData(data);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchNotes();
    }
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black overflow-hidden font-sans">
      {/* サイドバー */}
      <aside className="w-64 hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold tracking-tight">CareerAdvisor</Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            ダッシュボード
          </Link>
          <Link href="/chat" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
            AIチャット
          </Link>
          <div className="flex items-center px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-medium">
            マイノート
          </div>
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            アカウント
          </div>
          <div className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate">
            {user.email}
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインエリア */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-y-auto">
        <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold">マイノート</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchNotes}
              disabled={isRefreshing}
              className="px-4 py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-900 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {isRefreshing ? "更新中..." : "データを更新"}
            </button>
            {careerData && PDFComponents && (
              <PDFComponents.PDFDownloadLink
                document={<PDFComponents.ResumeDocument data={careerData} userEmail={user.email || ""} />}
                fileName="職務経歴書.pdf"
                className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold hover:opacity-80 transition-opacity text-sm shadow-lg shadow-black/10 dark:shadow-white/5"
              >
                {/* @ts-ignore */}
                {({ loading }) => (loading ? "準備中..." : "PDFを書き出す")}
              </PDFComponents.PDFDownloadLink>
            )}
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full space-y-12">
          {!careerData ? (
            <div className="text-center py-20 space-y-4">
              <div className="text-4xl">📝</div>
              <h3 className="text-xl font-bold">まだデータがありません</h3>
              <p className="text-zinc-500">AIチャットであなたの経歴を話すと、ここに自動でまとまります。</p>
              <Link href="/chat" className="inline-block mt-4 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium">
                チャットをはじめる
              </Link>
            </div>
          ) : (
            <>
              {/* スキル */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">🛠️</div>
                  <h3 className="text-lg font-bold">テクニカルスキル</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {careerData.skills?.map((item, i) => (
                    <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      {item}
                    </div>
                  ))}
                  {(!careerData.skills || careerData.skills.length === 0) && (
                    <p className="text-zinc-400 text-sm">データがまだありません。</p>
                  )}
                </div>
              </section>

              {/* 経歴 */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">💼</div>
                  <h3 className="text-lg font-bold">職務経歴</h3>
                </div>
                <div className="space-y-4">
                  {careerData.experience?.map((item, i) => (
                    <div key={i} className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      {item}
                    </div>
                  ))}
                  {(!careerData.experience || careerData.experience.length === 0) && (
                    <p className="text-zinc-400 text-sm">データがまだありません。</p>
                  )}
                </div>
              </section>

              {/* 強み */}
              <section className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">✨</div>
                  <h3 className="text-lg font-bold">自己PR / 強み</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {careerData.strengths?.map((item, i) => (
                    <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                      {item}
                    </div>
                  ))}
                  {(!careerData.strengths || careerData.strengths.length === 0) && (
                    <p className="text-zinc-400 text-sm">データがまだありません。</p>
                  )}
                </div>
              </section>
            </>
          )}

          <div className="mt-20 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <p className="text-zinc-400 text-sm">
              情報はAIチャットとの会話から自動で抽出されています。修正が必要な場合はチャットで伝えてください。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
