"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import { getDocuments, UserDocument, saveDocument, deleteDocument } from "@/lib/firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DocumentsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      getDocuments(user.uid).then(setDocuments);
    }
  }, [user, loading, router]);

  const handleCreateNew = async (type: UserDocument["type"], defaultTitle: string) => {
    if (!user) return;
    setIsCreating(true);
    try {
      const newDoc = await saveDocument(user.uid, {
        title: defaultTitle,
        type,
        content: `# ${defaultTitle}\n\nここから書き始めましょう...`,
      });
      router.push(`/documents/${newDoc.id}`);
    } catch (e) {
      console.error(e);
      alert("ドキュメントの作成に失敗しました");
      setIsCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    if (!confirm("この書類を削除してもよろしいですか？この操作は取り消せません。")) return;

    try {
      await deleteDocument(user.uid, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    }
  };

  if (loading || !user) return null;

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black overflow-hidden font-sans">
      {/* 共通サイドバー */}
      <aside className="w-64 hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="p-6">
          <Link href="/" className="text-xl font-bold tracking-tight">CareerAdvisor</Link>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <Link href="/" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">ダッシュボード</Link>
          <Link href="/chat" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">AIチャット</Link>
          <Link href="/notes" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">マイノート</Link>
          <div className="flex items-center px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-medium">書類作成</div>
          <Link href="/profile" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">📋 マイプロフィール</Link>
          <Link href="/companies" className="flex items-center px-4 py-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">志望企業</Link>
        </nav>
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">アカウント</div>
          <div className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 truncate">{user.email}</div>
          <button onClick={() => logout()} className="w-full flex items-center px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">ログアウト</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-y-auto">
        <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold">書類作成（AI協働エディター）</h2>
        </header>

        <div className="p-8 max-w-5xl mx-auto w-full space-y-12">
          {/* 新規作成アクション */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold">新しく書類を作成する</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button 
                disabled={isCreating}
                onClick={() => handleCreateNew("resume", "職務経歴書_新規")}
                className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex flex-col items-start gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-600 text-xl group-hover:scale-110 transition-transform">💼</div>
                <div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-200">職務経歴書</h4>
                  <p className="text-sm text-indigo-700/70 dark:text-indigo-300 m-0">これまでの経験をまとめた詳細な書類</p>
                </div>
              </button>
              
              <button 
                disabled={isCreating}
                onClick={() => handleCreateNew("cv", "履歴書_新規")}
                className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 hover:from-blue-100 hover:to-cyan-100 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex flex-col items-start gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 text-xl group-hover:scale-110 transition-transform">📄</div>
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">履歴書 (JIS)</h4>
                  <p className="text-sm text-blue-700/70 dark:text-blue-300 m-0">基本的な学歴や資格のサマリー</p>
                </div>
              </button>

              <button 
                disabled={isCreating}
                onClick={() => handleCreateNew("pr", "自己PR_新規")}
                className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 hover:from-orange-100 hover:to-red-100 border border-orange-100 dark:border-orange-900/30 rounded-2xl flex flex-col items-start gap-4 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-600 text-xl group-hover:scale-110 transition-transform">✨</div>
                <div>
                  <h4 className="font-bold text-orange-900 dark:text-orange-200">自己PR・志望動機</h4>
                  <p className="text-sm text-orange-700/70 dark:text-orange-300 m-0">企業ごとにカスタマイズした熱意の伝達</p>
                </div>
              </button>
            </div>
          </section>

          {/* 保存済み書類リスト */}
          <section className="space-y-4">
            <h3 className="text-lg font-bold">保存済みの書類</h3>
            {documents.length === 0 ? (
              <div className="text-center p-12 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <span className="text-2xl mb-2 block">📂</span>
                <p className="text-zinc-500 text-sm">作成された書類はまだありません。<br />上のボタンから新規作成して、AIと一緒に書き始めましょう。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {documents.map(doc => (
                  <Link 
                    key={doc.id}
                    href={`/documents/${doc.id}`}
                    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-black dark:hover:border-white hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                        {doc.type === "resume" ? "💼" : doc.type === "cv" ? "📄" : "✨"}
                      </div>
                      <div>
                        <h4 className="font-bold group-hover:underline text-base">{doc.title}</h4>
                        <p className="text-xs text-zinc-500 mt-1">最終更新: {new Date(doc.updatedAt).toLocaleString("ja-JP")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 group-hover:text-indigo-500 transition-colors text-sm font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-4 py-2 rounded-full">エディターを開く →</span>
                      <button
                        onClick={(e) => handleDelete(e, doc.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
