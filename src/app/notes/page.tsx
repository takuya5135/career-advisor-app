"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getCareerData, CareerData, getChatSessions, updateCareerData } from "@/lib/firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

// --- EditableList コンポーネント ---
function EditableList(props: {
  title: string;
  icon: string;
  iconBgColor: string;
  iconTextColor: string;
  items: string[];
  onSave: (newItems: string[]) => void;
}) {
  const [items, setItems] = useState<string[]>(props.items || []);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // CareerData（親）が更新されたらローカルステートを同期
  useEffect(() => { setItems(props.items || []); }, [props.items]);

  const saveToParent = (newArr: string[]) => {
    setItems(newArr);
    props.onSave(newArr);
  };

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingValue(items[idx]);
  };

  const handleSaveEdit = (idx: number) => {
    const newArr = [...items];
    if (editingValue.trim() === "") {
      newArr.splice(idx, 1); // 空なら削除として扱う
    } else {
      newArr[idx] = editingValue;
    }
    setEditingIdx(null);
    saveToParent(newArr);
  };

  const handleDelete = (idx: number) => {
    if (!confirm("本当に削除しますか？")) return;
    const newArr = [...items];
    newArr.splice(idx, 1);
    saveToParent(newArr);
  };

  const handleAdd = () => {
    const newArr = [...items, "新しい項目"];
    saveToParent(newArr);
    setEditingIdx(newArr.length - 1);
    setEditingValue("新しい項目");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${props.iconBgColor} flex items-center justify-center ${props.iconTextColor}`}>{props.icon}</div>
          <h3 className="text-lg font-bold">{props.title}</h3>
        </div>
        <button onClick={handleAdd} className="text-xs font-bold px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black rounded-full hover:opacity-80 transition-opacity shadow-sm">
          + 追加する
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {items.map((item, i) => (
          <div key={i} className={`p-4 bg-white dark:bg-zinc-900 rounded-2xl border ${editingIdx === i ? 'border-indigo-500 shadow-md ring-2 ring-indigo-500/20' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'} group relative transition-all`}>
            {editingIdx === i ? (
              <div className="space-y-3">
                <textarea 
                  value={editingValue} 
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="w-full text-sm bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg outline-none resize-y min-h-[100px] border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingIdx(null)} className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">キャンセル</button>
                  <button onClick={() => handleSaveEdit(i)} className="px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-sm transition-colors">保存</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start gap-4">
                <p className="whitespace-pre-wrap flex-1 text-sm leading-relaxed">{item}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mt-1 -mr-1">
                  <button onClick={() => handleEdit(i)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-indigo-500 transition-colors" title="編集">✏️</button>
                  <button onClick={() => handleDelete(i)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-zinc-400 hover:text-red-500 transition-colors" title="削除">🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-zinc-500 text-sm italic p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">データがまだありません。「+ 追加する」ボタンから手動で入力できます。</p>
        )}
      </div>
    </section>
  );
}


export default function NotesPage() {
  const { user, loading, logout } = useAuth();
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');
  const [PDFComponents, setPDFComponents] = useState<{
    PDFDownloadLink: any;
    ResumeDocument: any;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    // クライアントサイドでのみPDF関連ライブラリをロード
    const loadPDF = async () => {
      try {
        const [{ PDFDownloadLink }, { ResumeDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
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

  const handleUpdateSection = async (key: keyof CareerData, newItems: string[]) => {
    if (!user) return;
    try {
      await updateCareerData(user.uid, { [key]: newItems });
      setCareerData((prev) => prev ? { ...prev, [key]: newItems } : null);
    } catch (e) {
      console.error("Failed to update", e);
      alert("データの保存に失敗しました。");
    }
  };

  const analyzeFromSessions = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    setAnalyzeMsg('');
    try {
      const sessions = await getChatSessions(user.uid);
      if (sessions.length === 0) {
        setAnalyzeMsg('セッションデータが見つかりませんでした。まずAIチャットで経歴を話してください。');
        return;
      }
      // 全セッションのメッセージを結合
      const allMessages = sessions
        .flatMap((s) => s.messages)
        .map((m) => ({ role: m.role, content: m.content }));
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMessages }),
      });
      if (!response.ok) throw new Error('Extraction API failed');
      const careerData = await response.json();
      if (Object.values(careerData).some((v: any) => v && v.length > 0)) {
        await updateCareerData(user.uid, careerData);
        await fetchNotes();
        setAnalyzeMsg(`✅ 分析完了！${sessions.length}件のセッションからデータを更新しました。`);
      } else {
        setAnalyzeMsg('キャリア情報を抽出できませんでした。チャットでもっと詳しく話してみてください。');
      }
    } catch (e) {
      setAnalyzeMsg('分析中にエラーが発生しました。');
    } finally {
      setIsAnalyzing(false);
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
          <div className="flex items-center gap-3">
            {/* 過去セッションから一括でキャリアデータを抽出するボタン */}
            <button
              onClick={analyzeFromSessions}
              disabled={isAnalyzing}
              title="Firestoreに記録されたセッションを分析してキャリア情報を更新します"
              className="px-4 py-2 text-sm font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {isAnalyzing ? "分析中..." : "🔍 セッションから分析"}
            </button>
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
        {/* 分析結果メッセージ */}
        {analyzeMsg && (
          <div className="mx-8 mt-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-2xl text-sm">
            {analyzeMsg}
          </div>
        )}

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
              {/* 編集可能なリスト UI */}
              <EditableList 
                title="テクニカルスキル・資格" 
                icon="🛠️" iconBgColor="bg-blue-100 dark:bg-blue-900/30" iconTextColor="text-blue-600"
                items={careerData.skills || []} 
                onSave={(newItems) => handleUpdateSection('skills', newItems)} 
              />
              <EditableList 
                title="職務経歴" 
                icon="💼" iconBgColor="bg-purple-100 dark:bg-purple-900/30" iconTextColor="text-purple-600"
                items={careerData.experience || []} 
                onSave={(newItems) => handleUpdateSection('experience', newItems)} 
              />
              <EditableList 
                title="自己PR / 強み" 
                icon="✨" iconBgColor="bg-green-100 dark:bg-green-900/30" iconTextColor="text-green-600"
                items={careerData.strengths || []} 
                onSave={(newItems) => handleUpdateSection('strengths', newItems)} 
              />
              <EditableList 
                title="今後の展望 / キャリア目標" 
                icon="🎯" iconBgColor="bg-rose-100 dark:bg-rose-900/30" iconTextColor="text-rose-600"
                items={careerData.goals || []} 
                onSave={(newItems) => handleUpdateSection('goals', newItems)} 
              />
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
