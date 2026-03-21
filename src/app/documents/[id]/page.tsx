"use client";

import { useAuth } from "@/lib/contexts/auth-context";
import { getDocument, saveDocument, UserDocument, getCareerData, CareerData, getResumeProfile, ResumeProfile } from "@/lib/firebase/firestore";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MarkdownPreview from "@/components/pdf/MarkdownPreview";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { EditorPDFDocument } from "@/components/pdf/EditorPDFDocument";

// デバウンス用ユーティリティ
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function DocumentEditorPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const docId = params?.id as string;

  const [document, setDocument] = useState<UserDocument | null>(null);
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  // 遅延保存用の値（1秒間入力が止まったら更新）
  const debouncedContent = useDebounce(content, 1000);
  const debouncedTitle = useDebounce(title, 1000);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && docId) {
      const loadData = async () => {
        const [docData, cData, rProfile] = await Promise.all([
          getDocument(user.uid, docId),
          getCareerData(user.uid),
          getResumeProfile(user.uid)
        ]);

        if (docData) {
          setDocument(docData);
          setTitle(docData.title);
          setContent(docData.content);
        } else {
          alert("ドキュメントが見つかりません");
          router.push("/documents");
        }
        setCareerData(cData);
        setResumeProfile(rProfile);
        setInitialLoad(false);
      };
      loadData();
    }
  }, [user, loading, docId, router]);

  // 履歴書(cv)タイプ専用のPDFダウンロード処理
  const handleResumePdfDownload = async () => {
    if (!document) return;
    setIsPdfGenerating(true);
    try {
      const res = await fetch("/api/document/resume-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerData, content, resumeProfile }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${(title || 'rirekisho').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("PDF生成に失敗しました");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const handleAiAssist = async () => {
    if (!user || !document) return;
    setIsAiGenerating(true);
    try {
      const res = await fetch("/api/document/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: document.type,
          content: content,
          careerData: careerData,
          resumeProfile: resumeProfile,
          instruction: "現在の内容を元に、より具体的でプロフェッショナルな表現に続きを執筆してください。"
        })
      });

      const data = await res.json();
      if (data.suggestion) {
        if (confirm("AIが新しい内容を提案しました。エディターに反映しますか？")) {
          setContent(data.suggestion);
        }
      } else {
        alert("AIからの提案が得られませんでした。");
      }
    } catch (e) {
      console.error(e);
      alert("AIアシスト中にエラーが発生しました。");
    } finally {
      setIsAiGenerating(false);
    }
  };

  // オートセーブ処理
  useEffect(() => {
    if (initialLoad || !user || !document) return;
    
    // 値が変更されていない場合はスキップ
    if (debouncedTitle === document.title && debouncedContent === document.content) return;

    const performSave = async () => {
      setIsSaving(true);
      try {
        const updatedDoc = await saveDocument(user.uid, {
          ...document,
          title: debouncedTitle,
          content: debouncedContent,
        });
        setDocument(updatedDoc);
      } catch (error) {
        console.error("Auto-save failed", error);
      } finally {
        setTimeout(() => setIsSaving(false), 500); // 保存しました表示を少し残す
      }
    };

    performSave();
  }, [debouncedContent, debouncedTitle, user, document, initialLoad]);

  if (loading || initialLoad || !document) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
        <div className="animate-pulse flex flex-col items-center gap-4 text-zinc-400">
          <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
          <p>エディターを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black font-sans overflow-hidden">
      {/* エディターヘッダー */}
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-4 flex-1">
          <Link 
            href="/documents" 
            className="p-2 text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
            title="一覧へ戻る"
          >
            ←
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-indigo-500 w-full max-w-sm transition-shadow">
            <span className="text-xl">
              {document.type === "resume" ? "💼" : document.type === "cv" ? "📄" : "✨"}
            </span>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-base w-full py-1"
              placeholder="無題のドキュメント"
            />
          </div>
          {isSaving ? (
            <span className="text-xs text-zinc-400 flex items-center gap-1"><span className="w-2 h-2 bg-zinc-400 rounded-full animate-ping" /> 保存中...</span>
          ) : (
            <span className="text-xs text-zinc-400 flex items-center gap-1">✅ クラウドに保存済み</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            disabled={isAiGenerating}
            onClick={handleAiAssist}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
          >
            {isAiGenerating ? (
              <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> AI執筆中...</>
            ) : (
              "🪄 AIアシスト"
            )}
          </button>
          
          {/* 履歴書(cv)はサーバーサイドAPI経由、他はreact-pdf */}
          {document.type === 'cv' ? (
            <button
              onClick={handleResumePdfDownload}
              disabled={isPdfGenerating}
              className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:opacity-80 transition-opacity shadow-lg shadow-black/10 dark:shadow-white/5 disabled:opacity-50"
            >
              {isPdfGenerating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />
                  生成中...
                </span>
              ) : (
                "📄 PDFで書き出す"
              )}
            </button>
          ) : (
            isClient && (
              <PDFDownloadLink
                document={<EditorPDFDocument title={title} content={content || " "} type={document.type as any} personalData={careerData} resumeProfile={resumeProfile} />}
                fileName={`${(title || 'document').replace(/[\\/:*?"<>|]/g, '_')}.pdf`}
              >
                {({ loading: pdfLoading, error }) => {
                  if (error) {
                    console.error("PDF generation error:", error);
                    return <button className="px-5 py-2 bg-red-500 text-white rounded-full text-sm font-bold opacity-80 cursor-not-allowed">❌ PDFエラー</button>;
                  }
                  return (
                    <button disabled={pdfLoading} className="px-5 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full text-sm font-bold hover:opacity-80 transition-opacity shadow-lg shadow-black/10 dark:shadow-white/5 disabled:opacity-50">
                      {pdfLoading ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin" />準備中...</span> : "📄 PDFで書き出す"}
                    </button>
                  );
                }}
              </PDFDownloadLink>
            )
          )}
        </div>
      </header>

      {/* エディター本体 (2ペイン構成) */}
      <main className="flex-1 flex overflow-hidden">
        {/* 左ペイン: Markdownエディタ */}
        <section className="w-1/2 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 relative">
          <div className="absolute top-4 right-4 text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Markdown Editor</div>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full bg-transparent p-8 outline-none resize-none font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
            placeholder="# 職務経歴書&#13;&#10;&#13;&#10;ここにマークダウン形式で入力します..."
            spellCheck={false}
          />
        </section>

        {/* 右ペイン: リアルタイムプレビュー */}
        <section className="w-1/2 flex flex-col bg-zinc-50 dark:bg-black relative">
          <div className="absolute top-4 right-8 text-[10px] font-bold tracking-widest text-zinc-400 uppercase z-20 bg-zinc-50/80 dark:bg-black/80 px-2 py-1 rounded-md backdrop-blur-sm">Live Preview</div>
          <div className="flex-1 overflow-y-auto p-8 pt-12 custom-scrollbar">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 min-h-full transition-all">
              <MarkdownPreviewEditorAdapter content={content} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// 既存の MarkdownPreview は CareerData ベースの描画となっているため
// エディター側では react-markdown などでダイレクトに表示するためのアダプタコンポーネント
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MarkdownPreviewEditorAdapter({ content }: { content: string }) {
  return (
    <div className="p-8 prose dark:prose-invert prose-zinc max-w-none text-sm
      prose-h1:text-2xl prose-h1:border-b-2 prose-h1:border-black dark:prose-h1:border-white prose-h1:pb-2 prose-h1:mb-6
      prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-4 prose-h2:bg-zinc-100 dark:prose-h2:bg-zinc-800 prose-h2:px-3 prose-h2:py-1 prose-h2:border-l-4 prose-h2:border-black dark:prose-h2:border-white
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
      prose-ul:my-4 prose-li:my-1
      prose-p:leading-relaxed prose-p:my-3">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content || "*プレビューがここに表示されます*"}
      </ReactMarkdown>
    </div>
  );
}
