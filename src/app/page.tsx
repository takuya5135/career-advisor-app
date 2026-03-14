"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

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
      <main className="flex-1 flex flex-col">
        <header className="h-16 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <h2 className="text-lg font-semibold">ダッシュボード</h2>
        </header>
        
        <div className="p-8 space-y-8">
          <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <h3 className="text-2xl font-bold mb-4">ようこそ、アドバイザーへ</h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              まだキャリアデータが登録されていないようです。AIチャットであなたのこれまでの経歴を教えてください。
            </p>
            <Link 
              href="/chat"
              className="inline-block mt-6 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:opacity-80 transition-opacity"
            >
              AIチャットをはじめる
            </Link>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="font-semibold mb-2">履歴書作成</h4>
              <p className="text-sm text-zinc-500">進捗: 0%</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="font-semibold mb-2">職務経歴書</h4>
              <p className="text-sm text-zinc-500">進捗: 0%</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <h4 className="font-semibold mb-2">面接対策</h4>
              <p className="text-sm text-zinc-500">準備完了: 0問</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
