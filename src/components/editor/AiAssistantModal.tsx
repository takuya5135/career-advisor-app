import React, { useState, useEffect } from 'react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (suggestion: string) => void;
  documentType: string;
  content: string;
  selectedText?: string;
  careerData: any;
  resumeProfile: any;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onApply,
  documentType,
  content,
  selectedText,
  careerData,
  resumeProfile,
}) => {
  const [instruction, setInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSuggestion(null);
      setError(null);
      setInstruction('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/document/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType,
          content,
          careerData,
          resumeProfile,
          instruction,
          selectedText,
        }),
      });

      const data = await res.json();
      if (data.suggestion) {
        setSuggestion(data.suggestion);
      } else {
        setError(data.error || "提案の生成に失敗しました。");
      }
    } catch (e) {
      setError("通信エラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="flex items-center gap-2">
            <span className="text-xl">🪄</span>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100">AI編集アシスト</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selected Context */}
          {selectedText && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">選択中のテキスト</label>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg text-sm italic text-zinc-600 dark:text-zinc-300 line-clamp-3">
                "{selectedText}"
              </div>
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">AIへの指示</label>
            <textarea
              autoFocus
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="例: 「この部分をより強調して」「実績を具体的にして」「全体を情熱的なトーンに書き換えて」など"
              className="w-full h-24 p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm resize-none"
            />
          </div>

          {/* Suggestion Area */}
          {suggestion && (
            <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-300">
              <label className="text-xs font-bold text-indigo-500 uppercase tracking-wider">AIの提案</label>
              <div className="p-4 bg-white dark:bg-zinc-950 border border-indigo-200 dark:border-indigo-500/30 rounded-xl shadow-inner text-sm leading-relaxed prose dark:prose-invert prose-sm max-w-none">
                {suggestion.split('\n').map((line, i) => <p key={i}>{line}</p>)}
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            キャンセル
          </button>
          
          {suggestion ? (
            <button
              onClick={() => onApply(suggestion)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all"
            >
              エディターに反映する
            </button>
          ) : (
            <button
              disabled={isGenerating || !instruction.trim()}
              onClick={handleGenerate}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white rounded-full text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> 生成中...</>
              ) : (
                <><span className="text-base">✨</span> 提案を生成</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
