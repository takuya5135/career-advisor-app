"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { CareerData } from "@/lib/firebase/firestore";
import MarkdownPreview from "./MarkdownPreview";

// PDFコンテンツをクライアントサイドのみで動的ロード
const PDFPreviewContent = dynamic(() => import("./PDFPreviewContent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 font-medium animate-pulse">プレビューエンジンを起動中...</p>
    </div>
  ),
});

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CareerData;
  userEmail: string;
}

export default function PDFPreviewModal({ isOpen, onClose, data, userEmail }: PDFPreviewModalProps) {
  const [viewMode, setViewMode] = useState<"markdown" | "pdf">("markdown");
  const [displayData, setDisplayData] = useState<CareerData>(data);
  const [isGenerating, setIsGenerating] = useState(false);

  // モーダルが開くたびに、生のデータを初期値としてセットする
  useEffect(() => {
    if (isOpen) {
      setDisplayData(data);
    }
  }, [isOpen, data]);

  // ESCキーで閉じる
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/document/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 常に大元の「生データ(事実ベース)」を渡して清書させる
        body: JSON.stringify({ data })
      });
      if (!res.ok) throw new Error("Generation failed");
      const generated = await res.json();
      setDisplayData(generated);
    } catch (e) {
      console.error(e);
      alert("AI書類の生成に失敗しました。時間をおいて再試行してください。");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl h-[90vh] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="text-xl font-bold">書類センター</h3>
            <p className="text-sm text-zinc-500 mt-1">Markdownで内容を確認し、必要に応じてPDF化できます</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>✨ AIで清書する</>
              )}
            </button>

            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button 
                onClick={() => setViewMode("markdown")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "markdown" ? "bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white" : "text-zinc-500"}`}
              >
                Markdown
              </button>
              <button 
                onClick={() => setViewMode("pdf")}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "pdf" ? "bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white" : "text-zinc-500"}`}
              >
                PDFプレビュー
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-full transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* プレビューエリア */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 p-4 md:p-8 overflow-hidden relative">
          {viewMode === "markdown" ? (
            <MarkdownPreview data={displayData} />
          ) : (
            <PDFPreviewContent data={displayData} userEmail={userEmail} />
          )}
        </div>

        {/* フッター */}
        <div className="px-8 py-6 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex justify-end items-center gap-4">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
          >
            閉じる
          </button>
          {viewMode === "pdf" && (
            <p className="text-xs text-zinc-400 font-medium animate-pulse">※PDFの保存はプレビュー画面内のアイコンから行えます</p>
          )}
        </div>
      </div>
    </div>
  );
}
