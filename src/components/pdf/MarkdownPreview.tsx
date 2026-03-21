"use client";

import { useState } from "react";
import { CareerData } from "@/lib/firebase/firestore";

interface MarkdownPreviewProps {
  data: CareerData;
}

type DocType = "all" | "resume" | "cv" | "pr" | "qa";

export default function MarkdownPreview({ data }: MarkdownPreviewProps) {
  const [activeTab, setActiveTab] = useState<DocType>("all");

  const generateMarkdown = (type: DocType) => {
    switch (type) {
      case "resume":
        return `# 履歴書\n\n氏名：${data.name || "未設定"}\n\n## スキル\n${data.skills?.join(", ") || "なし"}\n\n## 教育\n${data.education?.join("\n") || "なし"}`;
      case "cv":
        return `# 職務経歴書\n\n## 職務要約\n${data.experience?.join("\n\n") || "なし"}`;
      case "pr":
        return `# 自己PR\n\n## 私の強み\n${data.strengths?.join("\n") || "なし"}`;
      case "qa":
        return `# 質疑応答集\n\n（会話から抽出された想定質問と回答案がここに表示されます）`;
      default:
        return `# キャリアデータ全体\n\n## 基本情報\n- 名前: ${data.name || "未設定"}\n\n## スキル\n${data.skills?.map(s => `- ${s}`).join("\n") || "なし"}\n\n## 経験\n${data.experience?.map(e => `- ${e}`).join("\n") || "なし"}\n\n## 強み\n${data.strengths?.map(s => `- ${s}`).join("\n") || "なし"}`;
    }
  };

  const md = generateMarkdown(activeTab);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
        {[
          { id: "all", label: "全体" },
          { id: "resume", label: "履歴書" },
          { id: "cv", label: "職務経歴書" },
          { id: "pr", label: "自己PR" },
          { id: "qa", label: "QA" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as DocType)}
            className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 overflow-y-auto font-mono text-sm">
        <div className="whitespace-pre-wrap leading-relaxed dark:text-zinc-300">
          {md}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-zinc-400">※Markdown形式で表示しています。内容をコピーして利用できます。</p>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(md);
            alert("クリップボードにコピーしました");
          }}
          className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black text-xs font-bold rounded-lg hover:opacity-80 transition-opacity"
        >
          コピーする
        </button>
      </div>
    </div>
  );
}
