"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { Message } from "@/types/chat";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateCareerData, saveChatSession, getChatSessions, getCareerData, ChatMessage, CareerData, getResumeProfile, ResumeProfile } from "@/lib/firebase/firestore";
import PDFPreviewModal from "@/components/pdf/PDFPreviewModal";
import { useSearchParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

function ChatContent() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const initialSessionId = searchParams.get('sessionId') || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<'consult' | 'interview' | 'document_creation'>('consult');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string>(initialSessionId);

  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfile | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // URLパラメータからの初期メッセージ処理
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && messages.length === 0) {
      setInput(query);
    }
    const m = searchParams.get('mode');
    if (m === 'interview') setMode('interview');
    if (m === 'document') setMode('document_creation');
  }, [searchParams, messages.length]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // ページ読み込み時に過去セッションを読み込んでAIコンテキストを構築する
  useEffect(() => {
    if (!loading && user) {
      Promise.all([
        getChatSessions(user.uid).then((sessions) => {
          if (sessions.length > 0) {
            const currentSession = sessions.find(s => s.sessionId === sessionId);
            if (currentSession && messages.length === 0) {
              setMessages(currentSession.messages.map(m => ({ role: m.role, content: m.content })));
              if (currentSession.mode) {
                setMode(currentSession.mode as any);
              }
            }
          }
        }),
        getCareerData(user.uid).then((data) => {
          setCareerData(data);
        }),
        getResumeProfile(user.uid).then((data) => {
          setResumeProfile(data);
        })
      ]).finally(() => {
        setIsDataLoaded(true);
      });
    } else if (!loading) {
      setIsDataLoaded(true); // ユーザーがいない場合やロード完了時に空状態でロック解除
    }
  }, [user, loading, sessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping || !isDataLoaded) return;

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
          mode: mode,
          careerData: careerData, // 過去の生ログの代わりに、蒸留済みのキャリアデータを注入
          resumeProfile: resumeProfile, // 履歴書プロフィール（手動入力）も注入
          userName: resumeProfile?.name || careerData?.name || user?.displayName || "", // 名前の追加
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
        // 相談モードまたは書類作成モードの場合に、会話から情報を抽出する
        if ((mode === 'consult' || mode === 'document_creation') && assistantMessage.content) {
          try {
            const extractionResponse = await fetch("/api/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                messages: [...messages, userMessage, assistantMessage],
                existingData: careerData // 既存データを渡すことでMECEにマージ
              }),
            });

            if (extractionResponse.ok) {
              const data = await extractionResponse.json();
              console.log('Extracted career data:', data);
              // 抽出されたデータが空でなければ保存
              if (user && Object.values(data).some((v: any) => v && (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0))) {
                // AIがマージ済みなので mergeArrays: false (デフォルト) で上書き
                const updatedData = await updateCareerData(user.uid, data, false);
                setCareerData(updatedData); // stateを更新してプレビューに反映
                console.log('Career data saved to Firestore successfully!');
              } else {
                console.log('No career data extracted from this message.');
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

  const getPlaceholder = () => {
    switch (mode) {
      case 'consult': return "キャリアや転職について相談する...";
      case 'interview': return "面接官の質問に答える...";
      case 'document_creation': return "書類のアピールポイントについて話す...";
      default: return "AIにメッセージを送る...";
    }
  };

  const getGreetingTitle = () => {
    switch (mode) {
      case 'consult': return "どのような相談ですか？";
      case 'interview': return "模擬面接を開始しましょう";
      case 'document_creation': return "一緒に魅力的な書類を作りましょう";
      default: return "こんにちは";
    }
  };

  const getGreetingDesc = () => {
    switch (mode) {
      case 'consult': return "あなたのこれまでの経験や、これから目指したいキャリアについて教えてください。";
      case 'interview': return "希望する企業や職種を伝えていただければ、それに合わせた質問を行います。";
      case 'document_creation': return "一気に書く必要はありません。まずはあなたのこれまでの実績や強みから整理していきましょう。";
      default: return "";
    }
  };

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      {/* メインチャットエリア */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-black relative">
        {/* ヘッダー */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            ←
          </Link>
          <h2 className="text-lg font-bold">AIキャリア相談</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            📋 書類をプレビュー
          </button>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-full overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
            <button 
              onClick={() => {
                setMode('consult');
                setMessages([]);
                setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
              }}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${mode === 'consult' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}
            >
              相談
            </button>
            <button 
              onClick={() => {
                setMode('document_creation');
                setMessages([]);
                setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
              }}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${mode === 'document_creation' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}
            >
              書類作成
            </button>
            <button 
              onClick={() => {
                setMode('interview');
                setMessages([]);
                setSessionId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
              }}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${mode === 'interview' ? 'bg-white dark:bg-zinc-900 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}
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
              <div className="w-16 h-16 rounded-3xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-3xl">
                {mode === 'consult' ? '👋' : mode === 'interview' ? '🎤' : '📝'}
              </div>
              <div>
                <h3 className="text-xl font-bold">{getGreetingTitle()}</h3>
                <p className="text-zinc-500 max-w-sm mt-2">
                  {getGreetingDesc()}
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
              placeholder={getPlaceholder()}
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
    </DashboardLayout>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
