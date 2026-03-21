"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { getCompany, saveCompanyData, deleteCompany, CompanyData, getCareerData, CareerData } from "@/lib/firebase/firestore";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function CompanyDetailPage() {
  const { user, loading } = useAuth();
  const { id } = useParams();
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [careerData, setCareerData] = useState<CareerData | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'analysis' | 'strategy'>('info');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    if (user && id) {
      const [companyData, career] = await Promise.all([
        getCompany(user.uid, id as string),
        getCareerData(user.uid)
      ]);
      setCompany(companyData);
      setCareerData(career);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user && id) {
      fetchData();
    }
  }, [user, loading, id, router]);

  const handleUpdate = async (updates: Partial<CompanyData>) => {
    if (!user || !company) return;
    setIsSaving(true);
    try {
      const updated = await saveCompanyData(user.uid, { ...company, ...updates });
      setCompany(updated);
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!user || !company || !careerData) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/companies/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, careerData }),
      });
      if (!response.ok) throw new Error("Analysis failed");
      const analysis = await response.json();
      await handleUpdate({ matchingAnalysis: analysis });
      setActiveTab('analysis');
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateStrategy = async () => {
    if (!user || !company || !careerData) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/companies/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, careerData }),
      });
      if (!response.ok) throw new Error("Generation failed");
      const strategy = await response.json();
      await handleUpdate({ customDocuments: strategy });
    } catch (error) {
      console.error("Strategy generation error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !company || !confirm("この企業データを削除しますか？")) return;
    try {
      await deleteCompany(user.uid, company.id);
      router.push("/companies");
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading || !user || !company) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <DashboardLayout>
      {/* メインエリア */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-y-auto">
        <header className="px-8 pt-8 pb-4 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-black z-10">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/companies" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">←</Link>
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <div className="flex-1"></div>
            <button 
              onClick={handleDelete}
              className="text-sm text-red-500 hover:opacity-70"
            >
              削除
            </button>
          </div>

          <div className="flex gap-6 border-b border-zinc-100 dark:border-zinc-800">
            {[
              { id: 'info', label: '企業情報・メモ' },
              { id: 'analysis', label: '相性分析' },
              { id: 'strategy', label: '書類・面接対策' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-semibold transition-all relative ${
                  activeTab === tab.id ? 'text-black dark:text-white' : 'text-zinc-400'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white animate-in fade-in duration-300"></div>
                )}
              </button>
            ))}
          </div>
        </header>

        <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
          {activeTab === 'info' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">業界</label>
                  <input 
                    type="text" 
                    value={company.industry || ""}
                    onChange={(e) => handleUpdate({ industry: e.target.value })}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl outline-none"
                    placeholder="例: IT / 広告"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase">ステータス</label>
                  <select 
                    value={company.status}
                    onChange={(e) => handleUpdate({ status: e.target.value as any })}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl outline-none"
                  >
                    <option value="considering">検討中</option>
                    <option value="applied">応募済み</option>
                    <option value="interviewing">面接中</option>
                    <option value="offered">内定</option>
                    <option value="rejected">お見送り</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">求人内容・募集職種</label>
                <textarea 
                  value={company.jobDescription || ""}
                  onChange={(e) => handleUpdate({ jobDescription: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl outline-none resize-none"
                  placeholder="求人票のテキストを貼り付けてください"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">企業理念・活動内容</label>
                <textarea 
                  value={company.corporatePhilosophy || ""}
                  onChange={(e) => handleUpdate({ corporatePhilosophy: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl outline-none resize-none"
                  placeholder="企業HPの情報などを貼り付けてください"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase">面接のやり取り・メモ</label>
                <textarea 
                  value={company.interviewNotes || ""}
                  onChange={(e) => handleUpdate({ interviewNotes: e.target.value })}
                  rows={4}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl outline-none resize-none"
                  placeholder="面接で聞かれたこと、感じたことなど"
                />
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !company.jobDescription}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? "AI分析中..." : "🚀 AIで相性を分析する"}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {company.matchingAnalysis ? (
                <>
                  <div className="bg-zinc-900 text-white p-8 rounded-3xl flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold opacity-60">マッチングスコア</h3>
                      <div className="text-6xl font-black mt-2">{company.matchingAnalysis.score}%</div>
                    </div>
                    <div className="w-24 h-24 rounded-full border-8 border-blue-500 border-t-transparent animate-[spin_3s_linear_infinite]"></div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                      <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                        <span>✨</span> 強みと適合ポイント
                      </h4>
                      <ul className="space-y-3">
                        {company.matchingAnalysis.reasons.map((r, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-green-500">•</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                      <h4 className="font-bold text-orange-700 dark:text-orange-400 mb-4 flex items-center gap-2">
                        <span>⚠️</span> 不足スキル・懸念点
                      </h4>
                      <ul className="space-y-3">
                        {company.matchingAnalysis.gaps.map((g, i) => (
                          <li key={i} className="text-sm flex gap-2">
                            <span className="text-orange-500">•</span> {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900 rounded-3xl">
                  <p className="text-zinc-500 font-medium">企業情報を入力して分析を開始してください</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'strategy' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               {!company.customDocuments ? (
                 <div className="bg-zinc-50 dark:bg-zinc-900 p-12 rounded-3xl text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-bold mb-2">個別対策ドキュメント</h3>
                    <p className="text-zinc-500 mb-6 max-w-md mx-auto">
                      あなたの経歴とこの企業の情報を掛け合わせ、最適な自己PRや逆質問をAIが作成します。
                    </p>
                    <button 
                      onClick={handleGenerateStrategy}
                      disabled={isAnalyzing || !company.jobDescription}
                      className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-80 transition-opacity disabled:opacity-50"
                    >
                      {isAnalyzing ? "生成中..." : "AIで対策案を作成する"}
                    </button>
                 </div>
               ) : (
                 <div className="space-y-6">
                   <div className="grid grid-cols-1 gap-6">
                     <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                       <h4 className="text-sm font-bold text-zinc-400 mb-6 uppercase tracking-widest">✨ この企業向けの自己PR案</h4>
                       <div className="text-lg leading-relaxed whitespace-pre-wrap font-medium">
                         {company.customDocuments.selfPR}
                       </div>
                     </div>

                     <div className="bg-zinc-50 dark:bg-zinc-950 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                       <h4 className="text-sm font-bold text-zinc-400 mb-6 uppercase tracking-widest">🎤 想定される質問と回答 (QA)</h4>
                       <div className="whitespace-pre-wrap text-base text-zinc-700 dark:text-zinc-300">
                         {company.customDocuments.interviewQA}
                       </div>
                     </div>

                     <div className="bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/20">
                       <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-6 uppercase tracking-widest">🙋‍♂️ こちらからするべき質問 (逆質問)</h4>
                       <div className="whitespace-pre-wrap text-base font-semibold text-blue-900 dark:text-blue-200">
                         {company.customDocuments.reverseQuestions}
                       </div>
                     </div>
                   </div>

                   <button 
                     onClick={handleGenerateStrategy}
                     className="w-full py-4 text-zinc-500 text-sm hover:text-black transition-colors"
                   >
                     内容を再生成する
                   </button>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
