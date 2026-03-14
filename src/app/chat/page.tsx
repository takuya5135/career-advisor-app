"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Message } from "@/types/chat";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCareerData, saveChatSession, ChatMessage } from "@/lib/firebase/firestore";

export default function ChatPage() {
  const { user, loading, logout } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<'consult' | 'interview'>('consult');
  const [isTyping, setIsTyping] = useState(false);
  // チャットセッションID（ページロード・モード切替ごとに生成）
  const [sessionId, setSessionId] = useState<string>(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          mode: mode
        }),
      });

      if (!response.ok) throw new Error("Failed to connect to AI");

      const reader = response.body?.getReader();
      const decoder = new TextEncoder();
      let assistantMessage = { role: "assistant" as const, content: "" };
      
      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = new TextDecoder().decode(value);
          assistantMessage.content += chunk;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { ...assistantMessage };
            return newMessages;
          });
        }

        // --- チャット履歴の保存 ---
        if (user && assistantMessage.content) {
          const allMessages = [...messages, userMessage, { role: "assistant" as const, content: assistantMessage.content }];
          const chatMessages: ChatMessage[] = allMessages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: Date.now(),
          }));
          saveChatSession(user.uid, sessionId, chatMessages, mode);
        }
        // ----------------------------

        // --- 自動データ抽出 & Firestore保存 ---
        // 相談モードの場合のみ、会話から情報を抽出する
        if (mode === 'consult' && assistantMessage.content) {
          try {
            const extractionResponse = await fetch("/api/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                messages: [...messages, userMessage, assistantMessage] 
              }),
            });

            if (extractionResponse.ok) {
              const careerData = await extractionResponse.json();
              // 抽出されたデータが空でなければ保存
              if (user && Object.values(careerData).some((v: any) => v && v.length > 0)) {
                await updateCareerData(user.uid, careerData);
              }
            }
          } catch (extractError) {
            console.error("Auto-extraction error:", extractError);
          }
        }
        // -------------------------------------
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "申し訳ありません。エラーが発生しました。時間を置いて再度お試しください。" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

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
          <div className="flex items-center px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-medium">
            AIチャット
          </div>
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
            onClick={() => logout()}
            className="w-full flex items-center px-4 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      {/* メインチャットエリア */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-black relative">
        {/* ヘッダー */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
              <h2 className="text-lg font-semibold hidden sm:block">AIアドバイザー</h2>
            </div>
            
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl">
              <button
                onClick={() => {
                  setMode('consult');
                  setMessages([]);
                  setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'consult' 
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                相談
              </button>
              <button
                onClick={() => {
                  setMode('interview');
                  setMessages([]);
                  setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'interview' 
                    ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" 
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                模擬面接
              </button>
            </div>
          </div>
        </header>

        {/* メッセージリスト */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-3xl">👋</div>
              <div>
                <h3 className="text-xl font-bold">どのような相談ですか？</h3>
                <p className="text-zinc-500 max-w-sm mt-2">
                  あなたのこれまでの経験や、これから目指したいキャリアについて教えてください。
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] md:max-w-[70%] px-6 py-4 rounded-3xl shadow-sm text-base leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-black text-white dark:bg-zinc-100 dark:text-black rounded-tr-none" 
                    : "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50 rounded-tl-none border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-zinc-100 dark:bg-zinc-900 px-6 py-4 rounded-3xl rounded-tl-none animate-pulse">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="p-4 md:p-8 border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-4 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              rows={1}
              placeholder="キャリアや転職について相談する..."
              style={{ minHeight: '56px', maxHeight: '200px' }}
              className="flex-1 px-6 py-4 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all placeholder:text-zinc-500 resize-none overflow-y-auto"
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="px-8 py-4 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-semibold hover:opacity-80 transition-opacity disabled:opacity-50 h-[56px]"
            >
              送信
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-400 mt-4">
            AIのアドバイスは必ずしも正確とは限りません。重要な決定を行う場合は専門家への相談も検討してください。
          </p>
        </div>
      </main>
    </div>
  );
}
